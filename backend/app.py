from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
from azure.storage.blob import BlobServiceClient
import firebase_admin
from firebase_admin import credentials, firestore
from websocket_handler import init_websocket
from notes_routes import notes_bp
from datetime import datetime, timedelta
import statistics
from collections import defaultdict

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Load environment variables
load_dotenv()

# Initialize WebSocket
init_websocket(app)

# Register blueprints
app.register_blueprint(notes_bp)

# Initialize Firebase
cred = credentials.Certificate('firebase-key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize notes routes with Firestore client
notes_bp.init_db(db)

# Initialize Azure Blob Storage
blob_service_client = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING'))
container_name = "resumes"

# Initialize Gemini
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    print("WARNING: GOOGLE_API_KEY not found in environment variables!")
    api_key = 'AIzaSyCnXnv9KhmAtSGyViVgWP9cQPSneRMOq3Y'  # Fallback key for testing

print(f"\n=== Initializing Gemini API ===")
print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")
genai.configure(api_key=api_key)

print("Creating Gemini model instance...")
model = genai.GenerativeModel('models/gemini-1.5-flash-8b')
print("Gemini model instance created successfully")

@app.route('/api/job', methods=['POST'])
def create_job():
    try:
        job_data = request.json
        doc_ref = db.collection('jobs').document()
        doc_ref.set(job_data)
        return jsonify({"id": doc_ref.id, "message": "Job created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    try:
        doc_ref = db.collection('jobs').document(job_id)
        doc = doc_ref.get()
        if doc.exists:
            return jsonify(doc.to_dict()), 200
        return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        jobs_ref = db.collection('jobs').stream()
        jobs = []
        for doc in jobs_ref:
            job = doc.to_dict()
            job['id'] = doc.id  # Include the document ID
            jobs.append(job)
        return jsonify(jobs), 200
    except Exception as e:
        print(f"Error fetching jobs: {str(e)}")  # Debug logging
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/upload', methods=['POST'])
def upload_resume():
    try:
        print("\n=== Starting Resume Upload Process ===")
        if 'file' not in request.files:
            print("Error: No file in request")
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        job_id = request.form.get('job_id')
        print(f"File received: {file.filename}")
        print(f"Job ID: {job_id}")
        
        if not job_id:
            print("Error: No job_id in request")
            return jsonify({"error": "No job_id provided"}), 400

        # Read the file content first
        file_content = file.read()
        
        # Check if it's a PDF file and extract text accordingly
        if file.filename.lower().endswith('.pdf'):
            try:
                import PyPDF2
                import io
                
                # Create a PDF reader object
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                
                # Extract text from all pages
                resume_text = ""
                for page in pdf_reader.pages:
                    resume_text += page.extract_text() + "\n"
                
                print("\n=== PDF Text Extraction Successful ===")
                print(f"Extracted {len(resume_text)} characters from PDF")
                
            except Exception as pdf_error:
                print(f"PDF extraction failed: {str(pdf_error)}")
                print("Falling back to UTF-8 decode (may not work properly)")
                resume_text = file_content.decode('utf-8', errors='ignore')
        else:
            # For non-PDF files, decode as UTF-8
            resume_text = file_content.decode('utf-8', errors='ignore')
        
        print("\n=== Resume Content ===")
        print("Full content of the uploaded document:")
        print("-" * 80)
        print(resume_text)
        print("-" * 80)
        print(f"\nTotal length: {len(resume_text)} characters")
        print("\n=== Starting Name Extraction ===")
        
        # Extract profile information
        profile_prompt = f"""
            You are a precise resume parser. Extract the candidate's basic profile information.

            TASK:
            Analyze the resume and extract the following information in a clean JSON format:
            1. Full Name (required)
            2. Email Address (if available)
            3. Phone Number (if available)

            EXTRACTION RULES:

            For Full Name:
            - Look at the header/top section first
            - Must be 2-3 words
            - Use proper capitalization (e.g., "John Smith")
            - Remove titles (Dr., Mr., etc.) and degrees (PhD, MBA)
            - If no valid name found, use "Unknown Candidate"

            For Email:
            - Must be a valid email format (contains @ and domain)
            - Prefer professional/personal email over university/company emails
            - If multiple found, select the primary/most professional one
            - If none found, return null

            For Phone:
            - Accept various formats (e.g., +1-123-456-7890, (123) 456-7890)
            - Remove any extra text (e.g., "Cell:", "Phone:", etc.)
            - Keep country code if present
            - If multiple found, select the primary/most complete one
            - If none found, return null

            RESPONSE FORMAT:
            Return ONLY a JSON object with this exact structure:
            {{
                "name": "string",
                "email": "string or null",
                "phone": "string or null"
            }}

            Resume Content:
            {resume_text}
            """

        try:
            print("\nCalling Gemini for profile extraction...")
            profile_response = model.generate_content(profile_prompt)
            profile_text = profile_response.text.strip()
            print(f"Raw profile response: {profile_text}")

            try:
                # Parse the JSON response (handle markdown code blocks)
                import json
                import re
                
                # Remove markdown code block formatting if present
                cleaned_text = profile_text.strip()
                if cleaned_text.startswith('```json'):
                    # Extract JSON from markdown code block
                    json_match = re.search(r'```json\s*(\{.*?\})\s*```', cleaned_text, re.DOTALL)
                    if json_match:
                        cleaned_text = json_match.group(1)
                elif cleaned_text.startswith('```'):
                    # Remove any generic code block formatting
                    cleaned_text = re.sub(r'^```.*?\n', '', cleaned_text)
                    cleaned_text = re.sub(r'\n```$', '', cleaned_text)
                
                print(f"Cleaned JSON text: {cleaned_text}")
                
                profile_data = json.loads(cleaned_text)
                
                # Validate required fields
                if not isinstance(profile_data, dict):
                    raise ValueError("Response is not a valid JSON object")
                
                # Extract and validate name
                candidate_name = profile_data.get('name', '').strip()
                if not candidate_name or candidate_name.lower() == 'null':
                    candidate_name = 'Unknown Candidate'
                
                # Extract contact information
                email = profile_data.get('email')
                phone = profile_data.get('phone')
                
                # Handle null values properly
                if email and email.lower() == 'null':
                    email = None
                if phone and phone.lower() == 'null':
                    phone = None
                
                print(f"Extracted Profile:")
                print(f"Name: {candidate_name}")
                print(f"Email: {email if email else 'Not found'}")
                print(f"Phone: {phone if phone else 'Not found'}")
                
                # Store all profile information
                profile_data = {
                    'name': candidate_name,
                    'name_source': 'resume_parser',
                    'email': email,
                    'phone': phone
                }
                
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Error parsing profile response: {str(e)}")
                candidate_name = 'Unknown Candidate'
                profile_data = {
                    'name': candidate_name,
                    'name_source': 'parse_error'
                }
        except Exception as extract_error:
            print(f"Error in profile extraction: {str(extract_error)}")
            candidate_name = 'Unknown Candidate'
            profile_data = {
                'name': candidate_name,
                'name_source': 'extraction_error'
            }

        # Create the candidate document first
        candidate_ref = db.collection('candidates').document()

        # Upload to Azure Blob Storage
        blob_path = f"{job_id}/{candidate_ref.id}_{file.filename}"  # Include candidate ID in blob path
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=blob_path
        )
        blob_client.upload_blob(file_content)

        # Store metadata in Firebase with the extracted profile
        candidate_ref.set({
            'job_id': job_id,
            'name': candidate_name,
            'email': profile_data.get('email'),
            'phone': profile_data.get('phone'),
            'resume_blob_path': blob_path,
            'upload_date': firestore.SERVER_TIMESTAMP,
            'status': 'Processing',
            'name_source': profile_data.get('name_source', 'unknown')
        })

        # Get job data for evaluation
        print(f"Fetching job data for job_id: {job_id}")
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            print(f"Job {job_id} not found in database")
            return jsonify({"error": "Job not found"}), 404
        
        job_data = job_doc.to_dict()
        print("Successfully retrieved job data")
        
        # Do evaluation synchronously
        try:
            print("\n=== Starting Name Extraction ===")
            print(f"Candidate ID: {candidate_ref.id}")
            print(f"Job ID: {job_id}")
            
            # Use the already extracted resume text for evaluation
            print("\n=== Starting Evaluation with Resume Content ===")
            print(f"Resume Content Length: {len(resume_text)} chars")

            # Start evaluation prompt
            print("\n=== Preparing Evaluation Prompt ===")
            prompt = f"""
            You are a precise resume parser. Extract the candidate's basic profile information.

            TASK:
            Analyze the resume and extract the following information in a clean JSON format:
            1. Full Name (required)
            2. Email Address (if available)
            3. Phone Number (if available)

            EXTRACTION RULES:

            For Full Name:
            - Look at the header/top section first
            - Must be 2-3 words
            - Use proper capitalization (e.g., "John Smith")
            - Remove titles (Dr., Mr., etc.) and degrees (PhD, MBA)
            - If no valid name found, use "Unknown Candidate"

            For Email:
            - Must be a valid email format (contains @ and domain)
            - Prefer professional/personal email over university/company emails
            - If multiple found, select the primary/most professional one
            - If none found, return null

            For Phone:
            - Accept various formats (e.g., +1-123-456-7890, (123) 456-7890)
            - Remove any extra text (e.g., "Cell:", "Phone:", etc.)
            - Keep country code if present
            - If multiple found, select the primary/most complete one
            - If none found, return null

            RESPONSE FORMAT:
            Return ONLY a JSON object with this exact structure:
            {{
                "name": "string",
                "email": "string or null",
                "phone": "string or null"
            }}

            Resume Content:
            {resume_text}
            """
            
            # Profile extraction already done, proceed with evaluation

            print("\n=== Starting Full Evaluation Process ===")
            print("Preparing evaluation request...")
            
            print("\n=== Preparing Gemini Evaluation ===")
            print(f"Job Description Length: {len(job_data['description'])} chars")
            print(f"Required Skills Length: {len(job_data['required_skills'])} chars")
            print(f"Resume Content Length: {len(resume_text)} chars")
            
            # Create evaluation prompt
            prompt = f"""
            Job Description:
            {job_data['description']}
            
            Required Skills:
            {job_data['required_skills']}
            
            Resume Content:
            {resume_text}
            
            Please evaluate this candidate's resume against the job description and provide your evaluation in the following format:

            ---SUMMARY START---
            Match Score: [0-100]
            Quick Assessment: [One clear sentence on overall fit]

            Key Points:
            - Skills Match: [Top 3-4 key skills]
            - Strongest Asset: [Most impressive qualification/experience]
            - Growth Area: [Primary development need]
            ---SUMMARY END---

            ---DETAILED EVALUATION START---
            1. Match Score Rationale
            - Detailed explanation of the match score
            - Key factors that influenced the rating
            - Potential impact on the role

            2. Skills & Qualifications
            - Direct matches with required skills
            - Additional relevant capabilities
            - Technical proficiencies and certifications
            - Quantified achievements where available

            3. Experience Alignment
            - Relevant role experience
            - Project scope and scale
            - Leadership and management history
            - Industry expertise

            4. Strengths & Value Add
            - Top 3 strengths for this position
            - Supporting examples from experience
            - Expected contributions to the role
            - Unique differentiators

            5. Development Areas
            - Areas needing growth (2-3 specific points)
            - Impact on role performance
            - Suggested development paths
            - Mitigating factors or existing foundations
            """

            try:
                print("\n=== Calling Gemini API ===")
                print("Sending prompt to Gemini...")
                response = model.generate_content(prompt)
                
                print("Received response from Gemini")
                print(f"Response type: {type(response)}")
                
                if not hasattr(response, 'text'):
                    print(f"Unexpected response format: {response}")
                    raise Exception("Invalid response format from Gemini")
                    
                evaluation = response.text
                print(f"Evaluation length: {len(evaluation)} chars")
                print("First 200 chars of evaluation:", evaluation[:200])
                print("Successfully processed Gemini response")
            except Exception as gemini_error:
                print(f"\n=== Gemini API Error ===")
                print(f"Error type: {type(gemini_error)}")
                print(f"Error message: {str(gemini_error)}")
                if hasattr(gemini_error, 'response'):
                    print(f"API Response: {gemini_error.response}")
                raise

            print("Processing evaluation response...")
            print("\n=== Processing Evaluation Response ===")
            # Split evaluation into summary and detail sections
            summary = ''
            detail = ''
            
            # Try to extract summary section
            print("Extracting summary section...")
            has_summary_markers = '---SUMMARY START---' in evaluation and '---SUMMARY END---' in evaluation
            print(f"Has summary markers: {has_summary_markers}")
            
            if has_summary_markers:
                summary = evaluation.split('---SUMMARY START---')[1].split('---SUMMARY END---')[0].strip()
                print("Successfully extracted summary section")
            else:
                print("No summary markers found, using full text as summary")
                summary = evaluation
                
            # Try to extract detailed section
            print("\nExtracting detailed section...")
            has_detail_marker = '---DETAILED EVALUATION START---' in evaluation
            print(f"Has detail marker: {has_detail_marker}")
            
            if has_detail_marker:
                detail = evaluation.split('---DETAILED EVALUATION START---')[1].strip()
                print("Successfully extracted detailed section")
            else:
                print("No detail marker found, using full text as detail")
                detail = evaluation
                
            print(f"\nFinal extracted lengths:")
            print(f"Summary length: {len(summary)} chars")
            print(f"Detail length: {len(detail)} chars")
                
            # Extract match score from summary
            print("\n=== Extracting Match Score ===")
            match_score = 0
            try:
                # Look for "Match Score: [number]" in the summary
                import re
                match = re.search(r'Match Score:\s*(\d+)', summary)
                if match:
                    match_score = int(match.group(1))
                    print(f"Found match score: {match_score}")
                else:
                    print("No match score found in summary")
            except Exception as score_error:
                print(f"Error extracting match score: {str(score_error)}")

            print("\n=== Storing Evaluation Results ===")
            print("Creating evaluation document in Firestore...")
            # Store evaluation results
            eval_ref = db.collection('evaluations').document()
            evaluation_data = {
                'job_id': job_id,
                'candidate_id': candidate_ref.id,
                'summary': summary,
                'detail': detail,
                'raw_evaluation': evaluation,
                'cv_match_score': match_score,  # Add match score to evaluation
                'timestamp': firestore.SERVER_TIMESTAMP
            }
            eval_ref.set(evaluation_data)
            print(f"Evaluation stored with ID: {eval_ref.id}")
            
            print("\n=== Updating Candidate Document ===")
            print(f"Updating candidate {candidate_ref.id} with evaluation_id {eval_ref.id}")
            try:
                # Update candidate with evaluation ID and match score
                candidate_ref.update({
                    'status': 'Evaluated',
                    'evaluation_id': eval_ref.id,
                    'cv_match_score': match_score  # Add match score to candidate
                })
                print("Successfully updated candidate document")
            except Exception as update_error:
                print(f"Error updating candidate document: {str(update_error)}")
                raise

            # Already moved this code block to be right after storing evaluation
            
        except Exception as eval_error:
            error_msg = f"Evaluation error: {str(eval_error)}"
            print("\n=== Evaluation Error ===")
            print(error_msg)
            print(f"Stack trace: {eval_error.__traceback__}")
            
            print(f"Updating candidate {candidate_ref.id} to reflect error")
            # Update candidate status to reflect error
            try:
                candidate_ref.update({
                    'status': 'Evaluation Failed',
                    'evaluation_error': str(eval_error)
                })
                print("Successfully updated candidate status to reflect error")
            except Exception as update_error:
                print(f"Error updating candidate status: {str(update_error)}")

        # Return the candidate ID and evaluation ID
        return jsonify({
            "message": "Resume uploaded and evaluated successfully",
            "id": candidate_ref.id,
            "evaluation_id": eval_ref.id if 'eval_ref' in locals() else None,
            "status": "Evaluated" if 'eval_ref' in locals() else "Evaluation Failed"
        }), 201

    except Exception as e:
        print(f"\n=== Upload/Evaluation Error ===\nError: {str(e)}")
        # Make sure to update candidate status if we have a reference
        if 'candidate_ref' in locals():
            try:
                candidate_ref.update({
                    'status': 'Failed',
                    'error': str(e)
                })
            except Exception as update_error:
                print(f"Error updating candidate status: {str(update_error)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/evaluate/<job_id>/<resume_id>', methods=['GET', 'POST'])
def evaluate_resume(job_id, resume_id):
    try:
        print(f"=== Evaluation Request ===")
        print(f"Method: {request.method}")
        print(f"Job ID: {job_id}")
        print(f"Resume ID: {resume_id}")
        
        # For GET request, try to fetch existing evaluation
        if request.method == 'GET':
            print("Fetching candidate document...")
            # First get the candidate to find their evaluation_id
            candidate_doc = db.collection('candidates').document(resume_id).get()
            print(f"Candidate exists: {candidate_doc.exists}")
            if not candidate_doc.exists:
                print(f"Candidate {resume_id} not found in database")
                return jsonify({"error": "Candidate not found"}), 404
            
            candidate_data = candidate_doc.to_dict()
            print(f"Candidate data: {candidate_data}")
            
            if 'evaluation_id' not in candidate_data:
                print("No evaluation_id found in candidate data")
                return jsonify({"error": "No evaluation exists for this candidate"}), 404
            
            print(f"Found evaluation_id: {candidate_data['evaluation_id']}")
            # Get the evaluation
            eval_doc = db.collection('evaluations').document(candidate_data['evaluation_id']).get()
            print(f"Evaluation exists: {eval_doc.exists}")
            if not eval_doc.exists:
                print(f"Evaluation {candidate_data['evaluation_id']} not found in database")
                return jsonify({"error": "Evaluation not found"}), 404
                
            evaluation_data = eval_doc.to_dict()
            return jsonify({
                "summary": evaluation_data.get('summary', ''),
                "detail": evaluation_data.get('detail', evaluation_data.get('evaluation', ''))
            }), 200
        
        # For POST request, create new evaluation
        # Get job description
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404

        # Get candidate
        candidate_doc = db.collection('candidates').document(resume_id).get()
        if not candidate_doc.exists:
            return jsonify({"error": "Candidate not found"}), 404

        job_data = job_doc.to_dict()
        candidate_data = candidate_doc.to_dict()

        # Download resume from Azure Blob
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=candidate_data['resume_blob_path']
        )
        resume_content = blob_client.download_blob().readall()

        # Use Gemini to evaluate
        prompt = f"""
        Job Description:
        {job_data['description']}
        
        Required Skills:
        {job_data['required_skills']}
        
        Resume Content:
        {resume_content}
        
        Please evaluate this candidate's resume against the job description and provide:
        1. Match Score (0-100)
        2. Key Skills Match
        3. Experience Relevance
        4. Areas of Strength
        5. Areas for Improvement
        """

        response = model.generate_content(prompt)
        evaluation = response.text

        # Split evaluation into summary and detail sections
        summary = ''
        detail = ''
        
        # Try to extract summary section
        if '---SUMMARY START---' in evaluation and '---SUMMARY END---' in evaluation:
            summary = evaluation.split('---SUMMARY START---')[1].split('---SUMMARY END---')[0].strip()
        else:
            summary = evaluation  # If no markers found, use entire text as summary
            
        # Try to extract detailed section
        if '---DETAILED EVALUATION START---' in evaluation:
            detail = evaluation.split('---DETAILED EVALUATION START---')[1].strip()
        else:
            detail = evaluation  # If no marker found, use entire text as detail
            
        # Store evaluation results
        eval_ref = db.collection('evaluations').document()
        evaluation_data = {
            'job_id': job_id,
            'candidate_id': resume_id,
            'summary': summary,
            'detail': detail,
            'raw_evaluation': evaluation,  # Store original for reference
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        eval_ref.set(evaluation_data)

        # Update candidate status and link to evaluation
        db.collection('candidates').document(resume_id).update({
            'status': 'Evaluated',
            'evaluation_id': eval_ref.id
        })

        return jsonify({
            "evaluation_id": eval_ref.id,
            "evaluation": evaluation
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """Get all candidates or filter by job_id if provided"""
    try:
        job_id = request.args.get('job_id')
        print(f"Fetching candidates for job_id: {job_id}")  # Debug log
        
        if job_id:
            # Get candidates for specific job
            candidates_ref = db.collection('candidates').where('job_id', '==', job_id).stream()
        else:
            # Get all candidates
            candidates_ref = db.collection('candidates').stream()
        
        candidates = []
        for doc in candidates_ref:
            candidate = doc.to_dict()
            candidate['id'] = doc.id
            candidates.append(candidate)
        
        print(f"Found {len(candidates)} candidates")  # Debug log
        return jsonify(candidates), 200
    except Exception as e:
        error_msg = f"Error fetching candidates: {str(e)}"
        print(error_msg)  # Debug log
        return jsonify({
            "error": error_msg,
            "job_id": job_id if 'job_id' in locals() else None
        }), 500

@app.route('/api/candidates/<candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    """Get detailed information for a specific candidate"""
    try:
        doc_ref = db.collection('candidates').document(candidate_id)
        doc = doc_ref.get()
        if doc.exists:
            candidate = doc.to_dict()
            candidate['id'] = doc.id
            
            # If candidate has been evaluated, get the evaluation
            if 'evaluation_id' in candidate:
                eval_doc = db.collection('evaluations').document(candidate['evaluation_id']).get()
                if eval_doc.exists:
                    candidate['evaluation'] = eval_doc.to_dict()
            
            return jsonify(candidate), 200
            
        return jsonify({"error": "Candidate not found"}), 404
    except Exception as e:
        print(f"Error fetching candidate: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>/candidates', methods=['GET'])
def get_candidates_for_job(job_id):
    """Get all candidates for a specific job"""
    try:
        candidates_ref = db.collection('candidates').where('job_id', '==', job_id).stream()
        candidates = []
        for doc in candidates_ref:
            candidate = doc.to_dict()
            candidate['id'] = doc.id
            candidates.append(candidate)
        return jsonify(candidates), 200
    except Exception as e:
        print(f"Error fetching candidates: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/<candidate_id>/name', methods=['PUT'])
def update_candidate_name(candidate_id):
    """Update candidate name manually"""
    try:
        name_data = request.json
        if not name_data or 'name' not in name_data:
            return jsonify({"error": "Name is required"}), 400

        candidate_name = name_data['name']
        
        # Update candidate name
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_ref.update({
            'name': candidate_name,
            'name_source': 'manual'
        })
        
        return jsonify({
            "message": "Name updated successfully",
            "id": candidate_id
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/<path:blob_path>', methods=['GET'])
def get_resume(blob_path):
    """Stream the resume file for preview"""
    try:
        # Get the blob
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=blob_path
        )
        
        # Download the blob content
        content = blob_client.download_blob().readall()
        
        # Determine if it's a PDF (you might want to store/check content type in metadata)
        is_pdf = blob_path.lower().endswith('.pdf')
        
        # Set appropriate headers
        headers = {
            'Content-Type': 'application/pdf' if is_pdf else 'text/plain',
            'Content-Disposition': f'inline; filename="{blob_path.split("/")[-1]}"'
        }
        
        return content, 200, headers
    except Exception as e:
        print(f"Error retrieving resume: {str(e)}")
        return jsonify({"error": "Failed to retrieve resume"}), 500

@app.route('/api/clear-database', methods=['POST'])
def clear_database():
    """Clear all records from Firestore database. This is a dangerous operation."""
    try:
        # Get confirmation header
        confirmation = request.headers.get('Confirmation')
        if confirmation != 'CONFIRM_CLEAR_DATABASE':
            return jsonify({
                "error": "Missing or invalid confirmation header. Add 'Confirmation: CONFIRM_CLEAR_DATABASE' header to proceed."
            }), 400

        # Collections to clear
        collections = ['candidates', 'jobs', 'evaluations']
        deleted_counts = {}

        for collection_name in collections:
            # Get all documents in the collection
            docs = db.collection(collection_name).stream()
            count = 0
            
            # Delete each document
            for doc in docs:
                # If it's a candidate, delete their notes subcollection first
                if collection_name == 'candidates':
                    notes_ref = db.collection('candidates').document(doc.id).collection('notes')
                    notes = notes_ref.stream()
                    for note in notes:
                        note.reference.delete()
                
                # Delete the main document
                doc.reference.delete()
                count += 1
            
            deleted_counts[collection_name] = count
            print(f"Deleted {count} documents from {collection_name}")

        return jsonify({
            "message": "Database cleared successfully",
            "deleted_counts": deleted_counts
        }), 200

    except Exception as e:
        print(f"Error clearing database: {str(e)}")
        return jsonify({"error": str(e)}), 500

# === ENHANCED JOB MANAGEMENT APIs ===

@app.route('/api/jobs/<job_id>', methods=['PUT'])
def update_job(job_id):
    """Update job details"""
    try:
        print(f"=== Updating Job {job_id} ===")
        job_data = request.json
        
        # Validate job exists
        job_ref = db.collection('jobs').document(job_id)
        if not job_ref.get().exists:
            return jsonify({"error": "Job not found"}), 404
        
        # Update with timestamp
        job_data['lastModified'] = firestore.SERVER_TIMESTAMP
        job_ref.update(job_data)
        
        return jsonify({"message": "Job updated successfully"}), 200
    except Exception as e:
        print(f"Error updating job: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Delete job and associated candidates"""
    try:
        print(f"=== Deleting Job {job_id} ===")
        
        # Check if job has candidates
        candidates = db.collection('candidates').where('job_id', '==', job_id).stream()
        candidate_count = len(list(candidates))
        
        if candidate_count > 0:
            return jsonify({
                "error": f"Cannot delete job with {candidate_count} candidates. Move or delete candidates first."
            }), 400
        
        # Delete job
        db.collection('jobs').document(job_id).delete()
        return jsonify({"message": "Job deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting job: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>/archive', methods=['POST'])
def archive_job(job_id):
    """Archive job (soft delete)"""
    try:
        job_ref = db.collection('jobs').document(job_id)
        job_ref.update({
            'status': 'archived',
            'archivedDate': firestore.SERVER_TIMESTAMP
        })
        return jsonify({"message": "Job archived successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === ENHANCED CANDIDATE MANAGEMENT APIs ===

@app.route('/api/candidates/<candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    """Update candidate information"""
    try:
        print(f"=== Updating Candidate {candidate_id} ===")
        candidate_data = request.json
        
        candidate_ref = db.collection('candidates').document(candidate_id)
        if not candidate_ref.get().exists:
            return jsonify({"error": "Candidate not found"}), 404
        
        # Add update timestamp
        candidate_data['lastModified'] = firestore.SERVER_TIMESTAMP
        candidate_ref.update(candidate_data)
        
        return jsonify({"message": "Candidate updated successfully"}), 200
    except Exception as e:
        print(f"Error updating candidate: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/<candidate_id>/stage', methods=['PUT'])
def update_candidate_stage(candidate_id):
    """Update candidate stage in hiring pipeline"""
    try:
        stage_data = request.json
        stage = stage_data.get('stage')
        
        if not stage:
            return jsonify({"error": "Stage is required"}), 400
        
        # Validate stage
        valid_stages = ['NEW', 'SCREENING', 'INTERVIEW_1', 'INTERVIEW_2', 'FINAL_INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']
        if stage not in valid_stages:
            return jsonify({"error": f"Invalid stage. Must be one of: {valid_stages}"}), 400
        
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_ref.update({
            'stage': stage,
            'stageUpdated': firestore.SERVER_TIMESTAMP,
            'stageHistory': firestore.ArrayUnion([{
                'stage': stage,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'updatedBy': stage_data.get('updatedBy', 'System')
            }])
        })
        
        return jsonify({"message": "Candidate stage updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/<candidate_id>/rating', methods=['PUT'])
def update_candidate_rating(candidate_id):
    """Update hiring manager rating for candidate"""
    try:
        rating_data = request.json
        rating = rating_data.get('rating')
        
        if rating is None or not (0 <= rating <= 5):
            return jsonify({"error": "Rating must be between 0 and 5"}), 400
        
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_ref.update({
            'managerRating': rating,
            'ratingUpdated': firestore.SERVER_TIMESTAMP,
            'ratedBy': rating_data.get('ratedBy', 'Unknown')
        })
        
        return jsonify({"message": "Candidate rating updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === ANALYTICS & METRICS APIs ===

@app.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_analytics():
    """Get dashboard analytics and metrics"""
    try:
        print("=== Generating Dashboard Analytics ===")
        
        # Get all jobs and candidates
        jobs = list(db.collection('jobs').stream())
        candidates = list(db.collection('candidates').stream())
        
        # Basic metrics
        total_jobs = len(jobs)
        total_candidates = len(candidates)
        
        # Stage distribution
        stage_counts = defaultdict(int)
        for candidate in candidates:
            data = candidate.to_dict()
            stage = data.get('stage', 'NEW')
            stage_counts[stage] += 1
        
        # CV match score distribution
        match_scores = []
        for candidate in candidates:
            data = candidate.to_dict()
            if 'cv_match_score' in data and data['cv_match_score'] is not None:
                match_scores.append(data['cv_match_score'])
        
        avg_match_score = statistics.mean(match_scores) if match_scores else 0
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_candidates = 0
        for candidate in candidates:
            data = candidate.to_dict()
            upload_date = data.get('upload_date')
            if upload_date:
                try:
                    # Handle Firestore timestamp objects
                    if hasattr(upload_date, 'timestamp'):
                        upload_time = datetime.fromtimestamp(upload_date.timestamp())
                    elif hasattr(upload_date, 'seconds'):
                        upload_time = datetime.fromtimestamp(upload_date.seconds)
                    else:
                        # Skip if we can't parse the date
                        continue
                    
                    if upload_time > seven_days_ago:
                        recent_candidates += 1
                except Exception as date_error:
                    print(f"Error parsing upload date: {date_error}")
                    continue
        
        # Job performance metrics
        job_metrics = []
        for job in jobs:
            job_data = job.to_dict()
            job_candidates = [c for c in candidates if c.to_dict().get('job_id') == job.id]
            
            job_metrics.append({
                'id': job.id,
                'title': job_data.get('title', 'Unknown'),
                'candidateCount': len(job_candidates),
                'avgMatchScore': statistics.mean([
                    c.to_dict().get('cv_match_score', 0) 
                    for c in job_candidates 
                    if c.to_dict().get('cv_match_score')
                ]) if job_candidates else 0
            })
        
        analytics = {
            'overview': {
                'totalJobs': total_jobs,
                'totalCandidates': total_candidates,
                'averageMatchScore': round(avg_match_score, 1),
                'recentCandidates': recent_candidates
            },
            'stageDistribution': dict(stage_counts),
            'jobMetrics': job_metrics,
            'trends': {
                'matchScoreDistribution': {
                    'excellent': len([s for s in match_scores if s >= 80]),
                    'good': len([s for s in match_scores if 60 <= s < 80]),
                    'fair': len([s for s in match_scores if 40 <= s < 60]),
                    'poor': len([s for s in match_scores if s < 40])
                }
            }
        }
        
        return jsonify(analytics), 200
    except Exception as e:
        print(f"Error generating analytics: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>/analytics', methods=['GET'])
def get_job_analytics(job_id):
    """Get detailed analytics for a specific job"""
    try:
        print(f"=== Generating Analytics for Job {job_id} ===")
        
        # Get job details
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404
        
        job_data = job_doc.to_dict()
        
        # Get all candidates for this job
        candidates = list(db.collection('candidates').where('job_id', '==', job_id).stream())
        
        # Calculate metrics
        total_candidates = len(candidates)
        stage_distribution = defaultdict(int)
        match_scores = []
        
        for candidate in candidates:
            data = candidate.to_dict()
            stage = data.get('stage', 'NEW')
            stage_distribution[stage] += 1
            
            if 'cv_match_score' in data and data['cv_match_score'] is not None:
                match_scores.append(data['cv_match_score'])
        
        analytics = {
            'jobDetails': {
                'id': job_id,
                'title': job_data.get('title'),
                'description': job_data.get('description'),
                'requiredSkills': job_data.get('required_skills', [])
            },
            'candidateMetrics': {
                'total': total_candidates,
                'averageMatchScore': round(statistics.mean(match_scores), 1) if match_scores else 0,
                'stageDistribution': dict(stage_distribution)
            },
            'topCandidates': [
                {
                    'id': c.id,
                    'name': c.to_dict().get('name'),
                    'matchScore': c.to_dict().get('cv_match_score', 0),
                    'stage': c.to_dict().get('stage', 'NEW')
                }
                for c in sorted(candidates, 
                    key=lambda x: x.to_dict().get('cv_match_score', 0), 
                    reverse=True)[:5]
            ]
        }
        
        return jsonify(analytics), 200
    except Exception as e:
        print(f"Error generating job analytics: {str(e)}")
        return jsonify({"error": str(e)}), 500

# === BULK OPERATIONS APIs ===

@app.route('/api/candidates/bulk-update', methods=['POST'])
def bulk_update_candidates():
    """Bulk update multiple candidates"""
    try:
        update_data = request.json
        candidate_ids = update_data.get('candidateIds', [])
        updates = update_data.get('updates', {})
        
        if not candidate_ids or not updates:
            return jsonify({"error": "candidateIds and updates are required"}), 400
        
        # Add timestamp to updates
        updates['lastModified'] = firestore.SERVER_TIMESTAMP
        
        # Update candidates in batch
        batch = db.batch()
        for candidate_id in candidate_ids:
            candidate_ref = db.collection('candidates').document(candidate_id)
            batch.update(candidate_ref, updates)
        
        batch.commit()
        
        return jsonify({
            "message": f"Successfully updated {len(candidate_ids)} candidates"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === SEARCH & FILTERING APIs ===

@app.route('/api/candidates/search', methods=['POST'])
def search_candidates():
    """Advanced candidate search with filters"""
    try:
        search_params = request.json
        
        # Start with base query
        candidates_ref = db.collection('candidates')
        
        # Apply filters
        if 'jobId' in search_params and search_params['jobId']:
            candidates_ref = candidates_ref.where('job_id', '==', search_params['jobId'])
        
        if 'stage' in search_params and search_params['stage']:
            candidates_ref = candidates_ref.where('stage', '==', search_params['stage'])
        
        if 'minMatchScore' in search_params:
            candidates_ref = candidates_ref.where('cv_match_score', '>=', search_params['minMatchScore'])
        
        # Execute query
        candidates = list(candidates_ref.stream())
        
        # Format results
        results = []
        for candidate in candidates:
            data = candidate.to_dict()
            data['id'] = candidate.id
            
            # Apply text search if provided
            if 'searchText' in search_params and search_params['searchText']:
                search_text = search_params['searchText'].lower()
                name = data.get('name', '').lower()
                email = data.get('email', '').lower()
                
                if search_text not in name and search_text not in email:
                    continue
            
            results.append(data)
        
        return jsonify({'candidates': results, 'count': len(results)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    try:
        print("\n=== Starting Flask Server ===")
        print("Debug mode: ON")
        print("Port: 5000")
        print("CORS: Enabled for http://localhost:3000")
        app.run(debug=True, port=5000)
    except Exception as e:
        print(f"\nERROR: Failed to start server: {str(e)}")
        print("Please make sure:")
        print("1. Port 5000 is not in use")
        print("2. All required packages are installed")
        print("3. Firebase credentials are properly configured")