# CandidateHub

CandidateHub is an intelligent evaluation and analytics platform that helps HR professionals manage and evaluate job candidates using AI-powered analysis.

## Features

- Create and manage job descriptions
- Upload and store candidate resumes
- AI-powered resume evaluation against job requirements
- Standardized candidate profiles and scoring
- Modern, user-friendly interface

## Tech Stack

### Backend
- Python Flask API
- Google Gemini for AI analysis
- Azure Blob Storage for resume storage
- Firebase for application data
- PyPDF2 for PDF processing

### Frontend
- React
- Material-UI for component library
- React Router for navigation
- Axios for API communication

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file with the following variables:
```
FLASK_APP=app.py
FLASK_ENV=development
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

5. Place your Firebase service account key in `firebase-key.json`

6. Run the Flask application:
```bash
flask run
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Jobs
- POST `/api/job` - Create a new job
- GET `/api/job/<job_id>` - Get job details

### Resumes
- POST `/api/resume/upload` - Upload a resume
- POST `/api/evaluate/<job_id>/<resume_id>` - Evaluate a resume against a job

## Environment Variables

### Backend
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Blob Storage connection string
- `GEMINI_API_KEY` - Google Gemini API key

## Development

1. Backend development:
   - The Flask application is in `app.py`
   - Add new routes and functionality there

2. Frontend development:
   - Components are in `src/components`
   - Add new components and update routes in `App.js`
