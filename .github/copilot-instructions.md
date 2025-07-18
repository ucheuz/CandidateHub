# CandidateHub AI Coding Instructions

## Project Overview

CandidateHub is an intelligent HR evaluation platform that combines AI-powered resume analysis with collaborative candidate management. It features a modern React frontend, Python Flask backend, and integrates Firebase Firestore, Azure Blob Storage, and Google Gemini AI for comprehensive candidate evaluation workflows.

## Architecture & Technologies

### Backend (Flask API)
- **Main Application**: `backend/app.py` - Core Flask server with CORS, file uploads, and AI integration
- **Database**: Firebase Firestore with collections: `candidates`, `jobs`, `evaluations`, `notes` (subcollections)
- **Storage**: Azure Blob Storage for resume files with PyPDF2 text extraction
- **AI Integration**: Google Gemini 1.5 Flash for resume analysis and candidate evaluation
- **Real-time**: WebSocket support for collaborative notes (`websocket_handler.py`)
- **Utilities**: `cv_processor.py` for resume text processing, `notes_routes.py` for candidate notes

### Frontend (React + Material-UI)
- **Framework**: React 18 with Material-UI components and React Router
- **State Management**: Local state with hooks, Firebase integration via `firebase.js`
- **UI Components**: Material-UI DataGrid, styled components, responsive design
- **Navigation**: Dynamic routing with candidate profiles, job listings, evaluation workflows

## Database Schema

### Collections Structure
```
candidates/
  ├── {candidateId}
  │   ├── name, email, phone, job_id
  │   ├── resume_blob_path, upload_date, status
  │   ├── cv_match_score, evaluation_id
  │   └── notes/ (subcollection)
  │       └── {noteId} { content, timestamp, interviewer, type }

jobs/
  ├── {jobId}
  │   ├── title, description, required_skills[]
  │   ├── location, type, hiringManagers[]
  │   └── datePosted, dateHired, listedBy

evaluations/
  ├── {evaluationId}
  │   ├── job_id, candidate_id
  │   ├── summary, detail, raw_evaluation
  │   ├── cv_match_score, timestamp
  │   └── [AI-generated content]
```

## Key Code Patterns

### Error Handling
- Backend: Comprehensive try-catch with detailed console logging
- Frontend: Loading states, error boundaries, user-friendly error messages
- File Processing: Graceful PDF parsing failures with fallback content

### Data Flow
1. **Resume Upload**: `JobSelection` → `ResumeUpload` → Flask `/api/resume/upload`
2. **AI Processing**: PDF text extraction → Gemini evaluation → Firestore storage
3. **Display**: `CandidateList` DataGrid → `CandidateProfile` with sections
4. **Real-time Notes**: WebSocket connections for collaborative editing

### Styling Conventions
- Material-UI `styled()` components for custom DataGrid styling
- Consistent color scheme: Primary blue (#0274B3), status-based chip colors
- Responsive design with flexible layouts and mobile considerations

## Component Architecture

### Core Components
- **App.js**: Main router with theme provider and navigation setup
- **CandidateList.js**: Primary data display with filtering, sorting, and action buttons
- **CandidateProfile.js**: Multi-section candidate detail view (CV, notes, evaluation)
- **JobForm.js**: Job creation with validation and Firebase integration
- **NotesHub.js**: Real-time collaborative notes with WebSocket integration

### Data Components
- **Evaluation.js**: AI evaluation display with retry logic for processing states
- **ResumeUpload.js**: File upload with progress tracking and validation
- **JobSelection.js**: Job picker interface with safe string/array handling

## Development Guidelines

### Backend Development
```python
# Standard route pattern
@app.route('/api/endpoint', methods=['GET', 'POST'])
def endpoint_function():
    try:
        print(f"=== Debug Info ===")  # Consistent logging
        # Validation
        # Firebase operations
        # AI processing (if applicable)
        return jsonify(response_data), status_code
    except Exception as e:
        print(f"Error in endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500
```

### Frontend Development
```jsx
// Standard component pattern
const Component = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // API calls
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Loading/error states
  // Main component JSX
};
```

### Firebase Integration
- Use `collection()`, `getDocs()`, `query()`, `where()` for data retrieval
- Server timestamps: `firestore.SERVER_TIMESTAMP` for consistent timing
- Subcollections for related data (notes under candidates)
- Batch operations for complex updates

### AI Processing Patterns
```python
# Gemini integration pattern
model = genai.GenerativeModel('models/gemini-1.5-flash-8b')
prompt = f"""
Clear instructions for AI task
Input data: {data}
Expected output format
"""
response = model.generate_content(prompt)
# Parse and store results
```

## Common Tasks & Solutions

### Adding New Features
1. **New Backend Route**: Add to `app.py` with consistent error handling
2. **New Frontend Component**: Follow Material-UI patterns, add to router
3. **Database Changes**: Update both frontend queries and backend operations
4. **UI Enhancements**: Use Material-UI components, maintain consistent styling

### Data Formatting
- **Dates**: Use `dayjs` for relative time formatting
- **Names**: `formatName()` utility for consistent capitalization
- **Ratings**: Convert percentages to 5-star scales (divide by 20)
- **File Handling**: Always use absolute paths, handle blob storage URLs

### Performance Considerations
- DataGrid: Use `useMemo()` for column definitions
- API Calls: Implement loading states and error boundaries
- File Processing: Stream large files, limit content for AI processing
- Real-time Features: WebSocket cleanup in component unmount

## Environment Setup

### Required Environment Variables
```bash
# Backend (.env)
GEMINI_API_KEY=your_google_gemini_api_key
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection
GOOGLE_APPLICATION_CREDENTIALS=path/to/firebase-key.json

# Frontend (built into build)
REACT_APP_FIREBASE_CONFIG=configured_in_firebase.js
```

### Development Commands
```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py

# Frontend
cd frontend
npm install
npm start
```

## Debugging & Troubleshooting

### Common Issues
1. **PDF Processing**: Check PyPDF2 extraction, verify file content vs hardcoded names
2. **Firebase**: Validate collection names, document IDs, timestamp handling
3. **AI Responses**: Monitor token limits, handle API rate limiting
4. **CORS**: Ensure proper origins in Flask-CORS configuration

### Debugging Tools
- Backend: Extensive console logging with structured debug blocks
- Frontend: Browser dev tools, React dev tools, network tab for API calls
- Database: Firebase console for direct data inspection
- Storage: Azure portal for blob verification

## Code Quality Standards

- **Type Safety**: PropTypes or TypeScript for component props
- **Error Boundaries**: Graceful failure handling throughout the app
- **Accessibility**: Material-UI components provide good defaults
- **Performance**: Lazy loading, memoization, efficient queries
- **Security**: Input validation, safe file handling, environment variables

## File Organization Principles

```
backend/
├── app.py              # Main Flask application
├── cv_processor.py     # Resume text processing utilities
├── notes_routes.py     # Notes API endpoints
├── websocket_handler.py # Real-time communication
└── requirements.txt    # Python dependencies

frontend/src/
├── App.js             # Main application router
├── firebase.js        # Firebase configuration
├── components/        # React components
│   ├── CandidateList.js    # Main data display
│   ├── CandidateProfile.js # Candidate detail view
│   ├── JobForm.js          # Job creation
│   └── NotesHub.js         # Collaborative notes
```

Remember: This codebase emphasizes user experience with AI-powered insights. Always consider the end-to-end workflow from resume upload through evaluation to hiring decision-making.
