import requests
import json

def list_models():
    response = requests.get('http://localhost:5000/api/models')
    models = response.json()['models']
    
    print("\nAvailable Gemini Models:\n")
    for model in models:
        print(f"Name: {model['name']}")
        print(f"Description: {model['description']}")
        print(f"Supports text input: {model['input_text']}")
        print(f"Supported methods: {', '.join(model['generation_methods'])}")
        print("-" * 80 + "\n")

if __name__ == '__main__':
    list_models()
