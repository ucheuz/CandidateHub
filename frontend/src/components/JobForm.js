import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Chip, 
  Stack,
  Grid,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import WorkIcon from '@mui/icons-material/Work';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import SkillsIcon from '@mui/icons-material/Psychology';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';

const JobForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    departmental_skills: ['', '', '', '', ''], // 5 key skills for scorecards
    location: '',
    type: '',
    listedBy: 'Current User',
    hiringManagers: '',
    datePosted: null,
    dateHired: null,
    // New fields for AI evaluation customization
    job_template: '',
    job_specification: '',
    evaluation_criteria: '',
    // Interview pipeline configuration
    has_interview_3: false
  });

  const jobTypes = [
    'Full-time',
    'Part-time',
    'Contract',
    'Temporary',
    'Internship',
    'Remote',
    'Hybrid'
  ];

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Job title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Job description is required');
      return false;
    }
    if (!formData.required_skills.trim()) {
      setError('Required skills are required');
      return false;
    }
    if (!formData.hiringManagers.trim()) {
      setError('At least one hiring manager is required');
      return false;
    }
    if (!formData.job_template.trim()) {
      setError('Job template is required for AI evaluation');
      return false;
    }
    if (!formData.job_specification.trim()) {
      setError('Job specification is required for AI evaluation');
      return false;
    }
    if (!formData.evaluation_criteria.trim()) {
      setError('Evaluation criteria is required for AI evaluation');
      return false;
    }
    // Check if at least 3 departmental skills are filled
    const filledSkills = formData.departmental_skills.filter(skill => skill.trim()).length;
    if (filledSkills < 3) {
      setError('Please provide at least 3 departmental skills for candidate scorecards');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const jobsCollection = collection(db, 'jobs');
      const serverDate = new Date();
      
      const jobData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        required_skills: formData.required_skills.split(',').map(skill => skill.trim()).filter(Boolean),
        departmental_skills: formData.departmental_skills.filter(skill => skill.trim()).map(skill => skill.trim()),
        location: formData.location.trim(),
        type: formData.type.trim(),
        listedBy: formData.listedBy.trim(),
        hiringManagers: formData.hiringManagers.split(',').map(manager => manager.trim()).filter(Boolean),
        datePosted: serverDate,
        dateHired: null,
        // AI evaluation fields
        job_template: formData.job_template.trim(),
        job_specification: formData.job_specification.trim(),
        evaluation_criteria: formData.evaluation_criteria.trim(),
        // Interview pipeline configuration
        has_interview_3: formData.has_interview_3
      };

      console.log('Creating new job:', jobData);
      const docRef = await addDoc(jobsCollection, jobData);
      console.log('Job created with ID:', docRef.id);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/jobs');
      }, 2000);
    } catch (error) {
      console.error('Error creating job:', error);
      setError(`Error creating job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleDepartmentalSkillChange = (index, value) => {
    const newSkills = [...formData.departmental_skills];
    newSkills[index] = value;
    setFormData(prev => ({
      ...prev,
      departmental_skills: newSkills
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const getSkillsPreview = () => {
    if (!formData.required_skills.trim()) return [];
    return formData.required_skills.split(',').map(skill => skill.trim()).filter(Boolean);
  };

  const getManagersPreview = () => {
    if (!formData.hiringManagers.trim()) return [];
    return formData.hiringManagers.split(',').map(manager => manager.trim()).filter(Boolean);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'transparent' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" href="/dashboard" underline="hover">
            Dashboard
          </Link>
          <Link color="inherit" href="/jobs" underline="hover">
            Jobs
          </Link>
          <Typography color="text.primary">Create New Job</Typography>
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
            <AddIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
            Create New Job Position
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              maxWidth: { xs: '100%', md: '600px' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Fill in the details below to create a new job posting for your hiring pipeline.
          </Typography>
        </Box>

        {/* Success Message */}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            Job created successfully! Redirecting to jobs page...
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
            {/* Left Column - Main Information */}
            <Grid item xs={12} lg={8}>
              <Stack spacing={3}>
                {/* Job Title Card */}
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <WorkIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Job Information
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Job Title"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          required
                          placeholder="e.g., Senior Software Engineer"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2 
                            } 
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Location"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="e.g., New York, NY"
                          InputProps={{
                            startAdornment: <LocationOnIcon sx={{ color: 'text.secondary', mr: 1 }} />
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2 
                            } 
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Job Type</InputLabel>
                          <Select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            label="Job Type"
                            startAdornment={<BusinessIcon sx={{ color: 'text.secondary', mr: 1 }} />}
                            sx={{ 
                              borderRadius: 2 
                            }}
                          >
                            {jobTypes.map((type) => (
                              <MenuItem key={type} value={type}>
                                {type}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Job Description Card */}
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <DescriptionIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Job Description
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      label="Job Description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      multiline
                      rows={6}
                      placeholder="Describe the role, responsibilities, and what you're looking for in a candidate..."
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2 
                        } 
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Skills Card */}
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <SkillsIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Required Skills
                      </Typography>
                      <Tooltip title="Enter skills separated by commas">
                        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                    <TextField
                      fullWidth
                      label="Required Skills"
                      name="required_skills"
                      value={formData.required_skills}
                      onChange={handleChange}
                      required
                      placeholder="e.g., React, Node.js, Python, AWS"
                      helperText="Enter skills separated by commas"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2 
                        } 
                      }}
                    />
                    {getSkillsPreview().length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Skills Preview:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {getSkillsPreview().map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                borderColor: 'primary.main',
                                color: 'primary.main' 
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Departmental Skills Card */}
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <SkillsIcon sx={{ color: 'secondary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Key Departmental Skills
                      </Typography>
                      <Tooltip title="These 5 skills will be used for candidate scorecards and evaluations">
                        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Define 5 key skills that candidates will be evaluated on in their scorecards. At least 3 are required.
                    </Typography>
                    <Grid container spacing={2}>
                      {formData.departmental_skills.map((skill, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                          <TextField
                            fullWidth
                            label={`Key Skill ${index + 1}`}
                            value={skill}
                            onChange={(e) => handleDepartmentalSkillChange(index, e.target.value)}
                            placeholder={`e.g., ${index === 0 ? 'Problem Solving' : index === 1 ? 'Communication' : index === 2 ? 'Technical Expertise' : index === 3 ? 'Leadership' : 'Team Collaboration'}`}
                            required={index < 3}
                            sx={{ 
                              '& .MuiOutlinedInput-root': { 
                                borderRadius: 2 
                              } 
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    {formData.departmental_skills.some(skill => skill.trim()) && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Scorecard Skills Preview:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {formData.departmental_skills.filter(skill => skill.trim()).map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              variant="filled"
                              sx={{ 
                                backgroundColor: 'secondary.main',
                                color: 'white',
                                '& .MuiChip-label': {
                                  fontWeight: 500
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* AI Evaluation Configuration Card */}
                <Card elevation={2} sx={{ borderRadius: 2, border: '2px solid', borderColor: 'primary.main' }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <AssessmentIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        AI Evaluation Configuration
                      </Typography>
                      <Tooltip title="Configure how AI will evaluate candidates for this specific role">
                        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      These fields will be used to create a custom AI evaluation prompt specific to this job role.
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Job Template"
                          name="job_template"
                          value={formData.job_template}
                          onChange={handleChange}
                          required
                          multiline
                          rows={3}
                          placeholder="e.g., Senior Software Engineer, Marketing Manager, Data Scientist..."
                          helperText="Define the overall job template/category for evaluation context"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2 
                            } 
                          }}
                        />
                        <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                            Example Usage:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'grey.600', fontStyle: 'italic' }}>
                            "Senior Full-Stack Developer with team leadership responsibilities. This role requires building scalable web applications and mentoring junior developers in a fast-paced startup environment."
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Job Specification"
                          name="job_specification"
                          value={formData.job_specification}
                          onChange={handleChange}
                          required
                          multiline
                          rows={4}
                          placeholder="e.g., 5+ years experience in full-stack development, React/Node.js expertise, team leadership experience..."
                          helperText="Detailed specifications and requirements for the role"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2 
                            } 
                          }}
                        />
                        <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                            Example Usage:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'grey.600', fontStyle: 'italic' }}>
                            "• 5+ years experience in React, Node.js, and TypeScript<br/>
                            • Experience with cloud platforms (AWS/Azure) and containerization<br/>
                            • Previous team leadership or mentoring experience<br/>
                            • Strong understanding of agile development methodologies<br/>
                            • Bachelor's degree in Computer Science or equivalent experience"
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Evaluation Criteria"
                          name="evaluation_criteria"
                          value={formData.evaluation_criteria}
                          onChange={handleChange}
                          required
                          multiline
                          rows={4}
                          placeholder="e.g., Technical skills assessment, problem-solving ability, communication skills, leadership potential, cultural fit..."
                          helperText="Specific criteria the AI should focus on when evaluating candidates"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2 
                            } 
                          }}
                        />
                        <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                            Example Usage:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'grey.600', fontStyle: 'italic' }}>
                            "Focus on technical proficiency in modern web development, ability to architect scalable solutions, leadership and mentoring capabilities, communication skills for cross-team collaboration, and cultural alignment with our innovation-driven startup environment."
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Hiring Managers Card */}
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <PeopleIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Hiring Managers
                      </Typography>
                      <Tooltip title="Enter manager names separated by commas">
                        <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                    <TextField
                      fullWidth
                      label="Hiring Managers"
                      name="hiringManagers"
                      value={formData.hiringManagers}
                      onChange={handleChange}
                      required
                      placeholder="e.g., John Smith, Sarah Johnson"
                      helperText="Enter manager names separated by commas"
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2 
                        } 
                      }}
                    />
                    {getManagersPreview().length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Managers Preview:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {getManagersPreview().map((manager, index) => (
                            <Chip
                              key={index}
                              label={manager}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                borderColor: 'secondary.main',
                                color: 'secondary.main' 
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Interview Pipeline Configuration Card */}
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AssessmentIcon sx={{ mr: 1, color: '#0C3F05' }} />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#0C3F05' }}>
                        Interview Pipeline Configuration
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Configure the interview process for this job role
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Include Interview 3?</InputLabel>
                      <Select
                        value={formData.has_interview_3}
                        onChange={(e) => setFormData({...formData, has_interview_3: e.target.value})}
                        label="Include Interview 3?"
                      >
                        <MenuItem value={false}>No - Standard Pipeline (Interview 1, Interview 2)</MenuItem>
                        <MenuItem value={true}>Yes - Extended Pipeline (Interview 1, Interview 2, Interview 3)</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        {formData.has_interview_3 
                          ? "This job will include a third interview stage in the hiring pipeline."
                          : "This job will use the standard two-interview pipeline."
                        }
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>

            {/* Right Column - Summary & Actions */}
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                {/* Job Summary Card */}
                <Card elevation={2} sx={{ borderRadius: 2, position: 'sticky', top: 20 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Job Summary
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Job Title
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formData.title || 'Not specified'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formData.location || 'Not specified'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formData.type || 'Not specified'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Skills Count
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {getSkillsPreview().length} skills
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Scorecard Skills
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formData.departmental_skills.filter(skill => skill.trim()).length}/5 defined
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Hiring Managers
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {getManagersPreview().length} managers
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        AI Evaluation
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formData.job_template && formData.job_specification && formData.evaluation_criteria 
                          ? 'Configured' 
                          : 'Not configured'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Interview Pipeline
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {formData.has_interview_3 ? 'Extended (3 Interviews)' : 'Standard (2 Interviews)'}
                      </Typography>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Action Buttons */}
                    <Stack spacing={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 500,
                          py: 1.5
                        }}
                      >
                        {loading ? 'Creating Job...' : 'Create Job Position'}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate('/jobs')}
                        disabled={loading}
                        startIcon={<CancelIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 500,
                          py: 1.5
                        }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default JobForm;
