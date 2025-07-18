import React, { useState } from 'react';
import { Container, Paper, Button, Typography, Box, LinearProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { jobId } = useParams();

  // Redirect to job selection if no job ID is provided
  React.useEffect(() => {
    if (!jobId) {
      navigate('/job-selection');
    }
  }, [jobId, navigate]);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a PDF file');
      setFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return null;
    }

    if (!jobId) {
      setError('No job selected');
      return null;
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return null;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return null;
    }

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
        const { id: resumeId } = response.data;
        return resumeId;
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Error uploading file');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resumeId = await handleFileUpload();
      if (!resumeId) {
        return;
      }

      console.log('Upload successful, navigating to evaluation page...');
      navigate(`/job/${jobId}/candidates/${resumeId}`);
    } catch (error) {
      console.error('Error during upload/navigation:', error);
      setError(error.response?.data?.message || 'Error processing your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Resume
        </Typography>
        
        {jobId && (
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            Uploading for Job ID: {jobId}
          </Typography>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            mt: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <input
            accept="application/pdf"
            style={{ display: 'none' }}
            id="resume-file"
            type="file"
            onChange={handleFileSelect}
            disabled={loading}
          />
          
          <label htmlFor="resume-file">
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Select PDF File
            </Button>
          </label>

          {file && (
            <Typography variant="body1" color="textSecondary">
              Selected file: {file.name}
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={!file || loading}
            sx={{ mt: 3 }}
          >
            Upload Resume
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResumeUpload;
