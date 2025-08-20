"""
Enhanced SmartRecruiters API Routes with Bidirectional Sync
"""

from flask import Blueprint, request, jsonify
from enhanced_smartrecruiters_service import (
    BidirectionalSyncService, 
    SmartRecruitersAPIError,
    BackgroundSyncManager
)
import os
import logging
import asyncio
from datetime import datetime
import json

logger = logging.getLogger(__name__)

# Create blueprint
enhanced_sr_bp = Blueprint('enhanced_smartrecruiters', __name__)

# Initialize services
SMARTRECRUITERS_API_KEY = os.getenv('SMARTRECRUITERS_API_KEY')
sync_service = None
background_manager = None

def init_enhanced_smartrecruiters(db):
    """Initialize the enhanced SmartRecruiters service"""
    global sync_service, background_manager
    
    if SMARTRECRUITERS_API_KEY and db:
        sync_service = BidirectionalSyncService(SMARTRECRUITERS_API_KEY, db)
        background_manager = BackgroundSyncManager(sync_service)
        logger.info("Enhanced SmartRecruiters service initialized")
    else:
        logger.warning("SmartRecruiters API key or database not configured")

@enhanced_sr_bp.route('/api/smartrecruiters/sync-job', methods=['POST'])
def sync_job_to_smartrecruiters():
    """Sync a CandidateHub job to SmartRecruiters"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        data = request.json
        job_id = data.get('job_id')
        job_data = data.get('job_data')
        
        if not job_id or not job_data:
            return jsonify({"error": "job_id and job_data are required"}), 400
        
        # Run async sync
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                sync_service.sync_job_to_smartrecruiters(job_id, job_data)
            )
            
            return jsonify({
                "success": True,
                "job_id": job_id,
                "smartrecruiters_result": result,
                "message": "Job successfully synced to SmartRecruiters"
            }), 200
            
        finally:
            loop.close()
        
    except SmartRecruitersAPIError as e:
        logger.error(f"SmartRecruiters API error: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 400
    except Exception as e:
        logger.error(f"Unexpected error syncing job: {str(e)}")
        return jsonify({"error": "Internal server error", "success": False}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/sync-candidate', methods=['POST'])
def sync_candidate_to_smartrecruiters():
    """Sync a candidate application to SmartRecruiters"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        data = request.json
        candidate_data = data.get('candidate_data')
        posting_uuid = data.get('posting_uuid')
        
        if not candidate_data or not posting_uuid:
            return jsonify({"error": "candidate_data and posting_uuid are required"}), 400
        
        # Run async sync
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                sync_service.sync_candidate_to_smartrecruiters(candidate_data, posting_uuid)
            )
            
            return jsonify({
                "success": True,
                "candidate_id": candidate_data.get('id'),
                "posting_uuid": posting_uuid,
                "smartrecruiters_result": result,
                "message": "Candidate successfully synced to SmartRecruiters"
            }), 200
            
        finally:
            loop.close()
        
    except SmartRecruitersAPIError as e:
        logger.error(f"SmartRecruiters API error: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 400
    except Exception as e:
        logger.error(f"Unexpected error syncing candidate: {str(e)}")
        return jsonify({"error": "Internal server error", "success": False}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/webhook', methods=['POST'])
def handle_smartrecruiters_webhook():
    """Handle incoming webhooks from SmartRecruiters"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        webhook_data = request.json
        
        if not webhook_data:
            return jsonify({"error": "No webhook data provided"}), 400
        
        # Log webhook for debugging
        logger.info(f"Received SmartRecruiters webhook: {webhook_data.get('eventType')}")
        
        # Run async webhook processing
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(
                sync_service.sync_from_smartrecruiters_webhook(webhook_data)
            )
            
            return jsonify({
                "success": True,
                "message": "Webhook processed successfully"
            }), 200
            
        finally:
            loop.close()
        
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return jsonify({"error": "Webhook processing failed", "success": False}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/sync-status/<job_id>', methods=['GET'])
def get_job_sync_status(job_id):
    """Get the SmartRecruiters sync status for a job"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        # Get job document from Firestore
        job_ref = sync_service.db.collection('jobs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            return jsonify({"error": "Job not found"}), 404
        
        job_data = job_doc.to_dict()
        sr_data = job_data.get('smartrecruiters', {})
        
        return jsonify({
            "success": True,
            "job_id": job_id,
            "sync_status": {
                "enabled": sr_data.get('enabled', False),
                "posting_uuid": sr_data.get('posting_uuid'),
                "sync_status": sr_data.get('sync_status'),
                "last_sync": sr_data.get('last_sync'),
                "error_message": sr_data.get('error_message'),
                "sr_status": sr_data.get('sr_status')
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting sync status: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/candidate-status/<candidate_id>', methods=['GET'])
def get_candidate_status(candidate_id):
    """Get the SmartRecruiters application status for a candidate"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        # Get candidate document from Firestore
        candidate_ref = sync_service.db.collection('candidates').document(candidate_id)
        candidate_doc = candidate_ref.get()
        
        if not candidate_doc.exists:
            return jsonify({"error": "Candidate not found"}), 404
        
        candidate_data = candidate_doc.to_dict()
        sr_data = candidate_data.get('smartrecruiters', {})
        
        return jsonify({
            "success": True,
            "candidate_id": candidate_id,
            "smartrecruiters_status": {
                "application_id": sr_data.get('application_id'),
                "candidate_id": sr_data.get('candidate_id'),
                "posting_uuid": sr_data.get('posting_uuid'),
                "status": sr_data.get('status'),
                "submitted_at": sr_data.get('submitted_at'),
                "last_sync": sr_data.get('last_sync')
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting candidate status: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/jobs', methods=['GET'])
def list_smartrecruiters_jobs():
    """List all jobs with SmartRecruiters integration"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        # Query jobs with SmartRecruiters integration
        jobs_ref = sync_service.db.collection('jobs')
        query = jobs_ref.where('smartrecruiters.enabled', '==', True)
        jobs = list(query.stream())
        
        job_list = []
        for job_doc in jobs:
            job_data = job_doc.to_dict()
            sr_data = job_data.get('smartrecruiters', {})
            
            job_list.append({
                "id": job_doc.id,
                "title": job_data.get('title'),
                "department": sr_data.get('department'),
                "posting_uuid": sr_data.get('posting_uuid'),
                "sync_status": sr_data.get('sync_status'),
                "sr_status": sr_data.get('sr_status'),
                "last_sync": sr_data.get('last_sync'),
                "date_posted": job_data.get('datePosted')
            })
        
        return jsonify({
            "success": True,
            "jobs": job_list,
            "total": len(job_list)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing SmartRecruiters jobs: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/candidates', methods=['GET'])
def list_smartrecruiters_candidates():
    """List all candidates with SmartRecruiters applications"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        # Query candidates with SmartRecruiters data
        candidates_ref = sync_service.db.collection('candidates')
        query = candidates_ref.where('smartrecruiters.candidate_id', '>', '')
        candidates = list(query.stream())
        
        candidate_list = []
        for candidate_doc in candidates:
            candidate_data = candidate_doc.to_dict()
            sr_data = candidate_data.get('smartrecruiters', {})
            
            candidate_list.append({
                "id": candidate_doc.id,
                "name": f"{candidate_data.get('first_name', '')} {candidate_data.get('last_name', '')}".strip(),
                "email": candidate_data.get('email'),
                "posting_uuid": sr_data.get('posting_uuid'),
                "sr_candidate_id": sr_data.get('candidate_id'),
                "status": sr_data.get('status'),
                "submitted_at": sr_data.get('submitted_at'),
                "last_sync": sr_data.get('last_sync')
            })
        
        return jsonify({
            "success": True,
            "candidates": candidate_list,
            "total": len(candidate_list)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing SmartRecruiters candidates: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/force-sync', methods=['POST'])
def force_sync_all():
    """Force sync all pending items with SmartRecruiters"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        data = request.json or {}
        sync_type = data.get('type', 'all')  # 'jobs', 'candidates', or 'all'
        
        results = {
            "jobs_synced": 0,
            "candidates_synced": 0,
            "errors": []
        }
        
        # Sync jobs
        if sync_type in ['jobs', 'all']:
            try:
                jobs_ref = sync_service.db.collection('jobs')
                query = jobs_ref.where('smartrecruiters.enabled', '==', True).where('smartrecruiters.sync_status', '!=', 'SYNCED')
                jobs = list(query.stream())
                
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    for job_doc in jobs:
                        try:
                            job_data = job_doc.to_dict()
                            loop.run_until_complete(
                                sync_service.sync_job_to_smartrecruiters(job_doc.id, job_data)
                            )
                            results["jobs_synced"] += 1
                        except Exception as e:
                            results["errors"].append(f"Job {job_doc.id}: {str(e)}")
                finally:
                    loop.close()
                    
            except Exception as e:
                results["errors"].append(f"Jobs sync error: {str(e)}")
        
        return jsonify({
            "success": True,
            "message": "Force sync completed",
            "results": results
        }), 200
        
    except Exception as e:
        logger.error(f"Force sync error: {str(e)}")
        return jsonify({"error": "Force sync failed"}), 500

@enhanced_sr_bp.route('/api/smartrecruiters/dashboard', methods=['GET'])
def get_sync_dashboard():
    """Get dashboard data for SmartRecruiters integration"""
    try:
        if not sync_service:
            return jsonify({"error": "SmartRecruiters service not configured"}), 503
        
        # Get jobs statistics
        jobs_ref = sync_service.db.collection('jobs')
        all_jobs = list(jobs_ref.stream())
        
        jobs_stats = {
            "total": len(all_jobs),
            "with_smartrecruiters": 0,
            "synced": 0,
            "pending": 0,
            "errors": 0
        }
        
        for job_doc in all_jobs:
            job_data = job_doc.to_dict()
            sr_data = job_data.get('smartrecruiters', {})
            
            if sr_data.get('enabled'):
                jobs_stats["with_smartrecruiters"] += 1
                
                sync_status = sr_data.get('sync_status', 'PENDING')
                if sync_status == 'SYNCED':
                    jobs_stats["synced"] += 1
                elif sync_status == 'ERROR':
                    jobs_stats["errors"] += 1
                else:
                    jobs_stats["pending"] += 1
        
        # Get candidates statistics
        candidates_ref = sync_service.db.collection('candidates')
        all_candidates = list(candidates_ref.stream())
        
        candidates_stats = {
            "total": len(all_candidates),
            "with_smartrecruiters": 0,
            "statuses": {}
        }
        
        for candidate_doc in all_candidates:
            candidate_data = candidate_doc.to_dict()
            sr_data = candidate_data.get('smartrecruiters', {})
            
            if sr_data.get('candidate_id'):
                candidates_stats["with_smartrecruiters"] += 1
                status = sr_data.get('status', 'UNKNOWN')
                candidates_stats["statuses"][status] = candidates_stats["statuses"].get(status, 0) + 1
        
        return jsonify({
            "success": True,
            "dashboard": {
                "jobs": jobs_stats,
                "candidates": candidates_stats,
                "last_updated": datetime.now().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return jsonify({"error": "Dashboard data unavailable"}), 500

# Error handlers
@enhanced_sr_bp.errorhandler(404)
def not_found(error):
    return jsonify({"error": "SmartRecruiters endpoint not found"}), 404

@enhanced_sr_bp.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "SmartRecruiters service error"}), 500
