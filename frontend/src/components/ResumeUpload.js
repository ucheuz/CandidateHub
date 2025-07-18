import React, { useState } from 'react';
import { Container, Paper, Button, Typography, Box, LinearProgress } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const waitForEvaluation = async (jobId, resumeId, maxAttempts = 10) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`http://localhost:5000/api/evaluate/${jobId}/${resumeId}`);
        if (response.status === 200) {
          return true; // Evaluation is ready
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error; // If it's not a 404, something else is wrong
        }
      }
      // Wait 5 seconds before trying again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return false; // Evaluation not ready after all attempts
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF file or plain text document');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    if (!jobId) {
      alert('No job selected');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);

    try {
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      const response = await axios.post('http://localhost:5000/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 201) {
        const { id: resumeId, status, evaluation_id } = response.data;
        console.log('Upload response:', response.data);
        
        if (status === 'Evaluated' && evaluation_id) {
          setUploadStatus('Evaluation complete! Redirecting...');
          navigate(`/evaluation/${jobId}/${resumeId}`);
        } else {
          const errorMessage = response.data.error || 'Unknown error during evaluation';
          setUploadStatus(`Error during evaluation: ${errorMessage}`);
          alert(`The evaluation process failed: ${errorMessage}. Please try uploading the resume again.`);
        }
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert(`Error uploading resume: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Resume
        </Typography>
        <Paper elevation={3} sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              style={{ marginBottom: '20px' }}
            />
            {loading && (
              <>
                <LinearProgress sx={{ my: 2 }} />
                <Typography variant="body2" color="textSecondary" align="center" sx={{ my: 1 }}>
                  {uploadStatus || 'Uploading resume...'}
                </Typography>
              </>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!file || loading}
            >
              Upload and Evaluate
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResumeUpload;
