import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Upload as UploadIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  SmartToy as SmartToyIcon,
  ExpandMore as ExpandMoreIcon,
  CloudUpload as CloudUploadIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const EnhancedCandidateForm = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [smartRecruitersConfig, setSmartRecruitersConfig] = useState(null);
  const [autoSync, setAutoSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);

  const [candidateData, setCandidateData] = useState({
    // Basic Information
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: {
      city: '',
      country: '',
      country_code: ''
    },
    
    // Professional Information
    current_title: '',
    experience_level: '',
    linkedin_url: '',
    portfolio_url: '',
    
    // Education
    education: [{
      institution: '',
      degree: '',
      major: '',
      start_date: '',
      end_date: '',
      current: false
    }],
    
    // Work Experience
    experience: [{
      title: '',
      company: '',
      location: '',
      description: '',
      start_date: '',
      end_date: '',
      current: false
    }],
    
    // Application specific
    cover_letter: '',
    resume_file: null,
    resume_filename: '',
    resume_blob_url: '',
    
    // SmartRecruiters specific
    screening_answers: [],
    consent_decisions: {},
    source_details: {
      source_id: 'candidatehub',
      source_type_id: 'WEBSITE',
      source_sub_type_id: 'CAREER_SITE'
    }
  });

  const steps = [
    'Basic Information',
    'Professional Background',
    'Education & Experience',
    'Application Details',
    'SmartRecruiters Sync'
  ];

  useEffect(() => {
    if (jobId) {
      fetchJobData();
    }
  }, [jobId]);

  const fetchJobData = async () => {
    try {
      setLoading(true);
      
      // Fetch job data
      const jobResponse = await axiosInstance.get(`/api/job/${jobId}`);
      setJobData(jobResponse.data);
      
      // If job has SmartRecruiters integration, fetch configuration
      if (jobResponse.data.smartrecruiters?.enabled && jobResponse.data.smartrecruiters?.posting_uuid) {
        const configResponse = await axiosInstance.get(
          `/api/smartrecruiters/posting/${jobResponse.data.smartrecruiters.posting_uuid}/config`
        );
        if (configResponse.data.success) {
          setSmartRecruitersConfig(configResponse.data.configuration);
        }
      }
      
    } catch (err) {
      console.error('Error fetching job data:', err);
      setError('Failed to load job information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCandidateData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setCandidateData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setCandidateData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName, defaultItem) => {
    setCandidateData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], defaultItem]
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setCandidateData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_id', jobId);

              const response = await axiosInstance.post('/api/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.blob_url) {
        setCandidateData(prev => ({
          ...prev,
          resume_file: file,
          resume_filename: file.name,
          resume_blob_url: response.data.blob_url
        }));
      }
    } catch (err) {
      console.error('Error uploading resume:', err);
      setError('Failed to upload resume');
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 0: // Basic Information
        return candidateData.first_name && candidateData.last_name && candidateData.email;
      case 1: // Professional Background
        return candidateData.current_title;
      case 2: // Education & Experience
        return candidateData.education[0].institution || candidateData.experience[0].title;
      case 3: // Application Details
        return candidateData.cover_letter || candidateData.resume_filename;
      case 4: // SmartRecruiters Sync
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
      setError('');
    } else {
      setError('Please fill in all required fields before proceeding');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Create candidate in CandidateHub
              const candidateResponse = await axiosInstance.post('/api/candidates', {
        ...candidateData,
        job_id: jobId
      });

      if (candidateResponse.data.success) {
        const candidateId = candidateResponse.data.candidate_id;

        // If auto-sync is enabled and job has SmartRecruiters integration
        if (autoSync && jobData?.smartrecruiters?.enabled && jobData?.smartrecruiters?.posting_uuid) {
          setSyncStatus('syncing');
          
          try {
            const syncResponse = await axiosInstance.post('/api/smartrecruiters/sync-candidate', {
              candidate_data: {
                ...candidateData,
                id: candidateId
              },
              posting_uuid: jobData.smartrecruiters.posting_uuid
            });

            if (syncResponse.data.success) {
              setSyncStatus('success');
              setSuccess(true);
            } else {
              setSyncStatus('error');
              setError('Candidate created but SmartRecruiters sync failed');
            }
          } catch (syncErr) {
            setSyncStatus('error');
            setError('Candidate created but SmartRecruiters sync failed');
          }
        } else {
          setSuccess(true);
        }

        // Redirect after success
        setTimeout(() => {
          navigate(`/candidates/${candidateId}`);
        }, 3000);
      }
    } catch (err) {
      console.error('Error submitting candidate:', err);
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInformation = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name"
          value={candidateData.first_name}
          onChange={(e) => handleInputChange('first_name', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name"
          value={candidateData.last_name}
          onChange={(e) => handleInputChange('last_name', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={candidateData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Phone Number"
          value={candidateData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="City"
          value={candidateData.location.city}
          onChange={(e) => handleInputChange('location.city', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Country"
          value={candidateData.location.country}
          onChange={(e) => handleInputChange('location.country', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Country Code"
          value={candidateData.location.country_code}
          onChange={(e) => handleInputChange('location.country_code', e.target.value)}
          placeholder="US, UK, CA..."
        />
      </Grid>
    </Grid>
  );

  const renderProfessionalBackground = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Current Job Title"
          value={candidateData.current_title}
          onChange={(e) => handleInputChange('current_title', e.target.value)}
          required
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Experience Level</InputLabel>
          <Select
            value={candidateData.experience_level}
            onChange={(e) => handleInputChange('experience_level', e.target.value)}
            label="Experience Level"
          >
            <MenuItem value="ENTRY_LEVEL">Entry Level (0-2 years)</MenuItem>
            <MenuItem value="MID_LEVEL">Mid Level (2-5 years)</MenuItem>
            <MenuItem value="SENIOR_LEVEL">Senior Level (5+ years)</MenuItem>
            <MenuItem value="EXECUTIVE">Executive Level</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="LinkedIn URL"
          value={candidateData.linkedin_url}
          onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/in/yourprofile"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Portfolio/Website URL"
          value={candidateData.portfolio_url}
          onChange={(e) => handleInputChange('portfolio_url', e.target.value)}
          placeholder="https://yourportfolio.com"
        />
      </Grid>
    </Grid>
  );

  const renderEducationExperience = () => (
    <Box>
      {/* Education Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <SchoolIcon />
            <Typography variant="h6">Education</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {candidateData.education.map((edu, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Institution"
                      value={edu.institution}
                      onChange={(e) => handleArrayChange('education', index, 'institution', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Degree"
                      value={edu.degree}
                      onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Major/Field"
                      value={edu.major}
                      onChange={(e) => handleArrayChange('education', index, 'major', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={edu.start_date}
                      onChange={(e) => handleArrayChange('education', index, 'start_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={edu.end_date}
                      onChange={(e) => handleArrayChange('education', index, 'end_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={edu.current}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={edu.current}
                          onChange={(e) => handleArrayChange('education', index, 'current', e.target.checked)}
                        />
                      }
                      label="Currently enrolled"
                    />
                  </Grid>
                  {index > 0 && (
                    <Grid item xs={12}>
                      <Button
                        color="error"
                        onClick={() => removeArrayItem('education', index)}
                      >
                        Remove Education
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          ))}
          <Button
            startIcon={<SchoolIcon />}
            onClick={() => addArrayItem('education', {
              institution: '', degree: '', major: '', start_date: '', end_date: '', current: false
            })}
          >
            Add Education
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Experience Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <WorkIcon />
            <Typography variant="h6">Work Experience</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {candidateData.experience.map((exp, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Job Title"
                      value={exp.title}
                      onChange={(e) => handleArrayChange('experience', index, 'title', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Company"
                      value={exp.company}
                      onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={exp.location}
                      onChange={(e) => handleArrayChange('experience', index, 'location', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={exp.start_date}
                      onChange={(e) => handleArrayChange('experience', index, 'start_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={exp.end_date}
                      onChange={(e) => handleArrayChange('experience', index, 'end_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={exp.current}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Job Description"
                      multiline
                      rows={3}
                      value={exp.description}
                      onChange={(e) => handleArrayChange('experience', index, 'description', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={exp.current}
                          onChange={(e) => handleArrayChange('experience', index, 'current', e.target.checked)}
                        />
                      }
                      label="Current position"
                    />
                  </Grid>
                  {index > 0 && (
                    <Grid item xs={12}>
                      <Button
                        color="error"
                        onClick={() => removeArrayItem('experience', index)}
                      >
                        Remove Experience
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          ))}
          <Button
            startIcon={<WorkIcon />}
            onClick={() => addArrayItem('experience', {
              title: '', company: '', location: '', description: '', start_date: '', end_date: '', current: false
            })}
          >
            Add Experience
          </Button>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  const renderApplicationDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Cover Letter"
          multiline
          rows={6}
          value={candidateData.cover_letter}
          onChange={(e) => handleInputChange('cover_letter', e.target.value)}
          placeholder="Tell us why you're interested in this position..."
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resume Upload
            </Typography>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
              id="resume-upload"
            />
            <label htmlFor="resume-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Choose Resume File
              </Button>
            </label>
            {candidateData.resume_filename && (
              <Alert severity="success">
                <Typography variant="body2">
                  ✓ {candidateData.resume_filename} uploaded successfully
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSmartRecruitersSync = () => (
    <Box>
      {jobData?.smartrecruiters?.enabled ? (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <SmartToyIcon color="secondary" />
              <Typography variant="h6" color="secondary.main">
                SmartRecruiters Integration
              </Typography>
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              This job has SmartRecruiters integration enabled. Your application will be automatically 
              synchronized with SmartRecruiters for enhanced tracking and communication.
            </Alert>

            <FormControlLabel
              control={
                <Switch
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  color="secondary"
                />
              }
              label="Automatically sync to SmartRecruiters"
            />

            {smartRecruitersConfig && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  SmartRecruiters Configuration:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <AssignmentIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${smartRecruitersConfig.questions?.length || 0} screening questions`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Privacy policies: ${smartRecruitersConfig.privacyPolicies?.length || 0}`}
                    />
                  </ListItem>
                </List>
              </Box>
            )}

            {syncStatus && (
              <Box mt={2}>
                {syncStatus === 'syncing' && (
                  <Alert severity="info">
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={20} />
                      Syncing to SmartRecruiters...
                    </Box>
                  </Alert>
                )}
                {syncStatus === 'success' && (
                  <Alert severity="success">
                    Successfully synced to SmartRecruiters!
                  </Alert>
                )}
                {syncStatus === 'error' && (
                  <Alert severity="error">
                    Failed to sync to SmartRecruiters. Application saved in CandidateHub.
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">
          This job does not have SmartRecruiters integration enabled. 
          Your application will be processed through CandidateHub only.
        </Alert>
      )}
    </Box>
  );

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return renderBasicInformation();
      case 1:
        return renderProfessionalBackground();
      case 2:
        return renderEducationExperience();
      case 3:
        return renderApplicationDetails();
      case 4:
        return renderSmartRecruitersSync();
      default:
        return null;
    }
  };

  if (loading && !jobData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading job information...</Typography>
      </Box>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Application Submitted Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your application for <strong>{jobData?.title}</strong> has been submitted.
          </Typography>
          {syncStatus === 'success' && (
            <Chip 
              label="Synced to SmartRecruiters" 
              color="secondary" 
              icon={<SmartToyIcon />} 
              sx={{ mb: 2 }}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            You will be redirected to your candidate profile shortly...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box maxWidth="lg" mx="auto" p={3}>
      <Typography variant="h4" gutterBottom>
        Apply for {jobData?.title}
      </Typography>
      
      {jobData?.smartrecruiters?.enabled && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <SmartToyIcon />
            This position includes SmartRecruiters integration for enhanced application tracking.
          </Box>
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {renderStepContent(activeStep)}
          
          <Divider sx={{ my: 3 }} />
          
          <Box display="flex" justifyContent="space-between">
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validateStep(activeStep)}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnhancedCandidateForm;
