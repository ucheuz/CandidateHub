import React, { useState } from 'react';
import { Container, Paper, Button, Typography, Box, LinearProgress } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document');
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
        const resumeId = response.data.id;
        console.log('Upload successful. Resume ID:', resumeId);
        navigate(`/evaluation/${jobId}/${resumeId}`);
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
            {loading && <LinearProgress sx={{ my: 2 }} />}
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
