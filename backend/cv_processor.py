import google.generativeai as genai
import os
from PyPDF2 import PdfReader
import io

def extract_text_from_pdf(pdf_bytes):
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return ""

def get_cv_summary(pdf_bytes):
    try:
        # Extract text from PDF
        cv_text = extract_text_from_pdf(pdf_bytes)
        if not cv_text:
            return "Unable to extract text from CV"
        
        # Configure Gemini
        api_key = os.getenv('GEMINI_API_KEY')  # Use same env var as app.py
        if not api_key:
            print("No Gemini API key found")
            return "Error: No API key configured"
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash-8b')
        
        # First try to find an existing summary
        find_summary_prompt = f"""
        Analyze this CV text and find if there is a "Summary", "Professional Summary", 
        "Profile", "About Me", or similar section at the beginning. If found, return ONLY 
        that section's text. If no such section exists, respond with "NO_SUMMARY_FOUND".
        
        CV Text:
        {cv_text[:2000]}  # Limit text to avoid token limits
        """
        
        try:
            summary_response = model.generate_content(find_summary_prompt)
            if not summary_response:
                raise Exception("No response from Gemini API")
            
            summary = summary_response.text.strip()
            
            if not summary or summary == "NO_SUMMARY_FOUND":
                # Generate a summary using Gemini
                generate_prompt = f"""
                Create a professional 3-4 sentence summary from this CV that highlights:
                1. Years of experience and current role/level
                2. Key technical skills and expertise areas
                3. Most significant achievements or specializations
                4. (Optional) Industry focus or notable companies/projects
                
                Keep it factual and professional. Focus only on information present in the CV.
                
                CV Text:
                {cv_text[:3000]}  # Allow more text for summary generation
                """
                
                summary_response = model.generate_content(generate_prompt)
                if not summary_response:
                    raise Exception("No response from Gemini API")
                
                summary = summary_response.text.strip()
            
            return summary if summary else "Unable to generate summary"
            
        except Exception as e:
            print(f"Error in Gemini API call: {str(e)}")
            return f"Error generating summary: {str(e)}"
            
    except Exception as e:
        print(f"Error in CV summary generation: {str(e)}")
        return "Error processing CV"
