from firebase_admin import firestore, initialize_app, credentials
import sys

def migrate_notes():
    # Initialize Firebase
    cred = credentials.Certificate('firebase-key.json')
    initialize_app(cred)
    db = firestore.client()

    print("Starting notes migration...")
    
    # Get all notes from the old collection
    old_notes = db.collection('notes').stream()
    
    migrated = 0
    errors = 0
    
    for note in old_notes:
        try:
            note_data = note.to_dict()
            candidate_id = note_data.get('candidateId')
            
            if not candidate_id:
                print(f"Skipping note {note.id} - no candidateId found")
                errors += 1
                continue
                
            # Remove candidateId since it's in the path
            del note_data['candidateId']
            
            # Add to new location
            db.collection('candidates').document(candidate_id)\
                .collection('notes').document(note.id)\
                .set(note_data)
                
            # Delete old note
            note.reference.delete()
            
            migrated += 1
            print(f"Migrated note {note.id} for candidate {candidate_id}")
            
        except Exception as e:
            print(f"Error migrating note {note.id}: {str(e)}")
            errors += 1
    
    print(f"\nMigration complete!")
    print(f"Successfully migrated: {migrated} notes")
    print(f"Errors: {errors}")

if __name__ == '__main__':
    migrate_notes()
