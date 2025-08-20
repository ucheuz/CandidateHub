"""
SmartRecruiters API Integration Service
Handles all interactions with SmartRecruiters Apply API
"""

import requests
import json
import base64
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class SmartRecruitersConfig:
    """Configuration for SmartRecruiters API"""
    api_key: str
    base_url: str = "https://api.smartrecruiters.com"
    timeout: int = 30

class SmartRecruitersClient:
    """Client for SmartRecruiters Apply API"""
    
    def __init__(self, config: SmartRecruitersConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'x-smarttoken': config.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def get_posting_configuration(self, posting_uuid: str, language: str = "en", 
                                include_conditionals: bool = True) -> Dict[str, Any]:
        """
        Get application configuration for a posting
        Returns screening questions, privacy policies, and settings
        """
        try:
            url = f"{self.config.base_url}/postings/{posting_uuid}/configuration"
            params = {
                'conditionalsIncluded': include_conditionals
            }
            headers = {'Accept-Language': language}
            
            response = self.session.get(
                url, 
                params=params, 
                headers=headers,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            config_data = response.json()
            logger.info(f"Retrieved configuration for posting {posting_uuid}")
            return config_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get posting configuration: {str(e)}")
            raise SmartRecruitersAPIError(f"Configuration request failed: {str(e)}")
    
    def submit_application(self, posting_uuid: str, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit a candidate application to SmartRecruiters
        """
        try:
            url = f"{self.config.base_url}/postings/{posting_uuid}/candidates"
            
            # Validate required fields
            required_fields = ['firstName', 'lastName', 'email']
            for field in required_fields:
                if field not in application_data:
                    raise ValueError(f"Required field '{field}' is missing")
            
            response = self.session.post(
                url,
                json=application_data,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Application submitted successfully: {result.get('id')}")
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to submit application: {str(e)}")
            raise SmartRecruitersAPIError(f"Application submission failed: {str(e)}")
    
    def get_application_status(self, posting_uuid: str, candidate_id: str) -> Dict[str, Any]:
        """
        Get the status of a candidate application
        """
        try:
            url = f"{self.config.base_url}/postings/{posting_uuid}/candidates/{candidate_id}/status"
            
            response = self.session.get(url, timeout=self.config.timeout)
            response.raise_for_status()
            
            status_data = response.json()
            logger.info(f"Retrieved status for candidate {candidate_id}: {status_data.get('status')}")
            return status_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get application status: {str(e)}")
            raise SmartRecruitersAPIError(f"Status request failed: {str(e)}")

class CandidateDataMapper:
    """Maps CandidateHub data to SmartRecruiters format"""
    
    @staticmethod
    def map_candidate_to_smartrecruiters(candidate_data: Dict[str, Any], 
                                       resume_file_content: Optional[str] = None) -> Dict[str, Any]:
        """
        Convert CandidateHub candidate data to SmartRecruiters application format
        """
        application = {
            "firstName": candidate_data.get("first_name", ""),
            "lastName": candidate_data.get("last_name", ""),
            "email": candidate_data.get("email", ""),
            "phoneNumber": candidate_data.get("phone", ""),
            "messageToHiringManager": candidate_data.get("cover_letter", ""),
        }
        
        # Add location if available
        if candidate_data.get("location"):
            application["location"] = {
                "city": candidate_data["location"].get("city", ""),
                "country": candidate_data["location"].get("country", ""),
                "countryCode": candidate_data["location"].get("country_code", "")
            }
        
        # Add web profiles
        if candidate_data.get("social_profiles"):
            web_profiles = candidate_data["social_profiles"]
            application["web"] = {
                "linkedIn": web_profiles.get("linkedin", ""),
                "website": web_profiles.get("website", ""),
                "twitter": web_profiles.get("twitter", "")
            }
        
        # Add education
        if candidate_data.get("education"):
            application["education"] = [
                {
                    "institution": edu.get("institution", ""),
                    "degree": edu.get("degree", ""),
                    "major": edu.get("major", ""),
                    "startDate": edu.get("start_date", ""),
                    "endDate": edu.get("end_date", ""),
                    "current": edu.get("current", False)
                }
                for edu in candidate_data["education"]
            ]
        
        # Add work experience
        if candidate_data.get("experience"):
            application["experience"] = [
                {
                    "title": exp.get("title", ""),
                    "company": exp.get("company", ""),
                    "location": exp.get("location", ""),
                    "description": exp.get("description", ""),
                    "startDate": exp.get("start_date", ""),
                    "endDate": exp.get("end_date", ""),
                    "current": exp.get("current", False)
                }
                for exp in candidate_data["experience"]
            ]
        
        # Add resume attachment
        if resume_file_content and candidate_data.get("resume_filename"):
            application["resume"] = {
                "fileName": candidate_data["resume_filename"],
                "mimeType": candidate_data.get("resume_mime_type", "application/pdf"),
                "fileContent": resume_file_content
            }
        
        # Add screening question answers
        if candidate_data.get("screening_answers"):
            application["answers"] = [
                {
                    "id": answer["question_id"],
                    "records": [
                        {
                            "fields": {
                                answer["field_id"]: [answer["value"]]
                            }
                        }
                    ]
                }
                for answer in candidate_data["screening_answers"]
            ]
        
        # Add consent decisions
        if candidate_data.get("consent_decisions"):
            application["consentDecisions"] = candidate_data["consent_decisions"]
        
        return application

class SmartRecruitersService:
    """High-level service for SmartRecruiters integration"""
    
    def __init__(self, api_key: str):
        config = SmartRecruitersConfig(api_key=api_key)
        self.client = SmartRecruitersClient(config)
        self.mapper = CandidateDataMapper()
    
    def get_job_application_config(self, posting_uuid: str) -> Dict[str, Any]:
        """Get application configuration for a job posting"""
        return self.client.get_posting_configuration(posting_uuid)
    
    def submit_candidate_application(self, posting_uuid: str, candidate_data: Dict[str, Any],
                                   resume_content: Optional[str] = None) -> Dict[str, Any]:
        """Submit a candidate application"""
        # Map CandidateHub data to SmartRecruiters format
        application_data = self.mapper.map_candidate_to_smartrecruiters(
            candidate_data, resume_content
        )
        
        # Submit to SmartRecruiters
        return self.client.submit_application(posting_uuid, application_data)
    
    def check_application_status(self, posting_uuid: str, candidate_id: str) -> str:
        """Get application status"""
        status_data = self.client.get_application_status(posting_uuid, candidate_id)
        return status_data.get("status", "UNKNOWN")

class SmartRecruitersAPIError(Exception):
    """Custom exception for SmartRecruiters API errors"""
    pass

# Utility functions
def encode_file_to_base64(file_path: str) -> str:
    """Encode a file to base64 for SmartRecruiters API"""
    with open(file_path, 'rb') as file:
        return base64.b64encode(file.read()).decode('utf-8')

def validate_posting_uuid(uuid_string: str) -> bool:
    """Validate SmartRecruiters posting UUID format"""
    import re
    pattern = r'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
    return bool(re.match(pattern, uuid_string))
