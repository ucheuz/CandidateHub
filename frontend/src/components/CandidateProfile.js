import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Grid, 
  Box,
  Chip,
  CircularProgress,
  Divider,
  Tab,
  Tabs,
  Card,
  CardContent,
  Alert,
  Avatar,
  Button,
  Rating,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Snackbar,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
} from '@mui/material';
import { 
  Person as PersonIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Comment as CommentIcon,
  Timeline as TimelineIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Star as StarIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  Cancel as CancelIcon,
  Call as CallIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import NotesHub from './NotesHubNew';

dayjs.extend(relativeTime);

const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return 'recently';
  if (timestamp.seconds) {
    return dayjs(new Date(timestamp.seconds * 1000)).fromNow();
  }
  return dayjs(timestamp).fromNow();
};

const CandidateProfile = () => {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRejectReason, setSelectedRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showDetailedEvaluation, setShowDetailedEvaluation] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch candidate data');
        }
        const data = await response.json();
        setCandidate(data);
        
        // Fetch job information if candidate has a job_id
        if (data.job_id) {
          try {
            const jobResponse = await fetch(`http://localhost:5000/api/job/${data.job_id}`);
            if (jobResponse.ok) {
              const jobData = await jobResponse.json();
              setJob(jobData);
            }
          } catch (jobError) {
            console.error('Error fetching job data:', jobError);
            // Don't fail the whole component if job fetch fails
          }
        }
      } catch (err) {
        console.error('Error fetching candidate:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  // Check if manager rating is missing and show dialog
  useEffect(() => {
    if (candidate && (!candidate.manager_rating && !candidate.managerRating)) {
      // Show rating dialog after a short delay to allow UI to load
      const timer = setTimeout(() => {
        setRatingDialogOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [candidate]);

  const getMatchScoreColor = (score) => {
    if (score >= 80) return '#4caf50'; // Green
    if (score >= 60) return '#ff9800'; // Orange
    if (score >= 40) return '#f44336'; // Red
    return '#9e9e9e'; // Grey
  };

  const getMatchScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
  };

  const rejectionReasons = [
    'Did not fit company culture',
    'Did not meet desired qualifications',
    'Did not meet minimum qualifications',
    'Did not meet screening requirements',
    'Incomplete application',
    'Ineligible to work in location',
    'Misrepresented qualifications',
    'More qualified candidate selected',
    'No show for interview',
    'Unresponsive',
    'High Remuneration Expectations',
    'Overqualified',
    'Background Checks',
    'Unsuccessful Skills Assessment',
    'Other'
  ];

  const getHiringSteps = (hasInterview3) => {
    const baseSteps = [
      'Application',
      'Initial Review',
      'Phone Screen',
      'Interview 1',
      'Interview 2'
    ];
    
    if (hasInterview3) {
      return [...baseSteps, 'Interview 3', 'Decision'];
    }
    
    return [...baseSteps, 'Decision'];
  };

  const getStageMapping = (hasInterview3) => {
    const baseMapping = {
      'NEW': 0,
      'Evaluated': 1,
      'Phone Screen': 2,
      'Interview 1': 3,
      'Interview 2': 4,
      'Hired': hasInterview3 ? 6 : 5,
      'Rejected': -1
    };
    
    if (hasInterview3) {
      baseMapping['Interview 3'] = 5;
    }
    
    return baseMapping;
  };

  const getStages = (hasInterview3) => {
    const baseStages = ['NEW', 'Evaluated', 'Phone Screen', 'Interview 1', 'Interview 2'];
    
    if (hasInterview3) {
      return [...baseStages, 'Interview 3', 'Hired'];
    }
    
    return [...baseStages, 'Hired'];
  };

  // Get dynamic values based on job configuration
  const hiringSteps = getHiringSteps(job?.has_interview_3);
  const stageMapping = getStageMapping(job?.has_interview_3);
  const stages = getStages(job?.has_interview_3);

  const getCurrentStep = (status) => {
    return stageMapping[status] || 0;
  };

  const getNextStage = (currentStage) => {
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      return stages[currentIndex + 1];
    }
    return currentStage;
  };

  const updateCandidateStage = async (newStage, rejectionReason = null) => {
    setUpdating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: newStage,
          rejectionReason: rejectionReason
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update candidate stage');
      }

      const updatedCandidate = await response.json();
      setCandidate(prev => ({ ...prev, status: newStage }));
      setSnackbarMessage(
        newStage === 'Rejected' 
          ? 'Candidate has been rejected' 
          : `Candidate moved to ${newStage} stage`
      );
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error updating candidate stage:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMoveToNext = () => {
    const nextStage = getNextStage(candidate.status);
    updateCandidateStage(nextStage);
  };

  const handleReject = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    const finalRejectReason = selectedRejectReason === 'Other' ? customRejectReason : selectedRejectReason;
    updateCandidateStage('Rejected', finalRejectReason);
    setRejectDialogOpen(false);
    setSelectedRejectReason('');
    setCustomRejectReason('');
    setRejectReason('');
  };

  const handleRejectCancel = () => {
    setRejectDialogOpen(false);
    setSelectedRejectReason('');
    setCustomRejectReason('');
    setRejectReason('');
  };

  const handleRejectReasonChange = (event) => {
    setSelectedRejectReason(event.target.value);
    if (event.target.value !== 'Other') {
      setCustomRejectReason('');
    }
  };

  const isRejectFormValid = () => {
    if (!selectedRejectReason) return false;
    if (selectedRejectReason === 'Other' && !customRejectReason.trim()) return false;
    return true;
  };

  const handlePhoneCall = () => {
    setPhoneDialogOpen(true);
  };

  const handleCallCompleted = (moveToNext) => {
    setPhoneDialogOpen(false);
    if (moveToNext) {
      updateCandidateStage('Interview 1');
    }
  };

  const handleCallNotCompleted = () => {
    setPhoneDialogOpen(false);
    setSnackbarMessage('Call not completed. Candidate remains in current stage.');
    setSnackbarOpen(true);
  };

  const handleRatingSubmit = async () => {
    if (pendingRating === 0) {
      setSnackbarMessage('Please select a rating before submitting');
      setSnackbarOpen(true);
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}/rating`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: pendingRating,
          comment: ratingComment.trim() || null,
          ratedBy: 'Current User',
          ratedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update candidate rating');
      }

      // Update local state
      setCandidate(prev => ({ 
        ...prev, 
        manager_rating: pendingRating,
        managerRating: pendingRating,  // Also update the camelCase version for consistency
        rating_comment: ratingComment.trim() || null 
      }));
      
      setRatingDialogOpen(false);
      setPendingRating(0);
      setRatingComment('');
      setSnackbarMessage('Candidate rating updated successfully');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error updating candidate rating:', err);
      setSnackbarMessage('Failed to update rating. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setUpdating(false);
    }
  };

  const handleRatingCancel = () => {
    setRatingDialogOpen(false);
    setPendingRating(0);
    setRatingComment('');
  };

  const handleRatingLater = () => {
    setRatingDialogOpen(false);
    setPendingRating(0);
    setRatingComment('');
    setSnackbarMessage('You can rate this candidate later from the profile page');
    setSnackbarOpen(true);
  };

  const handleAnalyzeSentiment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}/sentiment-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }
      
      const sentimentData = await response.json();
      
      // Update candidate state with new sentiment data
      setCandidate(prev => ({
        ...prev,
        feedback_sentiment: sentimentData.sentiment,
        feedback_summary: sentimentData.summary,
        feedback_confidence: sentimentData.confidence,
        interviewers: sentimentData.interviewers || [],
        interviewer_count: sentimentData.interviewer_count || 0,
        key_themes: sentimentData.key_themes || [],
        consensus_level: sentimentData.consensus_level,
        interviewer_insights: sentimentData.interviewer_insights
      }));
      
      setSnackbarMessage(
        `Feedback sentiment analysis completed successfully. Analyzed feedback from ${sentimentData.interviewer_count || 0} interviewer(s).`
      );
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      setSnackbarMessage('Failed to analyze sentiment. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const TabPanel = ({ children, value, index, ...other }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`candidate-tabpanel-${index}`}
        aria-labelledby={`candidate-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ pt: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          Error loading candidate: {error}
        </Alert>
      </Container>
    );
  }

  if (!candidate) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mt: 4 }}>
          Candidate not found
        </Alert>
      </Container>
    );
  }

  const isUnknownCandidate = candidate.name === 'Unknown Candidate';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Card sx={{ mb: 4, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={2}>
              <Avatar
                sx={{ 
                  width: 100, 
                  height: 100, 
                  bgcolor: '#0C3F05',
                  color: 'white',
                  fontSize: '2rem',
                  fontWeight: 'bold'
                }}
              >
                {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Avatar>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ color: '#343a40', fontWeight: 'bold', mb: 1 }}>
                {candidate.name}
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip
                  label={candidate.status}
                  sx={{
                    bgcolor: candidate.status === 'Evaluated' ? '#0C3F05' :
                             candidate.status === 'Processing' ? '#ffc107' :
                             candidate.status === 'Failed' ? '#dc3545' : '#6c757d',
                    color: 'white',
                    fontWeight: 'bold',
                    '& .MuiChip-label': {
                      color: 'white'
                    }
                  }}
                />
                <Typography variant="body1" sx={{ color: '#6c757d' }}>
                  Added {formatFirestoreTimestamp(candidate.upload_date)}
                </Typography>
              </Stack>

              {candidate.email && (
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <EmailIcon sx={{ color: '#6c757d', mr: 1 }} />
                  <Typography variant="body1" sx={{ color: '#495057' }}>
                    {candidate.email}
                  </Typography>
                </Box>
              )}

              {candidate.phone && (
                <Box display="flex" alignItems="center">
                  <PhoneIcon sx={{ color: '#6c757d', mr: 1 }} />
                  <Typography variant="body1" sx={{ color: '#495057' }}>
                    {candidate.phone}
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'white', boxShadow: 1, border: '1px solid #e9ecef' }}>
                    <Typography variant="h4" sx={{ color: '#0C3F05', fontWeight: 'bold' }}>
                      {candidate.cv_match_score || 0}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6c757d' }}>
                      CV Match Score
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'white', boxShadow: 1, border: '1px solid #e9ecef' }}>
                    <Rating 
                      value={candidate.managerRating || candidate.manager_rating || 0} 
                      readOnly 
                      sx={{ 
                        color: '#0C3F05',
                        '& .MuiRating-iconFilled': {
                          color: '#0C3F05',
                        }
                      }}
                    />
                    <Typography variant="body2" sx={{ color: '#6c757d' }}>
                      Manager Rating
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {isUnknownCandidate && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          The candidate's name could not be automatically extracted from their resume. 
          You may need to manually update their information.
        </Alert>
      )}
      
      {candidate.status === 'Processing' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          The candidate's profile is still being processed. Evaluation results will appear soon.
        </Alert>
      )}
      
      {candidate.status === 'Failed' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          There was an error processing this candidate's profile. 
          {candidate.error && `: ${candidate.error}`}
        </Alert>
      )}

      {candidate.status === 'Rejected' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          This candidate has been rejected from the hiring process.
          {candidate.rejectionReason && ` Reason: ${candidate.rejectionReason}`}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3, bgcolor: 'white', boxShadow: 1, border: '1px solid #e9ecef' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: '#e9ecef',
            '& .MuiTab-root': {
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 600,
              minHeight: 64,
              color: '#6c757d',
              '&.Mui-selected': {
                color: '#0C3F05',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#0C3F05',
            }
          }}
        >
          <Tab 
            icon={<DescriptionIcon />} 
            label="CV" 
            iconPosition="start"
          />
          <Tab 
            icon={<AssessmentIcon />} 
            label="AI Evaluation" 
            iconPosition="start"
          />
          <Tab 
            icon={<CommentIcon />} 
            label="Collaborative Notes" 
            iconPosition="start"
          />
          <Tab 
            icon={<TimelineIcon />} 
            label="Hiring Pipeline" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <Card sx={{ bgcolor: 'white', boxShadow: 2 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ 
              bgcolor: '#f8f9fa', 
              color: '#343a40', 
              p: 2, 
              display: 'flex', 
              alignItems: 'center',
              borderBottom: '1px solid #e9ecef'
            }}>
              <DescriptionIcon sx={{ mr: 2, color: '#0C3F05' }} />
              <Typography variant="h6" sx={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                CV Viewer
              </Typography>
            </Box>
            <Box sx={{ height: '70vh', overflow: 'hidden' }}>
              <iframe
                src={`http://localhost:5000/api/resume/${candidate?.resume_blob_path}`}
                title="Resume Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'white', boxShadow: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon sx={{ mr: 1, color: '#0C3F05' }} />
                  <Typography variant="h6" sx={{ color: '#343a40' }}>Match Analysis</Typography>
                </Box>
                
                <Box textAlign="center" mb={3}>
                  <Typography variant="h2" sx={{ 
                    color: getMatchScoreColor(candidate.cv_match_score || 0),
                    fontWeight: 'bold'
                  }}>
                    {candidate.cv_match_score || 0}%
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    {getMatchScoreLabel(candidate.cv_match_score || 0)}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={candidate.cv_match_score || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#e9ecef',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getMatchScoreColor(candidate.cv_match_score || 0),
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: 'white', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#0C3F05' }}>
                  AI Evaluation
                </Typography>
                {candidate.evaluation ? (
                  <Box>
                    <Typography variant="body1" paragraph sx={{ lineHeight: 1.6 }}>
                      {candidate.evaluation.summary}
                    </Typography>
                    
                    {/* Expandable Detailed Analysis */}
                    {candidate.evaluation.detail && (
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setShowDetailedEvaluation(!showDetailedEvaluation)}
                          sx={{ 
                            mb: 2, 
                            color: '#0C3F05',
                            borderColor: '#0C3F05',
                            '&:hover': {
                              borderColor: '#0C3F05',
                              backgroundColor: '#f5f5f5'
                            }
                          }}
                          startIcon={showDetailedEvaluation ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        >
                          {showDetailedEvaluation ? 'Show Less' : 'See More Details'}
                        </Button>
                        
                        <Collapse in={showDetailedEvaluation}>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: '#f8f9fa',
                            borderRadius: 1,
                            border: '1px solid #e9ecef'
                          }}>
                            <Typography variant="h6" sx={{ mb: 1.5, color: '#0C3F05' }}>
                              Detailed Analysis
                            </Typography>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                              {candidate.evaluation.detail}
                            </Typography>
                          </Box>
                        </Collapse>
                      </Box>
                    )}
                    
                    {/* Feedback Sentiment Analysis */}
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1.5, color: '#0C3F05' }}>
                        Saved Feedback Sentiment Analysis
                      </Typography>
                      {candidate.feedback_summary ? (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              Overall Sentiment:
                            </Typography>
                            <Chip 
                              label={candidate.feedback_sentiment || 'Neutral'} 
                              size="small"
                              sx={{
                                backgroundColor: 
                                  candidate.feedback_sentiment === 'Positive' ? '#4caf50' :
                                  candidate.feedback_sentiment === 'Negative' ? '#f44336' : '#9e9e9e',
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                            {candidate.feedback_confidence && (
                              <Typography variant="body2" sx={{ ml: 1, color: '#666' }}>
                                (Confidence: {Math.round(candidate.feedback_confidence * 100)}%)
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Interviewer Information */}
                          {candidate.interviewers && candidate.interviewers.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                                Feedback from {candidate.interviewer_count} interviewer(s):
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {candidate.interviewers.map((interviewer, index) => (
                                  <Chip
                                    key={index}
                                    label={interviewer}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      height: '24px',
                                      color: '#0C3F05',
                                      borderColor: '#0C3F05'
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          
                          <Typography variant="body2" sx={{ 
                            lineHeight: 1.6, 
                            backgroundColor: '#f8f9fa',
                            p: 1.5,
                            borderRadius: 1,
                            border: '1px solid #e9ecef'
                          }}>
                            {candidate.feedback_summary}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            No saved feedback analysis available. Click to analyse saved feedback notes.
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={handleAnalyzeSentiment}
                            sx={{ 
                              color: '#0C3F05',
                              borderColor: '#0C3F05',
                              '&:hover': {
                                borderColor: '#0C3F05',
                                backgroundColor: '#f5f5f5'
                              }
                            }}
                          >
                            Analyse Saved Feedback
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="info">
                    AI evaluation is not available for this candidate yet.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Card sx={{ bgcolor: 'white', boxShadow: 2 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ 
              bgcolor: '#f8f9fa', 
              color: '#343a40', 
              p: 2, 
              display: 'flex', 
              alignItems: 'center',
              borderBottom: '1px solid #e9ecef'
            }}>
              <CommentIcon sx={{ mr: 2, color: '#0C3F05' }} />
              <Typography variant="h6" sx={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Collaborative Notes & Feedback
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <NotesHub candidateId={candidateId} onNoteSaved={handleAnalyzeSentiment} />
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Card sx={{ bgcolor: 'white', boxShadow: 2 }}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3 
            }}>
              <TimelineIcon sx={{ mr: 2, color: '#0C3F05' }} />
              <Typography variant="h6" sx={{ color: '#343a40' }}>Hiring Pipeline Progress</Typography>
            </Box>
            
            {candidate.status === 'Rejected' ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Candidate Rejected
                </Typography>
                <Typography variant="body2">
                  This candidate has been removed from the hiring pipeline.
                  {candidate.rejectionReason && ` Reason: ${candidate.rejectionReason}`}
                </Typography>
              </Alert>
            ) : (
              <>
                <Stepper 
                  activeStep={getCurrentStep(candidate.status)} 
                  alternativeLabel
                  sx={{ mb: 4 }}
                >
                  {hiringSteps.map((label, index) => (
                    <Step key={label}>
                      <StepLabel
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontFamily: 'Helvetica, Arial, sans-serif',
                          }
                        }}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#343a40' }}>
                      Current Stage Actions
                    </Typography>
                    <Stack spacing={2}>
                      {candidate.status === 'Phone Screen' ? (
                        <Button 
                          variant="contained" 
                          sx={{ 
                            bgcolor: '#0C3F05',
                            '&:hover': { bgcolor: '#0a3604' }
                          }}
                          startIcon={<CallIcon />}
                          onClick={handlePhoneCall}
                          disabled={updating}
                        >
                          Call Candidate
                        </Button>
                      ) : (
                        <Button 
                          variant="contained" 
                          sx={{ 
                            bgcolor: '#0C3F05',
                            '&:hover': { bgcolor: '#0a3604' }
                          }}
                          startIcon={<WorkIcon />}
                          disabled={updating}
                        >
                          Schedule Interview
                        </Button>
                      )}
                      
                      <Button 
                        variant="outlined" 
                        sx={{ 
                          borderColor: '#6c757d', 
                          color: '#495057',
                          '&:hover': { 
                            borderColor: '#0C3F05', 
                            color: '#0C3F05',
                            bgcolor: '#f8f9fa'
                          }
                        }}
                        startIcon={<EmailIcon />}
                        disabled={updating}
                      >
                        Send Email
                      </Button>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ color: '#343a40' }}>
                      Pipeline Actions
                    </Typography>
                    <Stack spacing={2}>
                      {candidate.status !== 'Hired' && candidate.status !== 'Rejected' && (
                        <Button 
                          variant="contained"
                          color="primary"
                          startIcon={<ArrowForwardIcon />}
                          onClick={handleMoveToNext}
                          disabled={updating}
                          sx={{ 
                            bgcolor: '#007bff',
                            '&:hover': { bgcolor: '#0056b3' }
                          }}
                        >
                          Move to Next Stage
                        </Button>
                      )}
                      
                      {candidate.status !== 'Rejected' && candidate.status !== 'Hired' && (
                        <Button 
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={handleReject}
                          disabled={updating}
                          sx={{ 
                            borderColor: '#dc3545', 
                            color: '#dc3545',
                            '&:hover': { 
                              borderColor: '#c82333', 
                              color: '#c82333',
                              bgcolor: '#f8f9fa'
                            }
                          }}
                        >
                          Reject Candidate
                        </Button>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </>
            )}

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ color: '#343a40' }}>
                  Stage History
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Application Submitted"
                      secondary={formatFirestoreTimestamp(candidate.upload_date)}
                    />
                  </ListItem>
                  {candidate.status === 'Evaluated' && (
                    <ListItem>
                      <ListItemIcon>
                        <AssessmentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="AI Evaluation Completed"
                        secondary="Resume analyzed and scored"
                      />
                    </ListItem>
                  )}
                  {candidate.status === 'Rejected' && (
                    <ListItem>
                      <ListItemIcon>
                        <CancelIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Candidate Rejected"
                        secondary="Application was not successful"
                      />
                    </ListItem>
                  )}
                  {candidate.status === 'Hired' && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Candidate Hired"
                        secondary="Successfully completed hiring process"
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Phone Call Dialog */}
      <Dialog open={phoneDialogOpen} onClose={() => setPhoneDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Call Candidate</Typography>
            <IconButton onClick={() => setPhoneDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box textAlign="center" mb={3}>
            <Typography variant="h6" gutterBottom>
              {candidate.name}
            </Typography>
            <Typography variant="h4" sx={{ color: '#333', fontWeight: 'bold' }}>
              {candidate.phone || 'No phone number available'}
            </Typography>
          </Box>
          <DialogContentText>
            Have you completed the phone screen call with this candidate?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCallNotCompleted}
            color="secondary"
            variant="outlined"
            sx={{
              color: '#666',
              borderColor: '#666',
              '&:hover': { borderColor: '#333', color: '#333' }
            }}
          >
            No, I haven't called yet
          </Button>
          <Button 
            onClick={() => handleCallCompleted(false)}
            variant="outlined"
            sx={{
              color: '#1976d2',
              borderColor: '#1976d2',
              '&:hover': { 
                borderColor: '#1565c0', 
                color: '#1565c0',
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            Yes, but keep in current stage
          </Button>
          <Button 
            onClick={() => handleCallCompleted(true)}
            variant="contained"
            sx={{ 
              bgcolor: '#1976d2',
              color: 'white',
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            Yes, move to next stage
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleRejectCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Candidate</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reject {candidate.name}? Please select a reason for rejection.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Rejection Reason</InputLabel>
              <Select
                value={selectedRejectReason}
                onChange={handleRejectReasonChange}
                label="Rejection Reason"
              >
                {rejectionReasons.map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {reason}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedRejectReason === 'Other' && (
              <TextField
                autoFocus
                margin="dense"
                label="Please specify the reason"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                placeholder="Enter the specific reason for rejection..."
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleRejectCancel} 
            color="primary"
            variant="text"
            sx={{ color: '#0C3F05' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRejectConfirm} 
            color="error"
            variant="contained"
            disabled={!isRejectFormValid()}
          >
            Reject Candidate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manager Rating Dialog */}
      <Dialog open={ratingDialogOpen} onClose={handleRatingCancel} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StarIcon sx={{ color: '#0C3F05' }} />
            <Typography variant="h6">Rate This Candidate</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            As a hiring manager, please provide your assessment of this candidate to help track their progress through the hiring process.
          </DialogContentText>
          
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              How would you rate this candidate?
            </Typography>
            <Rating
              name="manager-rating"
              value={pendingRating}
              onChange={(event, newValue) => {
                setPendingRating(newValue || 0);
              }}
              size="large"
              sx={{ 
                fontSize: '2.5rem',
                color: '#0C3F05',
                '& .MuiRating-iconFilled': {
                  color: '#0C3F05',
                },
                '& .MuiRating-iconHover': {
                  color: '#0a3604',
                }
              }}
            />
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {pendingRating === 0 && 'Click to rate'}
                {pendingRating === 1 && 'Poor - Not a good fit'}
                {pendingRating === 2 && 'Fair - Some concerns'}
                {pendingRating === 3 && 'Good - Meets requirements'}
                {pendingRating === 4 && 'Very Good - Strong candidate'}
                {pendingRating === 5 && 'Excellent - Outstanding candidate'}
              </Typography>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Additional Comments (Optional)"
            multiline
            rows={3}
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            placeholder="Share any specific thoughts about this candidate's strengths, areas for improvement, or overall fit..."
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 2 
              } 
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleRatingLater} 
            color="secondary"
            variant="text"
            sx={{ mr: 'auto' }}
          >
            Rate Later
          </Button>
          <Button 
            onClick={handleRatingCancel} 
            color="primary"
            variant="text"
            sx={{ color: '#0C3F05' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRatingSubmit} 
            color="primary"
            variant="contained"
            disabled={updating || pendingRating === 0}
            sx={{ 
              bgcolor: '#0C3F05',
              '&:hover': { bgcolor: '#0a3604' }
            }}
          >
            {updating ? 'Saving...' : 'Submit Rating'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={() => setSnackbarOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default CandidateProfile;