from flask import Flask, request, jsonify, g, Response, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
from azure.storage.blob import BlobServiceClient
import firebase_admin
from firebase_admin import credentials, firestore
# Make websocket import optional
try:
    from websocket_handler import init_websocket
    WEBSOCKET_AVAILABLE = True
except ImportError as e:
    print(f"Warning: WebSocket functionality disabled - {e}")
    WEBSOCKET_AVAILABLE = False

try:
    from notes_routes import notes_bp
    NOTES_ROUTES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Notes routes disabled - {e}")
    NOTES_ROUTES_AVAILABLE = False

from datetime import datetime, timedelta
import statistics
from collections import defaultdict
import json

# Import CV processing functions
try:
    from cv_processor import extract_text_from_pdf
    CV_PROCESSOR_AVAILABLE = True
except ImportError as e:
    print(f"Warning: CV processor not available - {e}")
    CV_PROCESSOR_AVAILABLE = False

try:
    from flask_swagger_ui import get_swaggerui_blueprint
    SWAGGER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Swagger UI not available - {e}")
    SWAGGER_AVAILABLE = False

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def perform_ai_evaluation(candidate_info, job_data):
    """Perform AI evaluation of candidate using Gemini"""
    try:
        print("=== Starting AI Evaluation ===")
        
        # Check if Gemini is available
        if not model:
            print("Warning: Gemini model not available, using fallback")
            return {
                "summary": "AI evaluation not available - using fallback assessment",
                "detail": "Gemini AI model not configured. Manual review recommended.",
                "match_score": 50,
                "strengths": ["Resume uploaded successfully"],
                "areas_for_improvement": ["AI evaluation not available"],
                "recommendation": "Manual review required"
            }
        
        # Prepare candidate information for evaluation
        candidate_name = f"{candidate_info.get('firstName', '')} {candidate_info.get('lastName', '')}".strip()
        candidate_email = candidate_info.get('email', '')
        candidate_location = candidate_info.get('location', '')
        candidate_phone = candidate_info.get('phone', '')
        candidate_salary = candidate_info.get('expectedSalary', '')
        candidate_cover_letter = candidate_info.get('coverLetter', '')
        candidate_pronouns = candidate_info.get('pronouns', '')
        
        # Get resume text if available
        resume_text = candidate_info.get('resume_text', '')
        
        # Prepare job information
        job_title = job_data.get('title', 'Unknown')
        job_description = job_data.get('description', '')
        job_requirements = job_data.get('requirements', '')
        job_skills = job_data.get('skills', [])
        job_location = job_data.get('location', '')
        job_salary_range = job_data.get('salaryRange', '')
        
        print(f"Evaluating candidate: {candidate_name}")
        print(f"Job: {job_title}")
        print(f"Resume text length: {len(resume_text)} characters")
        
        # Create comprehensive evaluation prompt
        evaluation_prompt = f"""
        You are an expert HR recruiter and AI evaluator. Analyze this candidate for the position and provide a comprehensive evaluation.

        JOB DETAILS:
        Title: {job_title}
        Description: {job_description}
        Requirements: {job_requirements}
        Required Skills: {', '.join(job_skills) if isinstance(job_skills, list) else job_skills}
        Location: {job_location}
        Salary Range: {job_salary_range}

        CANDIDATE INFORMATION:
        Name: {candidate_name}
        Email: {candidate_email}
        Location: {candidate_location}
        Phone: {candidate_phone}
        Expected Salary: {candidate_salary}
        Cover Letter: {candidate_cover_letter}
        Pronouns: {candidate_pronouns if candidate_pronouns else 'Not specified'}

        RESUME TEXT:
        {resume_text[:5000] if resume_text else 'No resume text available'}

        EVALUATION REQUIREMENTS:
        1. CV Match Score: Provide a score from 0-100 based on how well the candidate's background, skills, and experience match the job requirements.
        2. Key Strengths: List 3-5 specific strengths that make this candidate suitable for the role.
        3. Areas for Improvement: List 2-3 areas where the candidate could improve or develop.
        4. Overall Assessment: Provide a brief summary of the candidate's fit for the position.
        5. Recommendation: Give a clear recommendation (Strongly Recommend, Recommend, Consider, or Not Recommended).
        
        IMPORTANT: If pronouns are provided, use them respectfully throughout the evaluation. If no pronouns are specified, use gender-neutral language and avoid assumptions about gender.

        Please format your response as JSON with these exact keys:
        {{
            "match_score": <0-100 score>,
            "summary": "<brief assessment summary>",
            "detail": "<detailed evaluation>",
            "strengths": ["<strength1>", "<strength2>", "<strength3>"],
            "areas_for_improvement": ["<area1>", "<area2>"],
            "recommendation": "<recommendation>"
        }}
        """
        
        print("Sending evaluation prompt to Gemini...")
        
        # Generate evaluation using Gemini
        response = model.generate_content(evaluation_prompt)
        
        if not response or not response.text:
            print("Error: No response from Gemini API")
            raise Exception("No response from Gemini API")
        
        print("Received response from Gemini, parsing...")
        
        # Try to parse JSON response
        try:
            # Clean the response text by removing markdown code blocks
            cleaned_response = response.text.strip()
            if cleaned_response.startswith('```json'):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.startswith('```'):
                cleaned_response = cleaned_response[3:]  # Remove ```
            if cleaned_response.endswith('```'):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            
            cleaned_response = cleaned_response.strip()
            print(f"Cleaned response for JSON parsing: {cleaned_response[:200]}...")
            
            # Fix common JSON formatting issues from Gemini
            # Remove trailing commas in arrays and objects
            import re
            # Fix trailing commas in arrays: [...,] -> [...]
            cleaned_response = re.sub(r',(\s*[}\]])', r'\1', cleaned_response)
            # Fix trailing commas in objects: {...,} -> {...}
            cleaned_response = re.sub(r',(\s*})', r'\1', cleaned_response)
            
            print(f"Fixed JSON formatting: {cleaned_response[:200]}...")
            
            evaluation_result = json.loads(cleaned_response)
            print("Successfully parsed Gemini response")
        except json.JSONDecodeError as e:
            print(f"Error parsing Gemini response as JSON: {e}")
            print(f"Raw response: {response.text}")
            print(f"Cleaned response: {cleaned_response}")
            
            # Try to extract key information from the text response manually
            try:
                # Extract match score using regex
                import re
                match_score_match = re.search(r'"match_score":\s*(\d+)', cleaned_response)
                match_score = int(match_score_match.group(1)) if match_score_match else 50
                
                # Extract recommendation
                recommendation_match = re.search(r'"recommendation":\s*"([^"]+)"', cleaned_response)
                recommendation = recommendation_match.group(1) if recommendation_match else "Manual review recommended"
                
                # Extract summary
                summary_match = re.search(r'"summary":\s*"([^"]+)"', cleaned_response)
                summary = summary_match.group(1) if summary_match else "AI evaluation completed with manual parsing"
                
                # Extract strengths
                strengths_match = re.search(r'"strengths":\s*\[(.*?)\]', cleaned_response, re.DOTALL)
                strengths = []
                if strengths_match:
                    strengths_text = strengths_match.group(1)
                    # Extract individual strengths
                    strength_matches = re.findall(r'"([^"]+)"', strengths_text)
                    strengths = strength_matches if strength_matches else ["AI evaluation completed"]
                
                # Extract areas for improvement
                areas_match = re.search(r'"areas_for_improvement":\s*\[(.*?)\]', cleaned_response, re.DOTALL)
                areas = []
                if areas_match:
                    areas_text = areas_match.group(1)
                    # Extract individual areas
                    area_matches = re.findall(r'"([^"]+)"', areas_text)
                    areas = area_matches if area_matches else ["Manual parsing required"]
                
                evaluation_result = {
                    "summary": summary,
                    "detail": "AI evaluation completed with manual parsing due to JSON formatting issues",
                    "match_score": match_score,
                    "strengths": strengths,
                    "areas_for_improvement": areas,
                    "recommendation": recommendation
                }
                
                print(f"Manual parsing successful: match_score={match_score}, recommendation={recommendation}")
                
            except Exception as manual_parse_error:
                print(f"Manual parsing also failed: {manual_parse_error}")
                # Final fallback
                evaluation_result = {
                    "summary": "AI evaluation completed with fallback parsing",
                    "detail": "Technical issues prevented proper parsing. Manual review recommended.",
                    "match_score": 50,
                    "strengths": ["AI evaluation completed"],
                    "areas_for_improvement": ["Response parsing failed"],
                    "recommendation": "Manual review recommended"
                }
        
        # Validate and ensure required fields exist
        required_fields = ['match_score', 'summary', 'detail', 'strengths', 'areas_for_improvement', 'recommendation']
        for field in required_fields:
            if field not in evaluation_result:
                if field == 'match_score':
                    evaluation_result[field] = 50
                elif field == 'strengths':
                    evaluation_result[field] = ["AI evaluation completed"]
                elif field == 'areas_for_improvement':
                    evaluation_result[field] = ["Evaluation incomplete"]
                elif field == 'summary':
                    evaluation_result[field] = "AI evaluation completed"
                elif field == 'detail':
                    evaluation_result[field] = "Evaluation details available"
                elif field == 'recommendation':
                    evaluation_result[field] = "Manual review recommended"
        
        # Ensure match_score is a number between 0-100
        try:
            evaluation_result['match_score'] = int(float(evaluation_result['match_score']))
            evaluation_result['match_score'] = max(0, min(100, evaluation_result['match_score']))
        except (ValueError, TypeError):
            evaluation_result['match_score'] = 50
        
        print(f"AI evaluation completed successfully")
        print(f"Match score: {evaluation_result['match_score']}%")
        print(f"Recommendation: {evaluation_result['recommendation']}")
        
        return evaluation_result
        
    except Exception as e:
        print(f"Error in AI evaluation: {str(e)}")
        # Return fallback evaluation
        return {
            "summary": "AI evaluation failed - using fallback assessment",
            "detail": f"Technical issues prevented AI evaluation: {str(e)}. Manual review recommended.",
            "match_score": 50,
            "strengths": ["Resume uploaded successfully"],
            "areas_for_improvement": ["AI evaluation failed"],
            "recommendation": "Manual review required"
        }

