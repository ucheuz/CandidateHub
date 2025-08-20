"""
Simplified Flask app for debugging Azure deployment issues
This strips out all external dependencies to isolate the problem
"""
from flask import Flask, jsonify
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

@app.route('/')
def index():
    """Basic index endpoint"""
    logger.info("Root endpoint accessed")
    return jsonify({
        "message": "CandidateHub API is running (Simple Mode)",
        "status": "healthy",
        "version": "1.0.0-simple",
        "timestamp": datetime.now().isoformat(),
        "port": os.environ.get('WEBSITES_PORT', os.environ.get('PORT', '8000'))
    }), 200

@app.route('/health')
def health_check():
    """Health check endpoint"""
    logger.info("Health check accessed")
    return jsonify({
        "status": "healthy", 
        "service": "CandidateHub API (Simple)",
        "timestamp": datetime.now().isoformat(),
        "port": os.environ.get('WEBSITES_PORT', os.environ.get('PORT', '8000'))
    }), 200

@app.route('/test')
def test_endpoint():
    """Simple test endpoint"""
    logger.info("Test endpoint accessed")
    return jsonify({
        "status": "ok",
        "message": "Backend is responding (Simple Mode)",
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/debug')
def debug_info():
    """Debug endpoint to check environment"""
    return jsonify({
        "port": os.environ.get('PORT', 'Not set'),
        "websites_port": os.environ.get('WEBSITES_PORT', 'Not set'),
        "python_version": "3.9.23",
        "flask_version": "Working",
        "timestamp": datetime.now().isoformat()
    }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
