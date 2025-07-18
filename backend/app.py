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
        resume_text = file_content.decode('utf-8', errors='ignore')
        print("\n=== Starting Name Extraction ===")
        
        # First print the start of the resume for debugging
        print("\nFirst 200 characters of resume:")
        print(resume_text[:200])
        
        # Extract candidate name first
        name_prompt = f"""
            You are a resume parser specialized in name extraction.
            
            CRITICAL INSTRUCTION:
            Look ONLY at the FIRST LINE of the resume. Ignore everything else.
            
            EXAMPLES OF VALID FIRST LINES:
            ✓ "John Smith"
            ✓ "Jane Marie Wilson"
            ✓ "ROBERT JONES"
            
            EXAMPLES OF INVALID FIRST LINES:
            × "Resume of John Smith"
            × "Name: John Smith"
            × "Dr. John Smith, PhD"
            × "Software Engineer"
            × "Contact Information:"
            
            EXTRACTION RULES:
            1. ONLY process the first line of text
            2. It must be a standalone name
            3. No titles (Dr., Mr., etc.)
            4. No degrees (PhD, MBA, etc.)
            5. No job titles
            6. No extra words like "Resume" or "CV"
            
            FORMAT RULES:
            1. Return name in Title Case (e.g., "John Smith")
            2. Only letters and spaces allowed
            3. Must be 2-3 words
            4. Each word must start with a capital letter
            
            SPECIAL INSTRUCTIONS:
            - If the first line isn't a clear standalone name, return NULL
            - Do not look at any other part of the resume
            - Do not look at email addresses
            - Do not explain your answer
            
            RESUME TO PROCESS:
            {resume_text}
            
            The resume content is between the --- markers below:
            ---
            {resume_text}
            ---

            Validation Rules:
            1. Header Name Check:
               - Must be in first 5 lines of resume content
               - Must be standalone (not part of a sentence)
               - Must not be a job title or company name
               - Must look like a personal name format

            2. Cross-Reference Check:
               - If an email contains a name, it should partially match the header name
               - At least one part (first or last name) should match
               - Only use email as verification, not as primary source
               
            3. Name Format Requirements:
               - 2-3 words only
               - Only letters and spaces
               - Each word properly capitalized
               - No titles (Dr., Mr., etc.)
               - No degrees (PhD, MBA, etc.)
               - No job titles or company names

            4. Return NULL if:
               - No clear name in header section
               - Name looks like a company name
               - Name is part of a sentence
               - Name contains job titles or degrees

            Format:
            - Return ONLY the extracted name with proper capitalization
            - No additional text or explanation

            Resume Content:
            {resume_text}
            """

        try:
            print("\nCalling Gemini for name extraction...")
            name_response = model.generate_content(name_prompt)
            candidate_name = name_response.text.strip()
            print(f"Raw extracted name: '{candidate_name}'")

            # Additional debug info about the name
            if candidate_name:
                print(f"\nName analysis:")
                print(f"Length: {len(candidate_name)} chars")
                print(f"Word count: {len(candidate_name.split())} words")
                print(f"Words: {candidate_name.split()}")
                print(f"Characters: {[c for c in candidate_name]}")
            
            # Strict name validation
            is_valid = True
            reason = ""
            
            if not candidate_name or candidate_name.lower() == 'null':
                is_valid = False
                reason = "Name is empty or NULL"
            else:
                words = candidate_name.split()
                # Check word count
                if len(words) < 2 or len(words) > 3:
                    is_valid = False
                    reason = f"Name must be 2-3 words (got {len(words)} words)"
                # Check for invalid characters
                elif not all(c.isalpha() or c.isspace() for c in candidate_name):
                    is_valid = False
                    reason = "Name contains invalid characters (only letters and spaces allowed)"
                # Check capitalization
                elif any(not word.istitle() for word in words):
                    is_valid = False
                    reason = "Each word must be properly capitalized (e.g., 'John Smith')"
                # Check for common titles
                elif any(word.lower() in ['mr', 'mrs', 'ms', 'dr', 'prof'] for word in words):
                    is_valid = False
                    reason = "Name contains titles (Mr., Dr., etc.)"
                # Check for degrees
                elif any(word.lower() in ['phd', 'mba', 'md', 'ba', 'bs', 'msc'] for word in words):
                    is_valid = False
                    reason = "Name contains degrees (PhD, MBA, etc.)"
                # Check word lengths (no single letter words except middle initials)
                elif any(len(word) == 1 and (i == 0 or i == len(words)-1) for i, word in enumerate(words)):
                    is_valid = False
                    reason = "Single letters only allowed as middle initials"
                
            if not is_valid:
                print(f"\nValidation failed: {reason}")
                candidate_name = 'Unknown Candidate'
            
            print(f"Final candidate name: '{candidate_name}'")
        except Exception as name_error:
            print(f"Error extracting name: {str(name_error)}")
            candidate_name = 'Unknown Candidate'

        # Upload to Azure Blob Storage
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=f"{job_id}/{file.filename}"
        )
        blob_client.upload_blob(file_content)

        # Store metadata in Firebase with the extracted name
        candidate_ref = db.collection('candidates').document()
        candidate_ref.set({
            'job_id': job_id,
            'name': candidate_name,
            'resume_blob_path': f"{job_id}/{file.filename}",
            'upload_date': firestore.SERVER_TIMESTAMP,
            'status': 'Processing',
            'name_source': 'resume'
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
            You are a precise name extraction tool. Analyze this resume and extract the candidate's full name.

            Follow these steps in order:
            1. Look at the very top of the resume - most candidates put their name prominently at the start
            2. Check the contact/personal information section for a clearly stated name
            3. Look for a name in standard resume header formats (e.g., "Name: John Smith" or "JOHN SMITH")
            4. Check email addresses but ONLY if it clearly contains a full name (e.g., john.smith@ or johnsmith@)
            5. Look for a signature or closing section that states the name

            Rules for name extraction:
            - Name should contain both first and last name
            - Ignore any letters after email's @ symbol
            - Names should follow standard capitalization (e.g., "John Smith" not "JOHN SMITH" or "john smith")
            - Professional titles (Dr., Mr., Mrs., etc.) should be removed
            - Degrees (PhD, MBA, etc.) should be removed
            - Name should not include roles (e.g., "Software Engineer" or "Senior Developer")

            Format:
            - Return ONLY the full name, with no additional text
            - Use proper capitalization (First Last)
            - If multiple variations are found, choose the most complete version
            - If you can't find a name with high confidence that meets these rules, respond with exactly 'Unknown Candidate'

            Resume Content:
            {resume_text}
            """
            
            try:
                print("Calling Gemini for name extraction...")
                name_response = model.generate_content(name_prompt)
                candidate_name = name_response.text.strip()
                print(f"Raw extracted name: '{candidate_name}'")
                
                # Validate and clean the extracted name
                if not candidate_name or len(candidate_name) > 100 or candidate_name.lower() == 'null':
                    print("No valid name could be extracted from resume")
                    candidate_name = 'Unknown Candidate'
                
                print(f"Final candidate name: '{candidate_name}'")

                # Update candidate name in database
                print("Updating candidate record with extracted name")
                candidate_ref.update({
                    'name': candidate_name,
                    'name_source': 'resume'
                })
                print("Successfully updated candidate name in database")
            except Exception as name_error:
                print(f"Error extracting name: {str(name_error)}")
                # Fall back to filename
                candidate_name = file.filename.rsplit('.', 1)[0]
                candidate_ref.update({'name': candidate_name})

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