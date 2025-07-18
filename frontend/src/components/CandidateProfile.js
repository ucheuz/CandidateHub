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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

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

  const hiringSteps = [
    'Application',
    'Initial Review',
    'Phone Screen',
    'Technical Interview',
    'Final Interview',
    'Decision'
  ];

  const getCurrentStep = (status) => {
    switch (status) {
      case 'Evaluated': return 1;
      case 'Phone Screen': return 2;
      case 'Technical Interview': return 3;
      case 'Final Interview': return 4;
      case 'Hired': return 5;
      case 'Rejected': return -1;
      default: return 0;
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
                      value={candidate.managerRating || 0} 
                      readOnly 
                      sx={{ color: '#ffc107' }}
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
                <Typography variant="h6" gutterBottom sx={{ color: '#343a40' }}>
                  AI Evaluation Summary
                </Typography>
                {candidate.evaluation ? (
                  <Box>
                    <Typography variant="body1" paragraph>
                      {candidate.evaluation.summary}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Detailed Analysis
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {candidate.evaluation.detail}
                    </Typography>
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
              <NotesHub candidateId={candidateId} />
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
                  <Button 
                    variant="contained" 
                    sx={{ 
                      bgcolor: '#0C3F05',
                      '&:hover': { bgcolor: '#0a3604' }
                    }}
                    startIcon={<WorkIcon />}
                  >
                    Schedule Interview
                  </Button>
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
                  >
                    Send Email
                  </Button>
                </Stack>
              </Grid>
              
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
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
};

export default CandidateProfile;