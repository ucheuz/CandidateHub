import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Button, 
  Typography, 
  Box, 
  LinearProgress, 
  Alert,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import axiosInstance from '../api/axiosInstance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteIcon from '@mui/icons-material/Delete';
import WorkIcon from '@mui/icons-material/Work';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const { jobId } = useParams();

  // Fetch job details
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (jobId) {
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', jobId));
          if (jobDoc.exists()) {
            setJobDetails({ id: jobDoc.id, ...jobDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching job details:', error);
        }
      }
    };

    fetchJobDetails();
  }, [jobId]);

  // Redirect to job selection if no job ID is provided
  useEffect(() => {
    if (!jobId) {
      navigate('/job-selection');
    }
  }, [jobId, navigate]);

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please select a PDF file');
      setFile(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      const response = await axiosInstance.post('/api/resume/upload', formData);

      if (response.status === 201) {
        const { id: resumeId } = response.data;
        setSuccess(true);
        setTimeout(() => {
          navigate(`/evaluation/${jobId}/${resumeId}`);
        }, 1500);
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
    setSuccess(false);

    try {
      const resumeId = await handleFileUpload();
      if (!resumeId) {
        return;
      }

      console.log('Upload successful, navigating to evaluation page...');
    } catch (error) {
      console.error('Error during upload/navigation:', error);
      setError(error.response?.data?.message || 'Error processing your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={0} sx={{ p: 4, backgroundColor: 'transparent' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" href="/dashboard" underline="hover">
            Dashboard
          </Link>
          <Link color="inherit" href="/job-selection" underline="hover">
            Add Candidate
          </Link>
          <Typography color="text.primary">Upload Resume</Typography>
        </Breadcrumbs>

        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            Upload Candidate Resume
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload a PDF resume to add a new candidate to your hiring pipeline.
          </Typography>
        </Box>

        {/* Job Info Card */}
        {jobDetails && (
          <Card elevation={2} sx={{ mb: 4, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WorkIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {jobDetails.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {jobDetails.description}
              </Typography>
              {jobDetails.required_skills && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Array.isArray(jobDetails.required_skills) ? (
                    jobDetails.required_skills.map((skill, index) => (
                      <Chip
                        key={index}
                        label={skill}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {jobDetails.required_skills}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Section */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            border: '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            backgroundColor: dragActive ? 'action.hover' : 'background.paper',
            transition: 'all 0.3s ease'
          }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3
            }}
          >
            {/* File Input */}
            <input
              accept="application/pdf"
              style={{ display: 'none' }}
              id="resume-file"
              type="file"
              onChange={handleFileSelect}
              disabled={loading}
            />

            {/* Upload Area */}
            {!file && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                  Drop your resume here or click to browse
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  PDF files only, max 10MB
                </Typography>
                <label htmlFor="resume-file">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={loading}
                    size="large"
                    sx={{ 
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    Select PDF File
                  </Button>
                </label>
              </Box>
            )}

            {/* File Preview */}
            {file && (
              <Card 
                elevation={1} 
                sx={{ 
                  width: '100%', 
                  maxWidth: 500,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <InsertDriveFileIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                    <IconButton 
                      onClick={removeFile}
                      size="small"
                      disabled={loading}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  {success && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="body2" color="success.main">
                        Upload successful! Redirecting to evaluation...
                      </Typography>
                    </Box>
                  )}
                  
                  {loading && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress sx={{ borderRadius: 1 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Uploading and processing resume...
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                icon={<ErrorIcon />}
                sx={{ 
                  width: '100%', 
                  maxWidth: 500,
                  borderRadius: 2
                }}
              >
                {error}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 500, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/job-selection')}
                disabled={loading}
                size="large"
                sx={{ 
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none'
                }}
              >
                Back to Job Selection
              </Button>
              <Button
                variant="contained"
                type="submit"
                disabled={!file || loading || success}
                size="large"
                sx={{ 
                  px: 4,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {loading ? 'Uploading...' : success ? 'Uploaded!' : 'Upload Resume'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Help Section */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Need help? Make sure your resume is in PDF format and under 10MB.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResumeUpload;
