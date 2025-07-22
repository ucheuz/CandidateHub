from flask import Blueprint, request, jsonify
from firebase_admin import firestore
import datetime

notes_bp = Blueprint('notes', __name__)
db = None

def init_db(firestore_client):
    global db
    db = firestore_client

# Attach init_db to the blueprint object
notes_bp.init_db = init_db

@notes_bp.route('/api/candidate/<candidate_id>/notes', methods=['GET'])
def get_notes(candidate_id):
    try:
        if not db:
            return jsonify({'error': 'Database not initialized'}), 500

        # Get notes from candidate's subcollection
        notes_ref = db.collection('candidates').document(candidate_id)\
            .collection('notes')\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .stream()
        
        notes = []
        for doc in notes_ref:
            note_data = doc.to_dict()
            note_data['id'] = doc.id
            notes.append(note_data)
            
        return jsonify({'notes': notes}), 200
    except Exception as e:
        print(f"Error fetching notes: {str(e)}")
        return jsonify({'error': 'Failed to fetch notes'}), 500

@notes_bp.route('/api/candidate/<candidate_id>/notes', methods=['POST'])
def create_note(candidate_id):
    try:
        print(f"\n=== Creating Note for Candidate {candidate_id} ===")
        
        if not db:
            print("Error: Database not initialized")
            return jsonify({'error': 'Database not initialized'}), 500

        # Verify we have JSON data
        if not request.is_json:
            print("Error: No JSON data received")
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        # Get the note data
        note_data = request.json
        print(f"Received note data: {note_data}")
        print(f"DEBUG: interviewer field received: {note_data.get('interviewer')}")

        # Validate required fields
        if 'content' not in note_data:
            print("Error: Missing 'content' field in note data")
            return jsonify({'error': 'Note content is required'}), 400

        # First verify the candidate exists
        print(f"Verifying candidate {candidate_id} exists...")
        candidate_ref = db.collection('candidates').document(candidate_id)
        candidate = candidate_ref.get()
        
        if not candidate.exists:
            print(f"Error: Candidate {candidate_id} not found")
            return jsonify({'error': 'Candidate not found'}), 404
            
        print(f"Found candidate: {candidate.id}")

        # Check if this is a saved note (feedback)
        is_saved = note_data.get('isSaved', False)
        
        if is_saved:
            # Store in feedback collection
            feedback_data = {
                'candidate_id': candidate_id,
                'content': note_data['content'],
                'timestamp': firestore.SERVER_TIMESTAMP,
                'interviewer': note_data.get('interviewer', {'name': 'Current User', 'avatar': None}),
                'type': 'interview_feedback'
            }
            
            print("Creating feedback in Firestore...")
            doc_ref = candidate_ref.collection('feedback').document()
            print(f"Generated feedback ID: {doc_ref.id}")
            
            doc_ref.set(feedback_data)
            print(f"Feedback {doc_ref.id} saved successfully to Firestore")
            
            # Prepare response with the new feedback ID (convert timestamp for JSON)
            response_data = feedback_data.copy()
            response_data['id'] = doc_ref.id
            response_data['isSaved'] = True
            response_data['timestamp'] = datetime.datetime.now().isoformat()
            
            return jsonify(response_data), 201
        else:
            # Store as regular note (chat message)
            cleaned_note_data = {
                'content': note_data['content'],
                'timestamp': firestore.SERVER_TIMESTAMP,
                'interviewer': note_data.get('interviewer', {'name': 'Current User', 'avatar': None}),
                'isSaved': False,
                'type': 'chat_message'
            }
            
            # Add note to candidate's notes subcollection
            print("Creating note in Firestore...")
            doc_ref = candidate_ref.collection('notes').document()
            print(f"Generated note ID: {doc_ref.id}")
            
            doc_ref.set(cleaned_note_data)
            print(f"Note {doc_ref.id} saved successfully to Firestore")
            
            # Prepare response with the new note ID (convert timestamp for JSON)
            response_data = cleaned_note_data.copy()
            response_data['id'] = doc_ref.id
            response_data['timestamp'] = datetime.datetime.now().isoformat()
            
            return jsonify(response_data), 201
            
    except Exception as e:
        import traceback
        print(f"Error creating note: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to create note: {str(e)}'}), 500

@notes_bp.route('/api/candidate/<candidate_id>/feedback', methods=['GET'])
def get_feedback(candidate_id):
    try:
        if not db:
            return jsonify({'error': 'Database not initialized'}), 500

        # Get feedback from candidate's subcollection
        feedback_ref = db.collection('candidates').document(candidate_id)\
            .collection('feedback')\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .stream()
        
        feedback = []
        for doc in feedback_ref:
            feedback_data = doc.to_dict()
            feedback_data['id'] = doc.id
            feedback.append(feedback_data)
            
        return jsonify({'feedback': feedback}), 200
    except Exception as e:
        print(f"Error fetching feedback: {str(e)}")
        return jsonify({'error': 'Failed to fetch feedback'}), 500
