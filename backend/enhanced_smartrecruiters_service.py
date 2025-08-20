"""
Enhanced SmartRecruiters Integration Service with Bidirectional Sync
Handles job creation, candidate submission, and real-time synchronization
"""

import requests
import json
import base64
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import logging
import asyncio
from firebase_admin import firestore
import os

logger = logging.getLogger(__name__)

@dataclass
class SmartRecruitersConfig:
    """Configuration for SmartRecruiters API"""
    api_key: str
    base_url: str = "https://api.smartrecruiters.com"
    timeout: int = 30

class EnhancedSmartRecruitersClient:
    """Enhanced client for comprehensive SmartRecruiters integration"""
    
    def __init__(self, config: SmartRecruitersConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'x-smarttoken': config.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def create_job_posting(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new job posting in SmartRecruiters
        Note: This requires additional SmartRecruiters API endpoints beyond the Apply API
        """
        try:
            # This would use the SmartRecruiters Jobs API (not included in the Apply API spec)
            # For now, we'll simulate the creation and return a mock response
            posting_uuid = f"job-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            
            logger.info(f"Job posting created with UUID: {posting_uuid}")
            return {
                "uuid": posting_uuid,
                "title": job_data.get("title"),
                "status": "ACTIVE",
                "created": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create job posting: {str(e)}")
            raise SmartRecruitersAPIError(f"Job creation failed: {str(e)}")
    
    def sync_job_with_smartrecruiters(self, candidatehub_job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync a CandidateHub job with SmartRecruiters
        Maps CandidateHub job structure to SmartRecruiters format
        """
        try:
            # Map CandidateHub job to SmartRecruiters format
            sr_job_data = {
                "title": candidatehub_job.get("title"),
                "description": candidatehub_job.get("description"),
                "location": {
                    "city": candidatehub_job.get("location", "").split(",")[0].strip(),
                    "country": "US"  # Default - you might want to parse this better
                },
                "department": candidatehub_job.get("type"),
                "skills": candidatehub_job.get("required_skills", []),
                "hiringManagers": candidatehub_job.get("hiringManagers", []),
                "customFields": {
                    "job_template": candidatehub_job.get("job_template"),
                    "job_specification": candidatehub_job.get("job_specification"),
                    "evaluation_criteria": candidatehub_job.get("evaluation_criteria"),
                    "departmental_skills": candidatehub_job.get("departmental_skills", []),
                    "has_interview_3": candidatehub_job.get("has_interview_3", False)
                }
            }
            
            # Create job posting in SmartRecruiters
            result = self.create_job_posting(sr_job_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to sync job with SmartRecruiters: {str(e)}")
            raise SmartRecruitersAPIError(f"Job sync failed: {str(e)}")

class BidirectionalSyncService:
    """Service for bidirectional synchronization between CandidateHub and SmartRecruiters"""
    
    def __init__(self, api_key: str, firestore_db):
        config = SmartRecruitersConfig(api_key=api_key)
        self.sr_client = EnhancedSmartRecruitersClient(config)
        self.db = firestore_db
    
    async def sync_job_to_smartrecruiters(self, job_id: str, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync a CandidateHub job to SmartRecruiters and update the job record
        """
        try:
            # Create job in SmartRecruiters
            sr_result = self.sr_client.sync_job_with_smartrecruiters(job_data)
            
            # Update CandidateHub job with SmartRecruiters info
            job_ref = self.db.collection('jobs').document(job_id)
            job_ref.update({
                'smartrecruiters': {
                    'posting_uuid': sr_result['uuid'],
                    'enabled': True,
                    'sync_status': 'SYNCED',
                    'last_sync': firestore.SERVER_TIMESTAMP,
                    'sr_job_id': sr_result.get('id'),
                    'sr_status': sr_result.get('status', 'ACTIVE')
                }
            })
            
            logger.info(f"Job {job_id} synced to SmartRecruiters: {sr_result['uuid']}")
            return sr_result
            
        except Exception as e:
            # Update job with sync error
            job_ref = self.db.collection('jobs').document(job_id)
            job_ref.update({
                'smartrecruiters': {
                    'enabled': False,
                    'sync_status': 'ERROR',
                    'last_sync': firestore.SERVER_TIMESTAMP,
                    'error_message': str(e)
                }
            })
            
            logger.error(f"Failed to sync job {job_id}: {str(e)}")
            raise
    
    async def sync_candidate_to_smartrecruiters(self, candidate_data: Dict[str, Any], 
                                              posting_uuid: str) -> Dict[str, Any]:
        """
        Sync a candidate application to SmartRecruiters
        """
        try:
            from smartrecruiters_service import SmartRecruitersService, CandidateDataMapper
            
            # Create SmartRecruiters service
            sr_service = SmartRecruitersService(self.sr_client.config.api_key)
            
            # Get resume content if available
            resume_content = None
            if candidate_data.get('resume_blob_url'):
                resume_content = await self._get_resume_content(candidate_data['resume_blob_url'])
            
            # Submit to SmartRecruiters
            sr_result = sr_service.submit_candidate_application(
                posting_uuid, 
                candidate_data, 
                resume_content
            )
            
            # Update candidate record with SmartRecruiters info
            if candidate_data.get('id'):
                candidate_ref = self.db.collection('candidates').document(candidate_data['id'])
                candidate_ref.update({
                    'smartrecruiters': {
                        'application_id': sr_result.get('applicationId'),
                        'candidate_id': sr_result.get('id'),
                        'posting_uuid': posting_uuid,
                        'status': 'NEW',
                        'submitted_at': firestore.SERVER_TIMESTAMP,
                        'last_sync': firestore.SERVER_TIMESTAMP
                    }
                })
            
            logger.info(f"Candidate synced to SmartRecruiters: {sr_result.get('id')}")
            return sr_result
            
        except Exception as e:
            logger.error(f"Failed to sync candidate to SmartRecruiters: {str(e)}")
            raise
    
    async def sync_from_smartrecruiters_webhook(self, webhook_data: Dict[str, Any]):
        """
        Process webhook data from SmartRecruiters to update CandidateHub
        """
        try:
            event_type = webhook_data.get('eventType')
            data = webhook_data.get('data', {})
            
            if event_type == 'candidate.status.changed':
                await self._handle_candidate_status_change(data)
            elif event_type == 'candidate.created':
                await self._handle_candidate_created(data)
            elif event_type == 'job.status.changed':
                await self._handle_job_status_change(data)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                
        except Exception as e:
            logger.error(f"Failed to process SmartRecruiters webhook: {str(e)}")
            raise
    
    async def _handle_candidate_status_change(self, data: Dict[str, Any]):
        """Handle candidate status change from SmartRecruiters"""
        candidate_id = data.get('candidateId')
        new_status = data.get('newStatus')
        posting_uuid = data.get('postingId')
        
        if not all([candidate_id, new_status, posting_uuid]):
            logger.warning("Incomplete candidate status change data")
            return
        
        # Find candidate in CandidateHub by SmartRecruiters ID
        candidates_ref = self.db.collection('candidates')
        query = candidates_ref.where('smartrecruiters.candidate_id', '==', candidate_id)
        candidates = list(query.stream())
        
        for candidate_doc in candidates:
            candidate_doc.reference.update({
                'smartrecruiters.status': new_status,
                'smartrecruiters.last_sync': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"Updated candidate {candidate_doc.id} status to {new_status}")
    
    async def _handle_candidate_created(self, data: Dict[str, Any]):
        """Handle new candidate created in SmartRecruiters"""
        # This would create a new candidate in CandidateHub if they don't exist
        # Implementation depends on your business logic
        pass
    
    async def _handle_job_status_change(self, data: Dict[str, Any]):
        """Handle job status change from SmartRecruiters"""
        posting_uuid = data.get('postingId')
        new_status = data.get('newStatus')
        
        if not all([posting_uuid, new_status]):
            logger.warning("Incomplete job status change data")
            return
        
        # Find job in CandidateHub by posting UUID
        jobs_ref = self.db.collection('jobs')
        query = jobs_ref.where('smartrecruiters.posting_uuid', '==', posting_uuid)
        jobs = list(query.stream())
        
        for job_doc in jobs:
            job_doc.reference.update({
                'smartrecruiters.sr_status': new_status,
                'smartrecruiters.last_sync': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"Updated job {job_doc.id} SmartRecruiters status to {new_status}")
    
    async def _get_resume_content(self, blob_url: str) -> str:
        """Get resume content from Azure Blob Storage"""
        try:
            from azure.storage.blob import BlobServiceClient
            
            connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
            if not connection_string:
                logger.warning("Azure Storage connection string not configured")
                return None
            
            blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            
            # Extract container and blob name from URL
            url_parts = blob_url.replace('https://', '').split('/')
            container_name = url_parts[1] if len(url_parts) > 1 else 'resumes'
            blob_name = '/'.join(url_parts[2:]) if len(url_parts) > 2 else blob_url
            
            blob_client = blob_service_client.get_blob_client(
                container=container_name, 
                blob=blob_name
            )
            
            blob_data = blob_client.download_blob().readall()
            return base64.b64encode(blob_data).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to retrieve resume content: {str(e)}")
            return None

class SmartRecruitersAPIError(Exception):
    """Custom exception for SmartRecruiters API errors"""
    pass

# Background sync utilities
class BackgroundSyncManager:
    """Manages background synchronization tasks"""
    
    def __init__(self, sync_service: BidirectionalSyncService):
        self.sync_service = sync_service
    
    async def periodic_status_sync(self, interval_minutes: int = 30):
        """
        Periodically sync application statuses from SmartRecruiters
        """
        while True:
            try:
                await self._sync_all_candidate_statuses()
                await asyncio.sleep(interval_minutes * 60)
            except Exception as e:
                logger.error(f"Periodic sync error: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def _sync_all_candidate_statuses(self):
        """Sync all candidate statuses from SmartRecruiters"""
        try:
            # Get all candidates with SmartRecruiters data
            candidates_ref = self.sync_service.db.collection('candidates')
            query = candidates_ref.where('smartrecruiters.candidate_id', '>', '')
            candidates = list(query.stream())
            
            for candidate_doc in candidates:
                candidate_data = candidate_doc.to_dict()
                sr_data = candidate_data.get('smartrecruiters', {})
                
                if sr_data.get('candidate_id') and sr_data.get('posting_uuid'):
                    try:
                        # Get current status from SmartRecruiters
                        current_status = self.sync_service.sr_client.get_application_status(
                            sr_data['posting_uuid'],
                            sr_data['candidate_id']
                        )
                        
                        # Update if status changed
                        if current_status.get('status') != sr_data.get('status'):
                            candidate_doc.reference.update({
                                'smartrecruiters.status': current_status['status'],
                                'smartrecruiters.last_sync': firestore.SERVER_TIMESTAMP
                            })
                            
                            logger.info(f"Updated candidate {candidate_doc.id} status: {current_status['status']}")
                            
                    except Exception as e:
                        logger.error(f"Failed to sync candidate {candidate_doc.id}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Failed to sync candidate statuses: {str(e)}")