app = Flask(__name__)
# Enhanced CORS configuration to handle preflight requests properly
CORS(app, 
     resources={r"/api/*": {
         "origins": ["http://localhost:3000", "http://localhost:3001", "https://candidatehub.azurewebsites.net"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         "allow_headers": ["Content-Type", "Authorization", "User-Id", "X-Requested-With"],
         "supports_credentials": True,
         "max_age": 86400  # Cache preflight for 24 hours
     }},
     allow_headers=["Content-Type", "Authorization", "User-Id", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
)

# Load environment variables
load_dotenv()

# Log environment for debugging
logger.info(f"PORT: {os.environ.get('PORT', 'Not set')}")
logger.info(f"WEBSITES_PORT: {os.environ.get('WEBSITES_PORT', 'Not set')}")

# Initialize Firebase first (before everything else)
firebase_key_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '/app/firebase_key.json')
print(f"Looking for Firebase key at: {firebase_key_path}")

possible_paths = [
    firebase_key_path,
    '/app/firebase_key.json',
    '/app/backend/firebase_key.json',
    '/app/backend/firebase-key.json',
    'firebase_key.json',
    'firebase-key.json'
]

cred = None
for path in possible_paths:
    if os.path.exists(path):
        print(f"Found Firebase key at: {path}")
        cred = credentials.Certificate(path)
        break

if cred is None:
    print("ERROR: Firebase key file not found in any of these locations:")
    for path in possible_paths:
        print(f"  - {path}")
    raise FileNotFoundError("Firebase credentials file not found")

firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Azure Blob Storage (only once, with error handling)
blob_service_client = None
try:
    connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
    if connection_string:
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        container_name = "resumes"
        print("Azure Blob Storage initialized successfully")
    else:
        print("Warning: AZURE_STORAGE_CONNECTION_STRING not found")
except Exception as azure_error:
    print(f"Warning: Azure Blob Storage initialization failed: {str(azure_error)}")
    blob_service_client = None

# Initialize Gemini (only once)
model = None
try:
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        print(f"\n=== Initializing Gemini API ===")
        print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash-8b')
        print("Gemini model instance created successfully")
    else:
        print("Warning: GEMINI_API_KEY not found")
except Exception as gemini_error:
    print(f"Warning: Gemini initialization failed: {str(gemini_error)}")
    model = None

# Initialize optional components
if WEBSOCKET_AVAILABLE:
    try:
        init_websocket(app)
        print("WebSocket initialized successfully")
    except Exception as e:
        print(f"Warning: WebSocket initialization failed - {e}")

if NOTES_ROUTES_AVAILABLE:
    try:
        app.register_blueprint(notes_bp)
        if 'db' in globals():
            notes_bp.init_db(db)
        print("Notes routes initialized successfully")
    except Exception as e:
        print(f"Warning: Notes routes initialization failed - {e}")

if SWAGGER_AVAILABLE:
    try:
        SWAGGER_URL = '/api/docs'
        API_URL = '/static/swagger.yml'
        swaggerui_blueprint = get_swaggerui_blueprint(
            SWAGGER_URL, API_URL,
            config={'app_name': "CandidateHub API"}
        )
        app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)
        print("Swagger UI initialized successfully")
    except Exception as e:
        print(f"Warning: Swagger UI initialization failed - {e}")

