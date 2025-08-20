from flask import Flask, request, jsonify, g, Response
from flask_cors import CORS
from dotenv import load_dotenv
import os
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    print("Warning: google.generativeai not available")
    GENAI_AVAILABLE = False
    genai = None
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

# Import SmartRecruiters integration
try:
    from smartrecruiters_routes import smartrecruiters_bp
    from enhanced_smartrecruiters_routes import enhanced_sr_bp, init_enhanced_smartrecruiters
    SMARTRECRUITERS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: SmartRecruiters integration disabled - {e}")
    SMARTRECRUITERS_AVAILABLE = False

from datetime import datetime, timedelta
import statistics
from collections import defaultdict
import json

try:
    from flask_swagger_ui import get_swaggerui_blueprint
    SWAGGER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Swagger UI not available - {e}")
    SWAGGER_AVAILABLE = False

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS - more permissive for local development
if os.getenv('FLASK_ENV') == 'development' or os.getenv('NODE_ENV') == 'development':
    # Allow all origins in development
    CORS(app, origins="*", supports_credentials=True)
    print("CORS configured for development - allowing all origins")
else:
    # More restrictive in production
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    print("CORS configured for production - API routes only")

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
    print("WARNING: Continuing without Firebase - some features will be disabled")
    db = None
    firebase_admin = None
else:
    try:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase initialized successfully")
    except Exception as firebase_error:
        print(f"WARNING: Firebase initialization failed: {str(firebase_error)}")
        print("Continuing without Firebase - some features will be disabled")
        db = None

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
        if GENAI_AVAILABLE:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('models/gemini-1.5-flash-8b')
        else:
            model = None
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

