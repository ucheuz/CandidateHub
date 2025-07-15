from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
from azure.storage.blob import BlobServiceClient
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()

# Initialize Firebase
cred = credentials.Certificate('firebase-key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Azure Blob Storage
blob_service_client = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING'))
container_name = "resumes"

# Create the container if it doesn't exist
container_client = blob_service_client.get_container_client(container_name)
try:
    container_client.get_container_properties()
except Exception:
    container_client.create_container()

# Initialize Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')

@app.route('/api/job', methods=['POST'])
def create_job():
    try:
        job_data = request.json
        if not job_data:
            return jsonify({"error": "No job data provided"}), 400
        
        required_fields = ['title', 'description', 'required_skills']
        missing_fields = [field for field in required_fields if not job_data.get(field)]
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        print("Received job data:", job_data)  # Debug print
        
        try:
            doc_ref = db.collection('jobs').document()
            doc_ref.set(job_data)
            return jsonify({"id": doc_ref.id, "message": "Job created successfully"}), 201
        except Exception as firestore_error:
            print(f"Firestore error: {str(firestore_error)}")
            error_message = str(firestore_error)
            if "API has not been used" in error_message or "disabled" in error_message:
                return jsonify({
                    "error": "Firestore is not enabled. Please enable Firestore in your Firebase Console."
                }), 500
            raise firestore_error
            
    except Exception as e:
        print(f"Error creating job: {str(e)}")  # Debug print
        return jsonify({"error": f"Server error: {str(e)}"}), 500

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
            job['id'] = doc.id
            jobs.append(job)
        return jsonify(jobs), 200
    except Exception as e:
        print(f"Error fetching jobs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/upload', methods=['POST'])
def upload_resume():
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        
        job_id = request.form.get('job_id')
        if not job_id:
            return jsonify({"error": "No job_id provided"}), 400

        # Check if job exists
        try:
            job_doc = db.collection('jobs').document(job_id).get()
            if not job_doc.exists:
                return jsonify({"error": "Job not found"}), 404
        except Exception as e:
            print(f"Error checking job existence: {str(e)}")
            return jsonify({"error": "Failed to verify job"}), 500

        # Upload to Azure Blob Storage
        try:
            blob_name = f"{job_id}/{file.filename}"
            print(f"Attempting to upload file {file.filename} to blob {blob_name}")
            
            # Read file content
            file_content = file.read()
            if not file_content:
                return jsonify({"error": "File is empty"}), 400
                
            print(f"File size: {len(file_content)} bytes")
            
            blob_client = blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )
            
            # Upload the file
            blob_client.upload_blob(file_content, overwrite=True)
            print("File uploaded to Azure successfully")

        except Exception as e:
            print(f"Error uploading to Azure: {str(e)}")
            return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500

        # Store metadata in Firebase
        try:
            doc_ref = db.collection('resumes').document()
            metadata = {
                'job_id': job_id,
                'filename': file.filename,
                'blob_path': blob_name,
                'status': 'uploaded',
                'upload_timestamp': firestore.SERVER_TIMESTAMP,
                'file_size': len(file_content)
            }
            doc_ref.set(metadata)
            print("Metadata stored in Firebase successfully")

            return jsonify({
                "message": "Resume uploaded successfully",
                "id": doc_ref.id,
                "filename": file.filename
            }), 201

        except Exception as e:
            print(f"Error storing metadata in Firebase: {str(e)}")
            # Try to delete the blob if metadata storage fails
            try:
                blob_client.delete_blob()
            except:
                pass
            return jsonify({"error": "Failed to store file metadata"}), 500

    except Exception as e:
        print(f"Unexpected error in upload_resume: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/evaluate/<job_id>/<resume_id>', methods=['POST'])
def evaluate_resume(job_id, resume_id):
    try:
        # Get job description
        try:
            job_doc = db.collection('jobs').document(job_id).get()
            if not job_doc.exists:
                return jsonify({"error": "Job not found"}), 404
            job_data = job_doc.to_dict()
        except Exception as e:
            print(f"Error fetching job data: {str(e)}")
            return jsonify({"error": "Failed to fetch job data"}), 500

        # Get resume
        try:
            resume_doc = db.collection('resumes').document(resume_id).get()
            if not resume_doc.exists:
                return jsonify({"error": "Resume not found"}), 404
            resume_data = resume_doc.to_dict()
        except Exception as e:
            print(f"Error fetching resume data: {str(e)}")
            return jsonify({"error": "Failed to fetch resume data"}), 500

        # Download resume from Azure Blob
        try:
            blob_client = blob_service_client.get_blob_client(
                container=container_name,
                blob=resume_data['blob_path']
            )
            resume_content = blob_client.download_blob().readall().decode('utf-8')
            print(f"Successfully downloaded resume content of length: {len(resume_content)}")
        except Exception as e:
            print(f"Error downloading resume from Azure: {str(e)}")
            return jsonify({"error": "Failed to download resume content"}), 500

        # Use Gemini to evaluate
        try:
            prompt = f"""
            Analyze this job candidate's fit for the position based on their resume and the job requirements.

            Job Description:
            {job_data['description']}
            
            Required Skills:
            {job_data['required_skills']}
            
            Resume Content:
            {resume_content}
            
            Please evaluate the candidate and provide:
            1. Match Score (0-100)
            2. Key Skills Match
            3. Experience Relevance
            4. Areas of Strength
            5. Areas for Improvement
            
            Format your response in clear sections.
            """

            print("Sending prompt to Gemini API...")
            response = model.generate_content(prompt)
            evaluation = response.text
            print("Received response from Gemini API")

        except Exception as e:
            print(f"Error calling Gemini API: {str(e)}")
            return jsonify({"error": "Failed to generate evaluation"}), 500

        # Store evaluation results
        try:
            doc_ref = db.collection('evaluations').document()
            evaluation_data = {
                'job_id': job_id,
                'resume_id': resume_id,
                'evaluation': evaluation,
                'timestamp': firestore.SERVER_TIMESTAMP
            }
            doc_ref.set(evaluation_data)
            print("Stored evaluation results in Firestore")

            return jsonify({
                "evaluation_id": doc_ref.id,
                "evaluation": evaluation
            }), 200
        except Exception as e:
            print(f"Error storing evaluation results: {str(e)}")
            return jsonify({"error": "Failed to store evaluation results"}), 500

    except Exception as e:
        print(f"Unexpected error in evaluate_resume: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