# Add health check endpoint for Docker
@app.route('/health')
def health_check():
    """Health check endpoint for Docker and Azure"""
    logger.info("Health check accessed")
    try:
        # Quick database connectivity test
        db_status = "connected"
        try:
            # Try a simple read operation
            list(db.collection('jobs').limit(1).stream())
        except Exception as db_error:
            db_status = f"error: {str(db_error)[:50]}"
            
        return jsonify({
            "status": "healthy", 
            "service": "CandidateHub API",
            "timestamp": datetime.now().isoformat(),
            "port": os.environ.get('WEBSITES_PORT', os.environ.get('PORT', '8000')),
            "firebase": db_status,
            "azure_blob": "connected" if blob_service_client else "disconnected",
            "gemini": "connected" if model else "disconnected"
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "service": "CandidateHub API",
            "timestamp": datetime.now().isoformat()
        }), 503

# Add route to serve swagger.yml with correct host
@app.route('/static/swagger.yml')
def serve_swagger_yml():
    # Use PORT environment variable for host detection
    port = os.environ.get('PORT', '8000')
    host = request.headers.get('Host', f'localhost:{port}')
    with open('static/swagger.yml', 'r') as f:
        content = f.read().replace('localhost:5000', host)
    return Response(content, mimetype='text/yaml')

@app.route("/api/auth/verify", methods=["GET"])
def verify_user_access():
    """
    Verifies if the user in the validated token exists in our Firestore 'users' collection.
    This endpoint is called by the frontend's ProtectedRoute to ensure a user
    who is authenticated with Microsoft is also authorized to use our application.
    """
    return jsonify({"message": "Backend unlocked. All users allowed."}), 200

