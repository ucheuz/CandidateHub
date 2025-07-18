import requests
import json

# Test creating a note
test_data = {
    "content": "Test note content",
    "interviewer": {
        "name": "Current User",
        "avatar": None
    },
    "isSaved": True
}

try:
    response = requests.post(
        "http://localhost:5000/api/candidate/xiNlOHuhQ9H5oA1Uj6Uj/notes",
        headers={"Content-Type": "application/json"},
        json=test_data
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")