# Register SmartRecruiters blueprints if available
if SMARTRECRUITERS_AVAILABLE:
    try:
        app.register_blueprint(smartrecruiters_bp)
        app.register_blueprint(enhanced_sr_bp)
        # Initialize enhanced SmartRecruiters service
        if 'db' in globals() and db is not None:
            init_enhanced_smartrecruiters(db)
            print("SmartRecruiters integration initialized successfully")
        else:
            print("Warning: SmartRecruiters integration requires Firebase database")
    except Exception as e:
        print(f"Warning: SmartRecruiters initialization failed - {e}")

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
        if db:
            try:
                # Try a simple read operation
                list(db.collection('jobs').limit(1).stream())
            except Exception as db_error:
                db_status = f"error: {str(db_error)[:50]}"
        else:
            db_status = "disabled"
            
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
        if not db:
            return jsonify({"error": "Database not available"}), 503
        job_data = request.json
        doc_ref = db.collection('jobs').document()
        doc_ref.set(job_data)
        return jsonify({"id": doc_ref.id, "message": "Job created successfully"}), 201
    except Exception as e:
        print(f"Error creating job: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/job/<job_id>')
def get_job(job_id):
    """Get a specific job by ID"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404
        
        job_data = job_doc.to_dict()
        job_data['id'] = job_id
        
        return jsonify(job_data)
        
    except Exception as e:
        print(f"Error getting job {job_id}: {str(e)}")
        return jsonify({"error": "Failed to get job data"}), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
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

        # Check if blob storage is available
        if not blob_service_client:
            return jsonify({
                "message": "Resume upload received (blob storage not configured)",
                "filename": file.filename,
                "job_id": job_id
            }), 200

        # Basic implementation for now - you can expand this
        return jsonify({
            "message": "Resume upload endpoint is working",
            "filename": file.filename,
            "job_id": job_id,
            "blob_storage": "available" if blob_service_client else "unavailable"
        }), 200

    except Exception as e:
        print(f"\n=== Upload Error ===\nError: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    """Get all candidates or filter by job_id if provided"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
            
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

@app.route('/api/candidates/<candidate_id>')
def get_candidate(candidate_id):
    """Get a specific candidate by ID"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        candidate_data['id'] = candidate_id
        
        return jsonify(candidate_data)
        
    except Exception as e:
        print(f"Error getting candidate {candidate_id}: {str(e)}")
        return jsonify({"error": "Failed to get candidate data"}), 500

@app.route('/api/candidate/<candidate_id>/notes', methods=['GET', 'POST'])
def handle_candidate_notes(candidate_id):
    """Get or create notes for a specific candidate"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        if request.method == 'GET':
            # Get existing notes
            notes_ref = db.collection('notes')
            notes_query = notes_ref.where('candidate_id', '==', candidate_id).order_by('timestamp', direction='desc')
            notes_docs = list(notes_query.stream())
            
            notes = []
            for doc in notes_docs:
                note_data = doc.to_dict()
                note_data['id'] = doc.id
                notes.append(note_data)
            
            return jsonify({"notes": notes})
            
        elif request.method == 'POST':
            # Create new note
            data = request.get_json()
            if not data or 'content' not in data:
                return jsonify({"error": "Note content is required"}), 400
            
            note_data = {
                'candidate_id': candidate_id,
                'content': data['content'],
                'author': data.get('author', 'Unknown'),
                'timestamp': datetime.now().isoformat(),
                'type': data.get('type', 'note')
            }
            
            notes_ref = db.collection('notes')
            doc_ref = notes_ref.add(note_data)
            
            note_data['id'] = doc_ref[1].id
            return jsonify(note_data), 201
        
    except Exception as e:
        print(f"Error handling notes for candidate {candidate_id}: {str(e)}")
        return jsonify({"error": "Failed to handle notes"}), 500

@app.route('/api/candidate/<candidate_id>/feedback', methods=['GET', 'POST'])
def handle_candidate_feedback(candidate_id):
    """Get or create feedback for a specific candidate"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        if request.method == 'GET':
            # Get existing feedback
            feedback_ref = db.collection('feedback')
            feedback_query = feedback_ref.where('candidate_id', '==', candidate_id).order_by('timestamp', direction='desc')
            feedback_docs = list(feedback_query.stream())
            
            feedback = []
            for doc in feedback_docs:
                feedback_data = doc.to_dict()
                feedback_data['id'] = doc.id
                feedback.append(feedback_data)
            
            return jsonify({"feedback": feedback})
            
        elif request.method == 'POST':
            # Create new feedback
            data = request.get_json()
            if not data or 'content' not in data:
                return jsonify({"error": "Feedback content is required"}), 400
            
            feedback_data = {
                'candidate_id': candidate_id,
                'content': data['content'],
                'author': data.get('author', 'Unknown'),
                'timestamp': datetime.now().isoformat(),
                'type': 'feedback',
                'rating': data.get('rating', 0)
            }
            
            feedback_ref = db.collection('feedback')
            doc_ref = feedback_ref.add(feedback_data)
            
            feedback_data['id'] = doc_ref[1].id
            return jsonify(feedback_data), 201
        
    except Exception as e:
        print(f"Error handling feedback for candidate {candidate_id}: {str(e)}")
        return jsonify({"error": "Failed to handle feedback"}), 500

@app.route('/api/analytics/dashboard')
def get_dashboard_analytics():
    """Get dashboard analytics data from real database"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Get collections
        jobs_ref = db.collection('jobs')
        candidates_ref = db.collection('candidates')
        
        # Get all jobs and candidates
        jobs_docs = list(jobs_ref.stream())
        candidates_docs = list(candidates_ref.stream())
        
        # Calculate real metrics
        total_jobs = len(jobs_docs)
        total_candidates = len(candidates_docs)
        
        # Calculate stage distribution from real candidate data
        stage_distribution = {}
        hired_count = 0
        rejected_count = 0
        
        for candidate in candidates_docs:
            candidate_data = candidate.to_dict()
            status = candidate_data.get('status', 'NEW')
            stage_distribution[status] = stage_distribution.get(status, 0) + 1
            
            if status == 'Hired':
                hired_count += 1
            elif status == 'Rejected':
                rejected_count += 1
        
        # Calculate real job metrics with actual data
        job_metrics = []
        for job in jobs_docs:
            job_data = job.to_dict()
            job_id = job.id
            
            # Count candidates for this specific job
            job_candidates = [c for c in candidates_docs if c.to_dict().get('job_id') == job_id]
            candidate_count = len(job_candidates)
            
            # Calculate average match score for this job
            match_scores = []
            for candidate in job_candidates:
                candidate_data = candidate.to_dict()
                if 'cv_match_score' in candidate_data and candidate_data['cv_match_score'] is not None:
                    match_scores.append(float(candidate_data['cv_match_score']))
            
            avg_match_score = sum(match_scores) / len(match_scores) if match_scores else 0
            
            job_metrics.append({
                "jobId": job_id,
                "title": job_data.get('title', 'Untitled Job'),
                "candidateCount": candidate_count,
                "status": job_data.get('status', 'active'),
                "avgMatchScore": round(avg_match_score, 1)
            })
        
        # Sort jobs by candidate count (top performing)
        job_metrics.sort(key=lambda x: x['candidateCount'], reverse=True)
        
        # Calculate overall average match score
        all_match_scores = []
        for candidate in candidates_docs:
            candidate_data = candidate.to_dict()
            if 'cv_match_score' in candidate_data and candidate_data['cv_match_score'] is not None:
                all_match_scores.append(float(candidate_data['cv_match_score']))
        
        overall_avg_match = sum(all_match_scores) / len(all_match_scores) if all_match_scores else 0
        
        # Calculate match score distribution
        match_score_distribution = {"excellent": 0, "good": 0, "fair": 0, "poor": 0}
        for score in all_match_scores:
            if score >= 90:
                match_score_distribution["excellent"] += 1
            elif score >= 75:
                match_score_distribution["good"] += 1
            elif score >= 60:
                match_score_distribution["fair"] += 1
            else:
                match_score_distribution["poor"] += 1
        
        # Calculate real rejection reasons from candidate data
        rejection_reasons = {
            "culture": 0,
            "desiredQualifications": 0,
            "minimumQualifications": 0,
            "screeningRequirements": 0,
            "incompleteApplication": 0,
            "ineligibleLocation": 0,
            "misrepresented": 0,
            "moreQualified": 0,
            "noShow": 0,
            "unresponsive": 0,
            "highSalary": 0,
            "overqualified": 0
        }
        
        for candidate in candidates_docs:
            candidate_data = candidate.to_dict()
            if candidate_data.get('status') == 'Rejected':
                rejection_reason = candidate_data.get('rejection_reason', '')
                if rejection_reason in rejection_reasons:
                    rejection_reasons[rejection_reason] += 1
        
        # Calculate source of hire from real data
        source_of_hire = {
            "linkedin": 0,
            "referral": 0,
            "smartrecruiter": 0,
            "direct": 0,
            "jobboard": 0
        }
        
        for candidate in candidates_docs:
            candidate_data = candidate.to_dict()
            source = candidate_data.get('source', 'direct').lower()
            if source in source_of_hire:
                source_of_hire[source] += 1
            else:
                source_of_hire["direct"] += 1
        
        # Build analytics object with real data
        analytics = {
            "overview": {
                "totalJobs": total_jobs,
                "totalCandidates": total_candidates,
                "activeJobs": total_jobs,
                "hiredCandidates": hired_count,
                "overallAvgMatchScore": round(overall_avg_match, 1)
            },
            "stageDistribution": stage_distribution,
            "jobMetrics": job_metrics[:5],  # Top 5 performing jobs
            "trends": {
                "matchScoreDistribution": match_score_distribution
            },
            "sourceOfHire": source_of_hire,
            "rejectionReasons": rejection_reasons
        }
        
        print(f"Dashboard analytics generated with real data: {total_jobs} jobs, {total_candidates} candidates")
        return jsonify(analytics)
        
    except Exception as e:
        print(f"Error getting dashboard analytics: {str(e)}")
        # Only print full traceback in development
        if os.getenv('FLASK_ENV') == 'development':
            import traceback
            traceback.print_exc()
        return jsonify({"error": "Failed to get analytics data"}), 500

@app.route('/api/jobs/<job_id>/analytics')
def get_job_analytics(job_id):
    """Get analytics for a specific job"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Get job details
        job_ref = db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404
        
        job_data = job_doc.to_dict()
        
        # Get candidates for this job
        candidates_ref = db.collection('candidates')
        candidates_query = candidates_ref.where('job_id', '==', job_id)
        candidates_docs = list(candidates_query.stream())
        
        total_candidates = len(candidates_docs)
        
        # Mock analytics data
        analytics = {
            "jobDetails": job_data,
            "candidateMetrics": {
                "total": total_candidates,
                "stageDistribution": {
                    "applied": total_candidates,
                    "screening": 0,
                    "interview": 0,
                    "offer": 0,
                    "hired": 0,
                    "rejected": 0
                }
            },
            "topCandidates": []
        }
        
        return jsonify(analytics)
        
    except Exception as e:
        print(f"Error getting analytics for job {job_id}: {str(e)}")
        return jsonify({"error": "Failed to get job analytics"}), 500

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

@app.route('/api/candidates/<candidate_id>/sentiment-analysis', methods=['POST'])
def analyze_candidate_sentiment(candidate_id):
    """Analyze sentiment for a candidate (mock implementation)"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Mock sentiment analysis - you can implement real AI analysis later
        import random
        sentiments = ['Positive', 'Neutral', 'Negative']
        sentiment = random.choice(sentiments)
        
        # Update the candidate document with the sentiment
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_ref.update({
            'feedback_sentiment': sentiment,
            'sentiment_analyzed_at': datetime.now().isoformat()
        })
        
        return jsonify({
            "sentiment": sentiment,
            "candidate_id": candidate_id,
            "analyzed_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error analyzing sentiment for candidate {candidate_id}: {str(e)}")
        return jsonify({"error": "Failed to analyze sentiment"}), 500

@app.route('/api/evaluate/<job_id>/<resume_id>')
def get_evaluation(job_id, resume_id):
    """Get evaluation for a candidate's resume"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Mock evaluation data - you can implement real AI evaluation later
        evaluation = {
            "summary": "This candidate shows strong technical skills and relevant experience.",
            "detail": "Based on the resume analysis, this candidate appears to be a good match for the position. They have the required technical skills and relevant work experience. The candidate demonstrates strong problem-solving abilities and has worked on similar projects in the past.",
            "match_score": 85,
            "strengths": ["Technical skills", "Relevant experience", "Problem solving"],
            "areas_for_improvement": ["Could show more leadership experience"],
            "recommendation": "Proceed to interview"
        }
        
        return jsonify(evaluation)
        
    except Exception as e:
        print(f"Error getting evaluation for job {job_id}, resume {resume_id}: {str(e)}")
        return jsonify({"error": "Failed to get evaluation"}), 500

@app.route('/api/resume/<path:resume_path>')
def get_resume(resume_path):
    """Get resume file from Azure Blob Storage"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        if not blob_service_client:
            return jsonify({"error": "Blob storage not available"}), 503
        
        # Get the blob client for the resume
        blob_client = blob_service_client.get_blob_client(
            container="resumes", 
            blob=resume_path
        )
        
        # Check if blob exists
        if not blob_client.exists():
            return jsonify({"error": "Resume file not found"}), 404
        
        # Get blob properties to determine content type
        blob_properties = blob_client.get_blob_properties()
        content_type = blob_properties.content_settings.content_type or 'application/pdf'
        
        # Download the blob content
        blob_data = blob_client.download_blob()
        content = blob_data.readall()
        
        # Return the file with proper headers for inline viewing
        response = Response(content, content_type=content_type)
        response.headers['Content-Disposition'] = f'inline; filename="{resume_path}"'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
        
    except Exception as e:
        print(f"Error getting resume {resume_path}: {str(e)}")
        return jsonify({"error": "Failed to get resume"}), 500

@app.route('/api/users')
def get_users():
    """Get all users"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        users_ref = db.collection('users')
        users_docs = list(users_ref.stream())
        
        users = []
        for doc in users_docs:
            user_data = doc.to_dict()
            user_data['id'] = doc.id
            users.append(user_data)
        
        return jsonify(users)
        
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        return jsonify({"error": "Failed to get users"}), 500

@app.route('/api/users/by-email')
def get_user_by_email():
    """Get user by email"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        email = request.args.get('email')
        if not email:
            return jsonify({"error": "Email parameter is required"}), 400
        
        users_ref = db.collection('users')
        users_query = users_ref.where('email', '==', email).limit(1)
        users_docs = list(users_query.stream())
        
        if users_docs:
            user_data = users_docs[0].to_dict()
            user_data['id'] = users_docs[0].id
            return jsonify(user_data)
        else:
            return jsonify(None)
        
    except Exception as e:
        print(f"Error getting user by email: {str(e)}")
        return jsonify({"error": "Failed to get user"}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({"error": "Email is required"}), 400
        
        users_ref = db.collection('users')
        doc_ref = users_ref.add(data)
        
        user_data = data.copy()
        user_data['id'] = doc_ref[1].id
        
        return jsonify(user_data), 201
        
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return jsonify({"error": "Failed to create user"}), 500

@app.route('/api/candidates', methods=['POST'])
def create_candidate():
    """Create a new candidate (public application)"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        # Handle FormData with resume upload
        if 'resume' not in request.files:
            return jsonify({"error": "Resume file is required"}), 400
        
        resume_file = request.files['resume']
        if resume_file.filename == '':
            return jsonify({"error": "No resume file selected"}), 400
        
        # Get candidate data from form
        candidate_data_str = request.form.get('candidate_data')
        if not candidate_data_str:
            return jsonify({"error": "Candidate data is required"}), 400
        
        candidate_data = json.loads(candidate_data_str)
        job_id = request.form.get('job_id')
        
        if not job_id:
            return jsonify({"error": "Job ID is required"}), 400
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'email']
        for field in required_fields:
            if not candidate_data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Upload resume to Azure Blob Storage
        if not blob_service_client:
            return jsonify({"error": "File storage not available"}), 503
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(resume_file.filename)[1]
        blob_name = f"resumes/{job_id}/{timestamp}_{candidate_data['email']}{file_extension}"
        
        # Upload to Azure Blob
        blob_client = blob_service_client.get_blob_client(
            container="resumes", 
            blob=blob_name
        )
        
        blob_client.upload_blob(resume_file.read(), overwrite=True)
        
        # Create candidate document
        candidate_doc = {
            'firstName': candidate_data['firstName'],
            'lastName': candidate_data['lastName'],
            'name': f"{candidate_data['firstName']} {candidate_data['lastName']}",  # Merge firstName + lastName
            'email': candidate_data['email'],
            'phone': candidate_data.get('phone', ''),
            'location': candidate_data.get('location', ''),
            'coverLetter': candidate_data.get('coverLetter', ''),
            'expectedSalary': candidate_data.get('expectedSalary', ''),
            'noticePeriod': candidate_data.get('noticePeriod', ''),
            'source': candidate_data.get('source', 'career_portal'),
            'status': candidate_data.get('status', 'NEW'),
            'stage': 'NEW',  # Add stage field for consistency
            'job_id': job_id,
            'resume_blob_path': blob_name,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'stageHistory': [{
                'stage': 'NEW',
                'timestamp': datetime.now().isoformat(),
                'note': 'Application submitted via career portal'
            }],
            'evaluated': False,  # Track if candidate has been AI evaluated
            'evaluation': None   # Store AI evaluation results
        }
        
        # Add to Firestore
        candidates_ref = db.collection('candidates')
        doc_ref = candidates_ref.add(candidate_doc)
        
        print(f"New candidate created via career portal: {doc_ref[1].id}")
        return jsonify({
            "message": "Application submitted successfully",
            "candidate_id": doc_ref[1].id
        }), 201
        
    except Exception as e:
        print(f"Error creating candidate: {str(e)}")
        return jsonify({"error": "Failed to create candidate"}), 500

@app.route('/api/candidates/<candidate_id>/stage', methods=['PUT'])
def update_candidate_stage(candidate_id):
    """Update candidate stage"""
    try:
        if not db:
            return jsonify({"error": "Database not available"}), 503
        
        data = request.get_json()
        if not data or 'stage' not in data:
            return jsonify({"error": "Stage is required"}), 400
        
        new_stage = data['stage']
        rejection_reason = data.get('rejectionReason')
        
        # Update the candidate document
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            return jsonify({"error": "Candidate not found"}), 404
        
        # Prepare update data
        update_data = {
            'status': new_stage,
            'updated_at': datetime.now().isoformat()
        }
        
        # Add rejection reason if provided
        if rejection_reason:
            update_data['rejection_reason'] = rejection_reason
        
        # Add to stage history
        current_data = candidate_doc.to_dict()
        stage_history = current_data.get('stageHistory', [])
        stage_history.append({
            'stage': new_stage,
            'timestamp': datetime.now().isoformat(),
            'rejection_reason': rejection_reason if rejection_reason else None
        })
        update_data['stageHistory'] = stage_history
        
        # Update the document
        candidate_ref.update(update_data)
        
        print(f"Updated candidate {candidate_id} stage to {new_stage}")
        return jsonify({"message": "Stage updated successfully", "stage": new_stage}), 200
        
    except Exception as e:
        print(f"Error updating candidate stage: {str(e)}")
        return jsonify({"error": "Failed to update candidate stage"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))  # Use port 8000 to avoid macOS ControlCenter on 5000
    print(f"\n=== Starting CandidateHub Backend ===")
    print(f"Server running on http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/health")
    print(f"Test endpoint: http://localhost:{port}/test")
    print(f"SmartRecruiters integration: {'Available' if 'SMARTRECRUITERS_AVAILABLE' in globals() and SMARTRECRUITERS_AVAILABLE else 'Disabled'}")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=port)