from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import google.generativeai as genai
from azure.storage.blob import BlobServiceClient
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)

# Load environment variables
load_dotenv()

# Initialize Firebase
cred = credentials.Certificate('firebase-key.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Azure Blob Storage
blob_service_client = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING'))
container_name = "resumes"

# Initialize Gemini
genai.configure(api_key=os.getenv('AIzaSyCnXnv9KhmAtSGyViVgWP9cQPSneRMOq3Y'))
model = genai.GenerativeModel('gemini-pro')

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

@app.route('/api/resume/upload', methods=['POST'])
def upload_resume():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        job_id = request.form.get('job_id')
        
        if not job_id:
            return jsonify({"error": "No job_id provided"}), 400

        # Upload to Azure Blob Storage
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=f"{job_id}/{file.filename}"
        )
        blob_client.upload_blob(file.read())

        # Store metadata in Firebase
        doc_ref = db.collection('resumes').document()
        doc_ref.set({
            'job_id': job_id,
            'filename': file.filename,
            'blob_path': f"{job_id}/{file.filename}",
            'status': 'uploaded'
        })

        return jsonify({
            "message": "Resume uploaded successfully",
            "id": doc_ref.id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/evaluate/<job_id>/<resume_id>', methods=['POST'])
def evaluate_resume(job_id, resume_id):
    try:
        # Get job description
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404

        # Get resume
        resume_doc = db.collection('resumes').document(resume_id).get()
        if not resume_doc.exists:
            return jsonify({"error": "Resume not found"}), 404

        job_data = job_doc.to_dict()
        resume_data = resume_doc.to_dict()

        # Download resume from Azure Blob
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=resume_data['blob_path']
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

        # Store evaluation results
        doc_ref = db.collection('evaluations').document()
        evaluation_data = {
            'job_id': job_id,
            'resume_id': resume_id,
            'evaluation': evaluation,
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(evaluation_data)

        return jsonify({
            "evaluation_id": doc_ref.id,
            "evaluation": evaluation
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
