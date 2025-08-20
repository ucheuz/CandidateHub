"""
SmartRecruiters API Routes for CandidateHub
"""

from flask import Blueprint, request, jsonify
from smartrecruiters_service import SmartRecruitersService, SmartRecruitersAPIError
import os
import logging
from azure.storage.blob import BlobServiceClient

logger = logging.getLogger(__name__)

# Create blueprint
smartrecruiters_bp = Blueprint('smartrecruiters', __name__)

# Initialize SmartRecruiters service
SMARTRECRUITERS_API_KEY = os.getenv('SMARTRECRUITERS_API_KEY')
if SMARTRECRUITERS_API_KEY:
    sr_service = SmartRecruitersService(SMARTRECRUITERS_API_KEY)
else:
    sr_service = None
    logger.warning("SmartRecruiters API key not configured")

@smartrecruiters_bp.route('/api/smartrecruiters/posting/<posting_uuid>/config', methods=['GET'])
def get_posting_configuration(posting_uuid):
    """Get application configuration for a SmartRecruiters posting"""
    try:
        if not sr_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        language = request.args.get('language', 'en')
        config = sr_service.get_job_application_config(posting_uuid)
        
        return jsonify({
            "success": True,
            "posting_uuid": posting_uuid,
            "configuration": config
        }), 200
        
    except SmartRecruitersAPIError as e:
        logger.error(f"SmartRecruiters API error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@smartrecruiters_bp.route('/api/smartrecruiters/posting/<posting_uuid>/apply', methods=['POST'])
def submit_application(posting_uuid):
    """Submit a candidate application to SmartRecruiters"""
    try:
        if not sr_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        application_data = request.json
        if not application_data:
            return jsonify({"error": "No application data provided"}), 400
        
        # Get resume file content if resume_blob_url is provided
        resume_content = None
        if application_data.get('resume_blob_url'):
            try:
                resume_content = get_resume_from_blob(application_data['resume_blob_url'])
            except Exception as e:
                logger.warning(f"Failed to retrieve resume: {str(e)}")
        
        # Submit application
        result = sr_service.submit_candidate_application(
            posting_uuid, 
            application_data, 
            resume_content
        )
        
        return jsonify({
            "success": True,
            "posting_uuid": posting_uuid,
            "smartrecruiters_response": result
        }), 200
        
    except SmartRecruitersAPIError as e:
        logger.error(f"SmartRecruiters API error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@smartrecruiters_bp.route('/api/smartrecruiters/posting/<posting_uuid>/candidates/<candidate_id>/status', methods=['GET'])
def get_application_status(posting_uuid, candidate_id):
    """Get the status of a candidate application"""
    try:
        if not sr_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        status = sr_service.check_application_status(posting_uuid, candidate_id)
        
        return jsonify({
            "success": True,
            "posting_uuid": posting_uuid,
            "candidate_id": candidate_id,
            "status": status
        }), 200
        
    except SmartRecruitersAPIError as e:
        logger.error(f"SmartRecruiters API error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@smartrecruiters_bp.route('/api/smartrecruiters/jobs', methods=['GET'])
def list_smartrecruiters_jobs():
    """List jobs that have SmartRecruiters integration enabled"""
    try:
        # This would query your Firebase for jobs with SmartRecruiters posting UUIDs
        # For now, return a placeholder response
        return jsonify({
            "success": True,
            "jobs": [],
            "message": "SmartRecruiters job listing not yet implemented"
        }), 200
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@smartrecruiters_bp.route('/api/smartrecruiters/validate-uuid/<posting_uuid>', methods=['GET'])
def validate_posting_uuid(posting_uuid):
    """Validate a SmartRecruiters posting UUID format"""
    try:
        from smartrecruiters_service import validate_posting_uuid
        
        is_valid = validate_posting_uuid(posting_uuid)
        
        return jsonify({
            "success": True,
            "posting_uuid": posting_uuid,
            "valid": is_valid
        }), 200
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# Helper functions
def get_resume_from_blob(blob_url: str) -> str:
    """Retrieve resume file from Azure Blob Storage and encode as base64"""
    try:
        # This is a simplified version - you'd need to implement proper blob retrieval
        # based on your Azure Blob Storage setup
        connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        if not connection_string:
            raise ValueError("Azure Storage connection string not configured")
        
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        
        # Extract container and blob name from URL
        # This is a simplified extraction - you might need more robust URL parsing
        url_parts = blob_url.replace('https://', '').split('/')
        container_name = url_parts[1] if len(url_parts) > 1 else 'resumes'
        blob_name = '/'.join(url_parts[2:]) if len(url_parts) > 2 else blob_url
        
        blob_client = blob_service_client.get_blob_client(
            container=container_name, 
            blob=blob_name
        )
        
        # Download blob content
        blob_data = blob_client.download_blob().readall()
        
        # Encode to base64
        import base64
        return base64.b64encode(blob_data).decode('utf-8')
        
    except Exception as e:
        logger.error(f"Failed to retrieve resume from blob: {str(e)}")
        raise

# Error handlers for the blueprint
@smartrecruiters_bp.errorhandler(404)
def not_found(error):
    return jsonify({"error": "SmartRecruiters endpoint not found"}), 404

@smartrecruiters_bp.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "SmartRecruiters service error"}), 500
