import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Grid, 
  Button,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Alert,
  Divider,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import LaunchIcon from '@mui/icons-material/Launch';
import WorkIcon from '@mui/icons-material/Work';
import axios from 'axios';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Evaluation = () => {
  const [evaluation, setEvaluation] = useState({ summary: '', detail: '' });
  const [candidate, setCandidate] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { jobId, resumeId } = useParams();
  const navigate = useNavigate();

  const maxRetries = 10;
  const retryInterval = 5000;

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

  // Fetch candidate details
  useEffect(() => {
    const fetchCandidate = async () => {
      if (resumeId) {
        try {
          const candidateDoc = await getDoc(doc(db, 'candidates', resumeId));
          if (candidateDoc.exists()) {
            setCandidate({ id: candidateDoc.id, ...candidateDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching candidate details:', error);
        }
      }
    };

    fetchCandidate();
  }, [resumeId]);

  useEffect(() => {
    let retryTimeout;

    const fetchEvaluation = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/evaluate/${jobId}/${resumeId}`);
        setEvaluation({
          summary: response.data.summary,
          detail: response.data.detail
        });
        setError(null);
        setLoading(false);
      } catch (error) {
        console.log('Attempt', retryCount + 1, 'failed:', error);
        
        if (error.response?.status === 404 && retryCount < maxRetries) {
          // If evaluation is not ready yet, retry after delay
          setRetryCount(prev => prev + 1);
          retryTimeout = setTimeout(fetchEvaluation, retryInterval);
          setError(`Evaluation in progress... (Attempt ${retryCount + 1}/${maxRetries})`);
        } else {
          console.error('Error fetching evaluation:', error);
          setError('Failed to fetch evaluation. The evaluation process may have failed.');
          setLoading(false);
        }
      }
    };

    fetchEvaluation();

    // Cleanup function to clear any pending timeouts
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [jobId, resumeId, retryCount]);

  const handleRetry = () => {
    setRetryCount(0);
    setLoading(true);
    setError(null);
  };

  const handleViewProfile = () => {
    navigate(`/candidates/${resumeId}`);
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#f44336';
    return '#9e9e9e';
  };

  const getMatchScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'transparent' }}>
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Processing Candidate Resume
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Please wait while we analyze the resume and generate the evaluation...
            </Typography>
            {error && (
              <Alert severity="info" sx={{ mt: 2, maxWidth: 400 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Paper>
      </Container>
    );
  }

  if (error && !loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'transparent' }}>
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="error">
              Evaluation Failed
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ borderRadius: 2 }}
            >
              Retry Evaluation
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'transparent' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" href="/dashboard" underline="hover">
            Dashboard
          </Link>
          <Link color="inherit" href="/job-selection" underline="hover">
            Add Candidate
          </Link>
          <Typography color="text.primary">Evaluation Results</Typography>
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
              gap: 2,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            <AssessmentIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
            Candidate Evaluation Complete
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            AI-powered analysis of the candidate's resume and qualifications.
          </Typography>
        </Box>

        {/* Success Alert */}
        <Alert 
          severity="success" 
          icon={<CheckCircleIcon />}
          sx={{ mb: 4, borderRadius: 2 }}
        >
          Resume successfully processed and evaluated! Review the analysis below.
        </Alert>

        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Left Column - Evaluation Results */}
          <Grid item xs={12} lg={8}>
            <Stack spacing={3}>
              {/* Candidate Info Card */}
              {candidate && (
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <PersonIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Candidate Information
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {candidate.name || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {candidate.email || 'Not specified'}
                        </Typography>
                      </Grid>
                      {candidate.cv_match_score && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            CV Match Score
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip
                              label={`${candidate.cv_match_score}%`}
                              sx={{
                                bgcolor: getMatchScoreColor(candidate.cv_match_score),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {getMatchScoreLabel(candidate.cv_match_score)}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Job Info Card */}
              {jobDetails && (
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <WorkIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Position Details
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                      {jobDetails.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {jobDetails.location} • {jobDetails.type}
                    </Typography>
                    {jobDetails.required_skills && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Array.isArray(jobDetails.required_skills) ? (
                          jobDetails.required_skills.slice(0, 5).map((skill, index) => (
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

              {/* Evaluation Summary Card */}
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <AssessmentIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Evaluation Summary
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body1" 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      fontFamily: 'inherit'
                    }}
                  >
                    {evaluation.summary}
                  </Typography>
                  
                  <Divider sx={{ my: 3 }} />

                  <Box display="flex" justifyContent="center">
                    <Button
                      variant="outlined"
                      onClick={() => setShowDetails(!showDetails)}
                      endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      {showDetails ? 'Hide Detailed Analysis' : 'Show Detailed Analysis'}
                    </Button>
                  </Box>

                  {showDetails && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Detailed Analysis
                      </Typography>
                      <Typography 
                        variant="body1" 
                        component="pre" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                          fontFamily: 'inherit',
                          bgcolor: 'grey.50',
                          p: 2,
                          borderRadius: 1
                        }}
                      >
                        {evaluation.detail}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Right Column - Actions */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ borderRadius: 2, position: 'sticky', top: 20 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Next Steps
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Review the evaluation results and proceed with the candidate management.
                </Typography>
                
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleViewProfile}
                    startIcon={<LaunchIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1.5
                    }}
                  >
                    View Candidate Profile
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/candidates')}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1.5
                    }}
                  >
                    All Candidates
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/job-selection')}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1.5
                    }}
                  >
                    Add Another Candidate
                  </Button>
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  The candidate has been added to your hiring pipeline and can now be managed through the candidate profile.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Evaluation;