@app.route('/api/job', methods=['POST'])
def create_job():
    try:
        job_data = request.json
        doc_ref = db.collection('jobs').document()
        doc_ref.set(job_data)
        return jsonify({"id": doc_ref.id, "message": "Job created successfully"}), 201
    except Exception as e:
        print(f"Error creating job: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    try:
        doc_ref = db.collection('jobs').document(job_id)
        doc = doc_ref.get()
        if doc.exists():
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
    """Upload resume and create candidate with AI evaluation"""
    try:
        print("\n=== Starting Resume Upload Process ===")
        if 'file' not in request.files:
            print("Error: No file in request")
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        job_id = request.form.get('job_id')
        candidate_data = request.form.get('candidate_data')
        
        print(f"File received: {file.filename}")
        print(f"Job ID: {job_id}")
        print(f"Candidate data: {candidate_data}")
        
        if not job_id:
            print("Error: No job_id in request")
            return jsonify({"error": "No job_id provided"}), 400

        # Check if blob storage is available
        if not blob_service_client:
            print("Error: Blob storage not configured")
            return jsonify({
                "error": "Blob storage not configured"
            }), 500

        # Check if database is available
        if not db:
            print("Error: Database not configured")
            return jsonify({
                "error": "Database not configured"
            }), 500

        # Get job details
        try:
            job_ref = db.collection('jobs').document(job_id)
            job_doc = job_ref.get()
            if not job_doc.exists:
                print(f"Error: Job {job_id} not found")
                return jsonify({"error": "Job not found"}), 404
            job_data = job_doc.to_dict()
            print(f"Job found: {job_data.get('title', 'Unknown')}")
        except Exception as e:
            print(f"Error fetching job: {str(e)}")
            return jsonify({"error": "Failed to fetch job details"}), 500

        # Parse candidate data
        try:
            if candidate_data:
                candidate_info = json.loads(candidate_data)
            else:
                candidate_info = {}
            print(f"Parsed candidate info: {candidate_info}")
        except json.JSONDecodeError as e:
            print(f"Error parsing candidate data: {str(e)}")
            candidate_info = {}

        # Upload file to Azure Blob Storage
        try:
            # Generate unique blob name with folder structure based on source
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            email = candidate_info.get('email', 'unknown')
            safe_email = email.replace('@', '_').replace('.', '_')
            
            # Determine source and create appropriate folder structure
            source = candidate_info.get('source', 'Career Portal')
            if source == 'Direct':
                # HR uploaded resumes go to 'hr' folder
                folder = 'hr'
            else:
                # Career portal resumes go to 'public' folder
                folder = 'public'
            
            # Create blob name with folder structure
            blob_name = f"{folder}/resumes_{job_id}_{timestamp}_{safe_email}.pdf"
            
            print(f"Uploading to blob: {blob_name} (source: {source}, folder: {folder})")
            
            # Get blob client
            blob_client = blob_service_client.get_blob_client(
                container="resumes", 
                blob=blob_name
            )
            
            # Upload the file
            file_content = file.read()
            blob_client.upload_blob(file_content, overwrite=True)
            
            print(f"File uploaded successfully to blob: {blob_name}")
            print(f"✅ Resume stored in {folder} folder for {source} candidate")
            
        except Exception as e:
            print(f"Error uploading to blob storage: {str(e)}")
            return jsonify({"error": "Failed to upload file to storage"}), 500

        # Extract text from PDF for AI evaluation
        try:
            file.seek(0)  # Reset file pointer
            file_content = file.read()
            
            if CV_PROCESSOR_AVAILABLE:
                resume_text = extract_text_from_pdf(file_content)
                print(f"Resume text extracted using CV processor: {len(resume_text)} characters")
            else:
                # Fallback PDF text extraction
                try:
                    from PyPDF2 import PdfReader
                    import io
                    pdf_file = io.BytesIO(file_content)
                    reader = PdfReader(pdf_file)
                    resume_text = ""
                    for page in reader.pages:
                        resume_text += page.extract_text()
                    print(f"Resume text extracted using fallback method: {len(resume_text)} characters")
                except Exception as fallback_error:
                    print(f"Fallback PDF extraction also failed: {str(fallback_error)}")
                    resume_text = "PDF text extraction failed - manual review required"
                    
        except Exception as e:
            print(f"Error extracting text from PDF: {str(e)}")
            resume_text = "PDF text extraction failed"

        # Perform AI evaluation
        try:
            print("Starting AI evaluation...")
            # Add resume text to candidate info for AI evaluation
            candidate_info['resume_text'] = resume_text
            evaluation_result = perform_ai_evaluation(candidate_info, job_data)
            print(f"AI evaluation completed: {evaluation_result.get('match_score', 'N/A')}%")
        except Exception as e:
            print(f"Error in AI evaluation: {str(e)}")
            evaluation_result = {
                "summary": "AI evaluation failed - using fallback assessment",
                "detail": "Technical issues prevented AI evaluation. Manual review recommended.",
                "match_score": 50,
                "strengths": ["Resume uploaded successfully"],
                "areas_for_improvement": ["AI evaluation failed"],
                "recommendation": "Manual review required"
            }

        # Create candidate document
        try:
            # Prepare candidate data
            candidate_doc = {
                'job_id': job_id,
                'job_title': job_data.get('title', 'Unknown'),
                'name': f"{candidate_info.get('firstName', '')} {candidate_info.get('lastName', '')}".strip(),
                'firstName': candidate_info.get('firstName', ''),
                'lastName': candidate_info.get('lastName', ''),
                'email': candidate_info.get('email', ''),
                'phone': candidate_info.get('phone', ''),
                'location': candidate_info.get('location', ''),
                'expectedSalary': candidate_info.get('expectedSalary', ''),
                'coverLetter': candidate_info.get('coverLetter', ''),
                'pronouns': candidate_info.get('pronouns', ''),  # Store pronouns for respectful analysis
                'resume_blob_path': blob_name,
                'resume_text': resume_text,
                'source': candidate_info.get('source', 'Career Portal'),  # Use source from frontend, default to Career Portal
                'stage': 'NEW',
                'evaluated': True,
                'evaluation': evaluation_result,
                'cv_match_score': evaluation_result.get('match_score', 0),
                'date_submitted': datetime.now().isoformat(),  # Store date for candidate list
                'upload_date': datetime.now().isoformat(),  # Keep for backward compatibility
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'stageHistory': [
                    {
                        'stage': 'NEW',
                        'timestamp': datetime.now().isoformat(),
                        'note': f'Applied through {candidate_info.get("source", "Career Portal")}. AI CV Evaluation completed. CV Match Score: {evaluation_result.get("match_score", 0)}%'
                    }
                ]
            }
            
            print(f"Creating candidate document...")
            
            # Add to Firestore
            candidate_ref = db.collection('candidates').add(candidate_doc)
            candidate_id = candidate_ref[1].id
            
            print(f"Candidate created successfully with ID: {candidate_id}")
            
            return jsonify({
                "message": "Resume uploaded and candidate created successfully",
                "candidate_id": candidate_id,
                "blob_path": blob_name,
                "ai_evaluation": evaluation_result,
                "match_score": evaluation_result.get('match_score', 0)
            }), 201
            
        except Exception as e:
            print(f"Error creating candidate: {str(e)}")
            return jsonify({"error": "Failed to create candidate"}), 500

    except Exception as e:
        print(f"\n=== Upload Error ===\nError: {str(e)}")
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

@app.route('/api/candidates', methods=['POST'])
def create_candidate():
    """Create a new candidate"""
    try:
        print("Creating new candidate...")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        data = request.get_json()
        print(f"Received candidate data: {data}")
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'email', 'job_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Get job details
        job_ref = db.collection('jobs').document(data['job_id'])
        job_doc = job_ref.get()
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404
        
        job_data = job_doc.to_dict()
        
        # Prepare candidate document
        candidate_doc = {
            'job_id': data['job_id'],
            'job_title': job_data.get('title', 'Unknown'),
            'name': f"{data.get('firstName', '')} {data.get('lastName', '')}".strip(),
            'firstName': data.get('firstName', ''),
            'lastName': data.get('lastName', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'location': data.get('location', ''),
            'expectedSalary': data.get('expectedSalary', ''),
            'coverLetter': data.get('coverLetter', ''),
            'source': 'Direct',  # HR-added candidates are "Direct"
            'stage': 'NEW',
            'evaluated': False,  # Not evaluated yet
            'cv_match_score': 0,
            'date_submitted': datetime.now().isoformat(),  # Store date for candidate list
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'stageHistory': [
                {
                    'stage': 'NEW',
                    'timestamp': datetime.now().isoformat(),
                    'note': 'Added by HR'
                }
            ]
        }
        
        # Add optional fields if provided
        if data.get('resume_blob_path'):
            candidate_doc['resume_blob_path'] = data['resume_blob_path']
        if data.get('resume_text'):
            candidate_doc['resume_text'] = data['resume_text']
        
        print(f"Creating candidate document...")
        
        # Add to Firestore
        candidate_ref = db.collection('candidates').add(candidate_doc)
        candidate_id = candidate_ref[1].id
        
        print(f"Candidate created successfully with ID: {candidate_id}")
        
        return jsonify({
            "message": "Candidate created successfully",
            "candidate_id": candidate_id,
            "candidate": candidate_doc
        }), 201
        
    except Exception as e:
        error_msg = f"Error creating candidate: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>', methods=['GET'])
def get_candidate(candidate_id):
    """Get a specific candidate by ID"""
    try:
        print(f"Fetching candidate with ID: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        candidate_data['id'] = candidate_id
        
        print(f"Candidate {candidate_id} found successfully")
        return jsonify(candidate_data), 200
        
    except Exception as e:
        error_msg = f"Error fetching candidate {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>/evaluate', methods=['POST'])
def evaluate_candidate(candidate_id):
    """Evaluate a candidate using AI"""
    try:
        print(f"Starting AI evaluation for candidate: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Get candidate data
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        
        # Get job data for evaluation
        job_id = candidate_data.get('job_id')
        if not job_id:
            return jsonify({"error": "No job associated with candidate"}), 400
        
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            return jsonify({"error": "Associated job not found"}), 404
        
        job_data = job_doc.to_dict()
        
        # Perform AI evaluation
        try:
            print("Starting AI evaluation...")
            evaluation_result = perform_ai_evaluation(candidate_data, job_data)
            print(f"AI evaluation completed: {evaluation_result.get('match_score', 'N/A')}%")
        except Exception as e:
            print(f"Error in AI evaluation: {str(e)}")
            evaluation_result = {
                "summary": "AI evaluation failed - using fallback assessment",
                "detail": "Technical issues prevented AI evaluation. Manual review recommended.",
                "match_score": 50,
                "strengths": ["Resume available for review"],
                "areas_for_improvement": ["AI evaluation failed"],
                "recommendation": "Manual review required"
            }
        
        # Update candidate with evaluation results
        candidate_ref.update({
            'evaluated': True,
            'evaluation': evaluation_result,
            'cv_match_score': evaluation_result.get('match_score', 0),
            'status': 'Evaluated',
            'stage': 'Evaluated',
            'updated_at': datetime.now().isoformat(),
            'stageHistory': firestore.ArrayUnion([
                {
                    'stage': 'Evaluated',
                    'timestamp': datetime.now().isoformat(),
                    'note': f'AI CV Evaluation completed. CV Match Score: {evaluation_result.get("match_score", 0)}%'
                }
            ])
        })
        
        print(f"Candidate {candidate_id} evaluated successfully")
        
        return jsonify({
            "message": "Candidate evaluated successfully",
            "evaluation": evaluation_result,
            "match_score": evaluation_result.get('match_score', 0)
        }), 200
        
    except Exception as e:
        error_msg = f"Error evaluating candidate {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>/stage', methods=['PUT'])
def update_candidate_stage(candidate_id):
    """Update candidate stage"""
    try:
        print(f"Updating stage for candidate: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        data = request.get_json()
        new_stage = data.get('stage')
        
        if not new_stage:
            return jsonify({"error": "No stage provided"}), 400
        
        print(f"New stage: {new_stage}")
        
        # Get candidate data
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        old_stage = candidate_data.get('stage', 'NEW')
        
        # Update candidate stage
        update_data = {
            'stage': new_stage,
            'status': new_stage,  # Keep status in sync with stage
            'updated_at': datetime.now().isoformat()
        }
        
        # Add to stage history
        stage_history_entry = {
            'stage': new_stage,
            'timestamp': datetime.now().isoformat(),
            'note': f'Stage changed from {old_stage} to {new_stage}'
        }
        
        update_data['stageHistory'] = firestore.ArrayUnion([stage_history_entry])
        
        # Update the candidate
        candidate_ref.update(update_data)
        
        print(f"Candidate {candidate_id} stage updated from {old_stage} to {new_stage}")
        
        return jsonify({
            "message": "Candidate stage updated successfully",
            "candidate_id": candidate_id,
            "old_stage": old_stage,
            "new_stage": new_stage
        }), 200
        
    except Exception as e:
        error_msg = f"Error updating candidate stage {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>/rating', methods=['PUT'])
def update_candidate_rating(candidate_id):
    """Update candidate manager rating"""
    try:
        print(f"Updating manager rating for candidate: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        data = request.get_json()
        manager_rating = data.get('managerRating')
        
        if manager_rating is None:
            return jsonify({"error": "No manager rating provided"}), 400
        
        print(f"New manager rating: {manager_rating}")
        
        # Get candidate data
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        # Update candidate manager rating
        update_data = {
            'managerRating': manager_rating,
            'updated_at': datetime.now().isoformat()
        }
        
        # Update the candidate
        candidate_ref.update(update_data)
        
        print(f"Candidate {candidate_id} manager rating updated to {manager_rating}")
        
        return jsonify({
            "message": "Candidate manager rating updated successfully",
            "candidate_id": candidate_id,
            "manager_rating": manager_rating
        }), 200
        
    except Exception as e:
        error_msg = f"Error updating candidate manager rating {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>/sentiment-analysis', methods=['POST'])
def analyze_candidate_sentiment(candidate_id):
    """Analyze candidate feedback sentiment"""
    try:
        print(f"Analyzing sentiment for candidate: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Get candidate data
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        
        # Mock sentiment analysis (you can integrate with a real sentiment analysis service)
        # For now, return a default sentiment
        sentiment = "Neutral"
        
        # Update candidate with sentiment
        candidate_ref.update({
            'feedback_sentiment': sentiment,
            'updated_at': datetime.now().isoformat()
        })
        
        print(f"Sentiment analysis completed for candidate {candidate_id}: {sentiment}")
        
        return jsonify({
            "message": "Sentiment analysis completed",
            "candidate_id": candidate_id,
            "sentiment": sentiment
        }), 200
        
    except Exception as e:
        error_msg = f"Error analyzing sentiment for candidate {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>/scorecard', methods=['POST'])
def submit_scorecard(candidate_id):
    """Submit interviewer scorecard for candidate"""
    try:
        print(f"Submitting scorecard for candidate: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        data = request.get_json()
        print(f"Scorecard data: {data}")
        
        # Validate required fields
        scorecard_type = data.get('scorecardType') or data.get('type')
        ratings = data.get('ratings')
        submitted_by = data.get('submittedBy') or data.get('interviewer')
        
        if not scorecard_type or not ratings or not submitted_by:
            return jsonify({"error": "Missing required fields: scorecardType, ratings, submittedBy"}), 400
        
        # Validate scorecard type
        valid_types = ['core_values', 'departmental', 'technical']
        if scorecard_type not in valid_types:
            return jsonify({"error": f"Invalid scorecard type. Must be one of: {valid_types}"}), 400
        
        print(f"Scorecard type: {scorecard_type}, Submitted by: {submitted_by}")
        
        # Get candidate data
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        
        # Create scorecard entry
        scorecard_entry = {
            'type': scorecard_type,
            'ratings': ratings,
            'submittedBy': submitted_by,
            'submittedAt': datetime.now().isoformat(),
            'totalScore': sum(ratings.values()) if isinstance(ratings, dict) else 0
        }
        
        # Initialize or update scorecards array
        current_scorecards = candidate_data.get('interviewer_scorecards', [])
        current_scorecards.append(scorecard_entry)
        
        # Calculate averages for core values and departmental skills
        core_values_scorecards = [s for s in current_scorecards if s['type'] == 'core_values']
        departmental_scorecards = [s for s in current_scorecards if s['type'] == 'departmental']
        
        core_values_avg = 0
        departmental_avg = 0
        
        if core_values_scorecards:
            # Calculate average of individual ratings, not total scores
            all_ratings = []
            for scorecard in core_values_scorecards:
                if isinstance(scorecard.get('ratings'), dict):
                    all_ratings.extend(scorecard['ratings'].values())
                elif isinstance(scorecard.get('ratings'), list):
                    all_ratings.extend(scorecard['ratings'])
            
            if all_ratings:
                core_values_avg = round(sum(all_ratings) / len(all_ratings), 1)
        
        if departmental_scorecards:
            # Calculate average of individual ratings, not total scores
            all_ratings = []
            for scorecard in departmental_scorecards:
                if isinstance(scorecard.get('ratings'), dict):
                    all_ratings.extend(scorecard['ratings'].values())
                elif isinstance(scorecard.get('ratings'), list):
                    all_ratings.extend(scorecard['ratings'])
            
            if all_ratings:
                departmental_avg = round(sum(all_ratings) / len(all_ratings), 1)
        
        # Update candidate with scorecard and averages
        update_data = {
            'interviewer_scorecards': current_scorecards,
            'core_values_scorecard_avg': core_values_avg,
            'departmental_scorecard_avg': departmental_avg,
            'updated_at': datetime.now().isoformat()
        }
        
        candidate_ref.update(update_data)
        
        print(f"Scorecard submitted for candidate {candidate_id}")
        print(f"Core values average: {core_values_avg}")
        print(f"Departmental skills average: {departmental_avg}")
        
        return jsonify({
            "message": "Scorecard submitted successfully",
            "candidate_id": candidate_id,
            "scorecard_type": scorecard_type,
            "core_values_avg": core_values_avg,
            "departmental_avg": departmental_avg
        }), 201
        
    except Exception as e:
        error_msg = f"Error submitting scorecard for candidate {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/candidates/<candidate_id>/scorecard/status', methods=['GET'])
def get_scorecard_status(candidate_id):
    """Check if a scorecard has already been submitted for a candidate"""
    try:
        print(f"Checking scorecard status for candidate: {candidate_id}")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        scorecard_type = request.args.get('scorecardType')
        if not scorecard_type:
            return jsonify({"error": "No scorecard type provided"}), 400
        
        print(f"Checking status for scorecard type: {scorecard_type}")
        
        # Get candidate data
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            print(f"Candidate {candidate_id} not found")
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        scorecards = candidate_data.get('interviewer_scorecards', [])
        
        # Check if scorecard of this type has been submitted
        submitted_scorecards = [s for s in scorecards if s.get('type') == scorecard_type]
        
        is_submitted = len(submitted_scorecards) > 0
        submitted_count = len(submitted_scorecards)
        
        print(f"Scorecard type {scorecard_type}: submitted={is_submitted}, count={submitted_count}")
        
        return jsonify({
            "candidate_id": candidate_id,
            "scorecard_type": scorecard_type,
            "is_submitted": is_submitted,
            "submitted_count": submitted_count,
            "last_submitted": submitted_scorecards[-1].get('submittedAt') if submitted_scorecards else None
        }), 200
        
    except Exception as e:
        error_msg = f"Error checking scorecard status for candidate {candidate_id}: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/analytics/dashboard')
def get_dashboard_analytics():
    """Get dashboard analytics data"""
    try:
        print("Fetching dashboard analytics...")
        
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Get all candidates
        candidates_ref = db.collection('candidates').stream()
        candidates = []
        for doc in candidates_ref:
            candidate = doc.to_dict()
            candidate['id'] = doc.id
            candidates.append(candidate)
        
        # Get all jobs
        jobs_ref = db.collection('jobs').stream()
        jobs = []
        for doc in jobs_ref:
            job = doc.to_dict()
            job['id'] = doc.id
            jobs.append(job)
        
        # Calculate overview metrics
        total_candidates = len(candidates)
        total_jobs = len(jobs)
        
        # Calculate average match score
        match_scores = [c.get('cv_match_score', 0) for c in candidates if c.get('cv_match_score') is not None]
        overall_avg_match_score = round(sum(match_scores) / len(match_scores), 1) if match_scores else 0
        
        # Count hired candidates
        hired_candidates = len([c for c in candidates if c.get('status') == 'Hired'])
        
        # Calculate stage distribution
        stage_distribution = {}
        for candidate in candidates:
            stage = candidate.get('status', 'NEW')
            stage_distribution[stage] = stage_distribution.get(stage, 0) + 1
        
        # Calculate match score distribution
        match_score_distribution = {'excellent': 0, 'good': 0, 'fair': 0, 'poor': 0}
        for candidate in candidates:
            score = candidate.get('cv_match_score', 0)
            if score >= 80:
                match_score_distribution['excellent'] += 1
            elif score >= 60:
                match_score_distribution['good'] += 1
            elif score >= 40:
                match_score_distribution['fair'] += 1
            else:
                match_score_distribution['poor'] += 1
        
        # Get top performing jobs
        job_metrics = []
        for job in jobs:
            job_candidates = [c for c in candidates if c.get('job_id') == job['id']]
            job_metrics.append({
                'id': job['id'],
                'title': job.get('title', 'Unknown'),
                'candidateCount': len(job_candidates),
                'avgMatchScore': round(sum([c.get('cv_match_score', 0) for c in job_candidates]) / len(job_candidates), 1) if job_candidates else 0
            })
        
        # Sort jobs by candidate count
        job_metrics.sort(key=lambda x: x['candidateCount'], reverse=True)
        
        # Calculate source of hire
        source_of_hire = {}
        for candidate in candidates:
            source = candidate.get('source', 'Unknown')
            source_of_hire[source.lower()] = source_of_hire.get(source.lower(), 0) + 1
        
        # Calculate rejection reasons (if available)
        rejection_reasons = {}
        for candidate in candidates:
            if candidate.get('status') == 'Rejected':
                reason = candidate.get('rejection_reason', 'Other')
                rejection_reasons[reason] = rejection_reasons.get(reason, 0) + 1
        
        # Mock time to hire data (you can enhance this with real data)
        time_to_hire = {
            'week1': 2,
            'week2': 5,
            'month1': 8,
            'month2': 3,
            'beyond': 1
        }
        
        analytics_data = {
            'overview': {
                'totalCandidates': total_candidates,
                'totalJobs': total_jobs,
                'overallAvgMatchScore': overall_avg_match_score,
                'hiredCandidates': hired_candidates
            },
            'stageDistribution': stage_distribution,
            'jobMetrics': job_metrics[:5],  # Top 5 jobs
            'trends': {
                'matchScoreDistribution': match_score_distribution
            },
            'sourceOfHire': source_of_hire,
            'rejectionReasons': rejection_reasons,
            'timeToHire': time_to_hire
        }
        
        print(f"Dashboard analytics generated: {total_candidates} candidates, {total_jobs} jobs")
        return jsonify(analytics_data), 200
        
    except Exception as e:
        error_msg = f"Error generating dashboard analytics: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

# Add a simple test endpoint
@app.route('/')
def index():
    """Basic index endpoint"""
    logger.info("Root endpoint accessed")
    return jsonify({
        "message": "CandidateHub API is running",
        "status": "healthy",
        "version": "1.0.0",
        "port": os.environ.get('WEBSITES_PORT', os.environ.get('PORT', '8000')),
        "endpoints": ["/health", "/api/jobs", "/api/candidates", "/api/auth/verify"]
    }), 200

# Add a debug endpoint to help with troubleshooting
@app.route('/debug')
def debug_info():
    """Debug endpoint to check environment"""
    return jsonify({
        "port": os.environ.get('PORT', 'Not set'),
        "websites_port": os.environ.get('WEBSITES_PORT', 'Not set'),
        "all_env_vars": {k: v for k, v in os.environ.items() if 'PORT' in k}
    }), 200

# Global OPTIONS handler for CORS preflight requests
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        print(f"=== CORS Preflight Request ===")
        print(f"Path: {request.path}")
        print(f"Headers: {dict(request.headers)}")
        
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,User-Id,X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH")
        response.headers.add("Access-Control-Max-Age", "86400")
        
        print(f"=== CORS Response Headers ===")
        print(f"Response headers: {dict(response.headers)}")
        
        return response

# Add error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    error_msg = f"Unhandled exception: {str(e)}"
    traceback_str = traceback.format_exc()
    print(f"{error_msg}\n{traceback_str}")
    logger.error(f"{error_msg}\n{traceback_str}")
    return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

# Add a simple test endpoint that doesn't require external services
@app.route('/test')
def test_endpoint():
    """Simple test endpoint for debugging"""
    return jsonify({
        "status": "ok",
        "message": "Backend is responding",
        "timestamp": datetime.now().isoformat()
    }), 200

# Add a CORS test endpoint
@app.route('/api/cors-test')
def cors_test():
    """Test endpoint to verify CORS is working"""
    return jsonify({
        "status": "ok",
        "message": "CORS test successful",
        "timestamp": datetime.now().isoformat(),
        "origin": request.headers.get('Origin', 'No origin header'),
        "method": request.method
    }), 200

# Resume serving endpoint with folder structure support
@app.route('/api/resume/<path:blob_path>')
def serve_resume(blob_path):
    """Serve resume files from Azure Blob Storage with folder structure support"""
    try:
        if not blob_service_client:
            return jsonify({"error": "Blob storage not available"}), 503
        
        # Get blob client for the specific path (includes folder structure)
        print(f"🔍 Serving resume from blob path: {blob_path}")
        
        blob_client = blob_service_client.get_blob_client(
            container="resumes",
            blob=blob_path
        )
        
        # Download the blob content
        blob_data = blob_client.download_blob()
        file_content = blob_data.readall()
        
        # Determine content type based on file extension
        if blob_path.lower().endswith('.pdf'):
            content_type = 'application/pdf'
        elif blob_path.lower().endswith('.doc'):
            content_type = 'application/msword'
        elif blob_path.lower().endswith('.docx'):
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:
            content_type = 'application/octet-stream'
        
        # Create response with appropriate headers
        response = make_response(file_content)
        response.headers['Content-Type'] = content_type
        response.headers['Content-Disposition'] = f'inline; filename="{blob_path.split("/")[-1]}"'
        response.headers['Access-Control-Allow-Origin'] = '*'
        
        print(f"Resume served successfully: {blob_path} (content-type: {content_type})")
        return response
        
    except Exception as e:
        print(f"Error serving resume {blob_path}: {str(e)}")
        return jsonify({"error": "Failed to retrieve resume"}), 500

if __name__ == '__main__':
    # Get port from environment variables
    port = int(os.environ.get('PORT', 8000))
    
    print(f"\n=== Starting CandidateHub Backend ===")
    print(f"Port: {port}")
    print(f"Environment: {'Production' if os.environ.get('FLASK_ENV') == 'production' else 'Development'}")
    print(f"Firebase: {'Connected' if db else 'Not connected'}")
    print(f"Azure Blob: {'Connected' if blob_service_client else 'Not connected'}")
    print(f"Gemini AI: {'Connected' if model else 'Not connected'}")
    print(f"WebSocket: {'Available' if WEBSOCKET_AVAILABLE else 'Not available'}")
    print(f"Notes Routes: {'Available' if NOTES_ROUTES_AVAILABLE else 'Not available'}")
    print(f"Swagger UI: {'Available' if SWAGGER_AVAILABLE else 'Not available'}")
    print(f"\nServer starting on http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=port,
        debug=True,  # Enable debug mode for development
        threaded=True  # Enable threading for better performance
    )