import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import {
  Work as WorkIcon,
  LocationOn as LocationOnIcon,
  Upload as UploadIcon,
  Login as LoginIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as AttachMoneyIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';
import axiosInstance from '../api/axiosInstance';

const CareerPortal = () => {
  // Add CSS animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulse {
        0% {
          box-shadow: 0 4px 12px rgba(12, 63, 5, 0.3);
        }
        50% {
          box-shadow: 0 4px 20px rgba(12, 63, 5, 0.5);
        }
        100% {
          box-shadow: 0 4px 12px rgba(12, 63, 5, 0.3);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [openJobs, setOpenJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationDialog, setApplicationDialog] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    resume: null,
    coverLetter: '',
    expectedSalary: '',
    noticePeriod: '',
    source: 'career_portal'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [hrLoginLoading, setHrLoginLoading] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);

  useEffect(() => {
    fetchOpenJobs();
  }, []);

  const fetchOpenJobs = async () => {
    try {
      setLoading(true);
      console.log('Fetching open jobs...');
      console.log('Axios baseURL:', axiosInstance.defaults.baseURL);
      const response = await axiosInstance.get('/api/jobs');
      const allJobs = response.data || [];
      console.log('All jobs received:', allJobs);
      
      // Filter for open jobs - be more lenient with filtering
      const openJobs = allJobs.filter(job => {
        // Show job if it doesn't have a status that indicates it's closed
        const isClosed = job.status === 'closed' || job.status === 'filled' || job.status === 'cancelled';
        const isHired = job.isHired === true || job.dateHired;
        
        console.log(`Job: ${job.title}, Status: ${job.status}, isHired: ${job.isHired}, dateHired: ${job.dateHired}, IsClosed: ${isClosed}, IsHired: ${isHired}`);
        
        return !isClosed && !isHired;
      });
      
      console.log('Filtered open jobs:', openJobs);
      setOpenJobs(openJobs);
      
      // If no jobs found with strict filtering, show all jobs for debugging
      if (openJobs.length === 0 && allJobs.length > 0) {
        console.log('No jobs passed strict filtering, showing all jobs for debugging');
        setOpenJobs(allJobs);
      }
    } catch (err) {
      console.error('Error fetching open jobs:', err);
      setError('Failed to load open jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setApplicationDialog(true);
  };

  const handleViewJobDetails = (job) => {
    setSelectedJobDetails(job);
    setShowJobDetails(true);
  };

  const handleInputChange = (field, value) => {
    setApplicationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setApplicationForm(prev => ({
        ...prev,
        resume: file
      }));
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setSubmitting(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('resume', applicationForm.resume);
      formData.append('job_id', selectedJob.id);
      formData.append('candidate_data', JSON.stringify({
        firstName: applicationForm.firstName,
        lastName: applicationForm.lastName,
        email: applicationForm.email,
        phone: applicationForm.phone,
        location: applicationForm.location,
        coverLetter: applicationForm.coverLetter,
        expectedSalary: applicationForm.expectedSalary,
        noticePeriod: applicationForm.noticePeriod,
        source: applicationForm.source,
        status: 'NEW'
      }));

      // Submit application
      await axiosInstance.post('/api/candidates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setApplicationDialog(false);
        setSubmitSuccess(false);
        setApplicationForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          location: '',
          resume: null,
          coverLetter: '',
          expectedSalary: '',
          noticePeriod: '',
          source: 'career_portal'
        });
      }, 3000);

    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHRLogin = async () => {
    try {
      setHrLoginLoading(true);
      setError(null);
      
      // Directly initiate Microsoft SSO login
      await instance.loginPopup(loginRequest);
      
      // If successful, redirect to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Microsoft login error:', err);
      setError('HR login failed. Please try again.');
    } finally {
      setHrLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <AppBar position="static" sx={{ 
        bgcolor: 'white', 
        color: 'text.primary', 
        boxShadow: '0 4px 30px rgba(0,0,0,0.08)',
        borderBottom: '1px solid rgba(12, 63, 5, 0.1)'
      }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              mr: 3, 
              width: 60, 
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/images/ihs-logo.png"
                alt="IHS Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'brightness(0) saturate(100%) invert(8%) sepia(100%) saturate(1000%) hue-rotate(120deg) brightness(0.3) contrast(1.2)'
                }}
              />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                color: '#0C3F05',
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                IHS Career Portal
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                opacity: 0.8
              }}>

              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={hrLoginLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            onClick={handleHRLogin}
            disabled={hrLoginLoading}
            sx={{
              bgcolor: '#0C3F05',
              '&:hover': { 
                bgcolor: '#0a2f04',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(12, 63, 5, 0.4)'
              },
              boxShadow: '0 4px 15px rgba(12, 63, 5, 0.3)',
              borderRadius: '28px',
              px: 4,
              py: 1.5,
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: hrLoginLoading ? 'none' : 'pulse 2s infinite'
            }}
          >
            {hrLoginLoading ? 'Signing In...' : 'HR Login'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Error Display for HR Login */}
      {error && (
        <Container maxWidth="lg" sx={{ pt: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Container>
      )}

      {/* Hero Section */}
      <Box sx={{ 
        py: 12, 
        background: `linear-gradient(135deg, rgba(12, 63, 5, 0.85) 0%, rgba(12, 63, 5, 0.6) 100%), url('/images/tower-background.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* Overlay for better text readability */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1
        }} />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Box textAlign="center">
            <Typography 
              variant="h1" 
              sx={{ 
                fontWeight: 700, 
                mb: 4,
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                animation: 'fadeInUp 1s ease-out',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}
            >
              Join IHS Towers
            </Typography>
            <Typography variant="h4" sx={{ 
              mb: 4, 
              opacity: 0.95,
              fontWeight: 500,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              textShadow: '0 2px 10px rgba(0,0,0,0.4)',
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.4
            }}>
              Be part of the leading provider of communications infrastructure in emerging markets
            </Typography>
            <Typography variant="h5" sx={{ 
              opacity: 0.9,
              fontWeight: 400,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              maxWidth: '600px',
              mx: 'auto'
            }}>
              Where innovation meets integrity, and boldness drives sustainable growth
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* IHS Values Section */}
      <Box sx={{ py: 8, bgcolor: 'white', width: '100%' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography variant="h3" sx={{ 
              fontWeight: 700, 
              mb: 3, 
              color: '#0C3F05',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              Our Values
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ 
              opacity: 0.8,
              fontWeight: 500,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              maxWidth: '700px',
              mx: 'auto',
              lineHeight: 1.5
            }}>
              Joining IHS Towers offers you the opportunity to be part of something special, where creative thinking, diversity of opinion and innovation are truly valued
            </Typography>
          </Box>
        </Container>

        <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Grid container spacing={4} maxWidth="1400px" mx="auto">
          {[
            {
              title: 'Customer Focus',
              description: 'Understanding and exceeding our customers\' needs, developing trusted relationships, and consistently operating at the highest standard of service',
              image: '/images/customer-focus.png'
            },
            {
              title: 'Innovation',
              description: 'Constantly seeking new and improved ways to deliver our products and services, championing engineering excellence and growth',
              image: '/images/innovation.png'
            },
            {
              title: 'Integrity',
              description: 'Being ethical, transparent and honest in everything we do, operating with the highest standards of corporate governance',
              image: '/images/integrity.png'
            },
            {
              title: 'Boldness',
              description: 'Being courageous in expanding existing markets and developing new ones, demonstrating robustness in our analysis and decision making',
              image: '/images/boldness.png'
            },
            {
              title: 'Sustainability',
              description: 'Safeguarding the health and wellbeing of all stakeholders, creating positive impact in communities, and reducing environmental impact',
              image: '/images/sustainability.png'
            }
          ].map((value, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'rgba(12, 63, 5, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 30px rgba(12, 63, 5, 0.15)',
                    borderColor: '#0C3F05'
                  }
                }}
              >
                <Box sx={{ 
                  mb: 2,
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <img 
                    src={value.image}
                    alt={value.title}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  />
                </Box>
                <Typography variant="h6" sx={{ 
                  mb: 2, 
                  color: '#0C3F05', 
                  fontWeight: 700,
                  letterSpacing: '-0.01em'
                }}>
                  {value.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ 
                  lineHeight: 1.6,
                  fontWeight: 400
                }}>
                  {value.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
          </Box>
        </Box>

      {/* Open Jobs Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box textAlign="center" mb={8}>
          <Typography variant="h3" sx={{ 
            fontWeight: 700, 
            mb: 3, 
            color: '#0C3F05',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Vacancies
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ 
            opacity: 0.8,
            fontWeight: 500,
            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
            maxWidth: '600px',
            mx: 'auto',
            lineHeight: 1.5
          }}>
            Discover exciting career opportunities that align with your professional aspirations
          </Typography>
          <Box sx={{ 
            width: 80, 
            height: 4, 
            bgcolor: '#0C3F05', 
            mx: 'auto', 
            mt: 3,
            borderRadius: 2,
            opacity: 0.8
          }} />
        </Box>

        {loading ? (
          <Box textAlign="center" py={8}>
            <CircularProgress sx={{ color: '#0C3F05' }} size={70} />
            <Typography variant="h5" sx={{ 
              mt: 4, 
              color: 'text.secondary', 
              fontWeight: 600,
              letterSpacing: '-0.01em'
            }}>
              Loading open positions...
            </Typography>
            <Typography variant="body1" sx={{ 
              mt: 2, 
              color: 'text.secondary', 
              opacity: 0.7,
              fontWeight: 400,
              fontSize: '1.1rem'
            }}>
              Finding the best opportunities for you
            </Typography>
          </Box>
        ) : error ? (
          <Box textAlign="center" py={8}>
            <Alert severity="error" sx={{ 
              maxWidth: 600, 
              mx: 'auto', 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Unable to load positions
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 400 }}>
                {error}
              </Typography>
            </Alert>
          </Box>
        ) : openJobs.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Box sx={{ 
              p: 6, 
              bgcolor: 'grey.50', 
              borderRadius: 4, 
              maxWidth: 500, 
              mx: 'auto',
              border: '2px dashed',
              borderColor: 'rgba(12, 63, 5, 0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
              <WorkIcon sx={{ fontSize: 72, color: 'rgba(12, 63, 5, 0.3)', mb: 3 }} />
              <Typography variant="h5" sx={{ 
                mb: 3, 
                color: 'text.secondary', 
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}>
                No open positions at the moment
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ 
                opacity: 0.7,
                fontWeight: 400,
                lineHeight: 1.6
              }}>
                We're currently not hiring, but please check back later for new opportunities.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {openJobs.map((job, index) => (
              <Grid item xs={12} md={6} lg={4} key={job.id}>
                <Box
                  sx={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                >
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'rgba(12, 63, 5, 0.1)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    '&:hover': {
                      transform: 'translateY(-12px)',
                      boxShadow: '0 25px 50px rgba(12, 63, 5, 0.15)',
                      borderColor: '#0C3F05',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                         <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                       <Avatar sx={{ 
                         bgcolor: '#0C3F05', 
                         mr: 2,
                         boxShadow: '0 4px 12px rgba(12, 63, 5, 0.3)'
                       }}>
                         <WorkIcon sx={{ color: 'white' }} />
                       </Avatar>
                       <Box>
                         <Typography variant="h6" sx={{ 
                           fontWeight: 700, 
                           color: '#0C3F05',
                           fontSize: '1.1rem',
                           letterSpacing: '-0.01em',
                           lineHeight: 1.3
                         }}>
                           {job.title}
                         </Typography>
                         <Typography variant="body2" color="text.secondary" sx={{ 
                           opacity: 0.8,
                           fontWeight: 500,
                           fontSize: '0.875rem'
                         }}>
                           {job.department || 'General'}
                         </Typography>
                       </Box>
                     </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ 
                      mb: 2, 
                      lineHeight: 1.6,
                      fontWeight: 400,
                      fontSize: '0.875rem',
                      opacity: 0.85
                    }}>
                      {job.description?.substring(0, 120)}...
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        icon={<LocationOnIcon />}
                        label={job.location || 'Remote'}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1, mb: 1 }}
                      />
                      {job.type && (
                        <Chip
                          label={job.type}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      )}
                    </Box>

                    {/* Quick Skills Preview */}
                    <Box sx={{ mb: 2 }}>
                                             <Typography variant="caption" sx={{ 
                         mb: 1, 
                         display: 'block',
                         color: '#0C3F05',
                         fontWeight: 600,
                         fontSize: '0.75rem',
                         textTransform: 'uppercase',
                         letterSpacing: '0.5px'
                       }}>
                         Key Skills:
                       </Typography>
                      {job.skills && job.skills.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {job.skills.slice(0, 3).map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(12, 63, 5, 0.1)',
                                color: '#0C3F05',
                                border: '1px solid rgba(12, 63, 5, 0.3)',
                                fontSize: '0.7rem',
                                height: 24,
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: 'rgba(12, 63, 5, 0.2)',
                                  transform: 'scale(1.05)',
                                  boxShadow: '0 2px 8px rgba(12, 63, 5, 0.2)'
                                }
                              }}
                            />
                          ))}
                          {job.skills.length > 3 && (
                            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                              +{job.skills.length - 3} more
                            </Typography>
                          )}
                        </Box>
                                             ) : (
                         <Typography variant="caption" sx={{ 
                           fontStyle: 'italic',
                           color: 'text.secondary',
                           opacity: 0.7,
                           fontSize: '0.75rem'
                         }}>
                           Skills will be discussed during interview
                         </Typography>
                       )}
                    </Box>

                    <Box sx={{ mt: 'auto' }}>
                                             <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                         <Button
                           variant="outlined"
                           fullWidth
                           onClick={() => handleViewJobDetails(job)}
                           sx={{
                             borderColor: '#0C3F05',
                             color: '#0C3F05',
                             '&:hover': { 
                               borderColor: '#0a2f04',
                               bgcolor: 'rgba(12, 63, 5, 0.05)',
                               transform: 'translateY(-1px)'
                             },
                             borderRadius: '28px',
                             py: 1.3,
                             fontWeight: 600,
                             fontSize: '0.875rem',
                             textTransform: 'none',
                             transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                             borderWidth: '1.5px'
                           }}
                         >
                           View Details
                         </Button>
                         <Button
                           variant="contained"
                           fullWidth
                           onClick={() => handleJobSelect(job)}
                           sx={{
                             bgcolor: '#0C3F05',
                             '&:hover': { 
                               bgcolor: '#0a2f04',
                               transform: 'translateY(-1px)',
                               boxShadow: '0 6px 20px rgba(12, 63, 5, 0.4)'
                             },
                             boxShadow: '0 4px 15px rgba(12, 63, 5, 0.3)',
                             borderRadius: '28px',
                             py: 1.3,
                             fontWeight: 600,
                             fontSize: '0.875rem',
                             textTransform: 'none',
                             transition: 'all 0.2s cubic-bezier(0.4, 0, 0.5, 1)'
                           }}
                         >
                           Apply Now
                         </Button>
                       </Box>
                    </Box>
                  </CardContent>
                </Card>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
        
        {/* Back to Top Button */}
        {!loading && !error && openJobs.length > 6 && (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              sx={{
                borderColor: '#0C3F05',
                color: '#0C3F05',
                '&:hover': { 
                  borderColor: '#0a2f04',
                  bgcolor: 'rgba(12, 63, 5, 0.05)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(12, 63, 5, 0.2)'
                },
                borderRadius: '28px',
                px: 5,
                py: 1.5,
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderWidth: '1.5px'
              }}
            >
              Back to Top
            </Button>
          </Box>
        )}
      </Container>

      {/* Application Dialog */}
      <Dialog 
        open={applicationDialog} 
        onClose={() => setApplicationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ 
              fontWeight: 700,
              color: '#0C3F05',
              letterSpacing: '-0.01em'
            }}>
              Apply for {selectedJob?.title}
            </Typography>
            <IconButton 
              onClick={() => setApplicationDialog(false)}
              sx={{
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {submitSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#0C3F05', mb: 2 }} />
                          <Typography variant="h5" sx={{ 
              color: '#0C3F05', 
              fontWeight: 700, 
              mb: 3,
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}>
              Application Submitted Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ 
              mb: 3, 
              lineHeight: 1.6,
              fontWeight: 500,
              fontSize: '1.1rem'
            }}>
              Thank you for your interest in joining the IHS team! We've received your application and will review your profile carefully.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ 
              opacity: 0.8,
              fontWeight: 400,
              lineHeight: 1.5
            }}>
              Our HR team will contact you within 5-7 business days if your profile matches our requirements.
            </Typography>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={applicationForm.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={applicationForm.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={applicationForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={applicationForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  value={applicationForm.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Salary"
                  value={applicationForm.expectedSalary}
                  onChange={(e) => handleInputChange('expectedSalary', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Notice Period"
                  value={applicationForm.noticePeriod}
                  onChange={(e) => handleInputChange('noticePeriod', e.target.value)}
                  placeholder="e.g., 2 weeks"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cover Letter"
                  multiline
                  rows={4}
                  value={applicationForm.coverLetter}
                  onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                  placeholder="Tell us why you're interested in this role..."
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Upload Resume (PDF, DOC, DOCX)
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </Button>
                {applicationForm.resume && (
                  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                    ✓ {applicationForm.resume.name}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        {submitSuccess ? (
          <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => {
                setApplicationDialog(false);
                setSubmitSuccess(false);
                setApplicationForm({
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  location: '',
                  resume: null,
                  coverLetter: '',
                  expectedSalary: '',
                  noticePeriod: '',
                  source: 'career_portal'
                });
              }}
              sx={{
                bgcolor: '#0C3F05',
                '&:hover': { 
                  bgcolor: '#0a2f04',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(12, 63, 5, 0.4)'
                },
                boxShadow: '0 4px 15px rgba(12, 63, 5, 0.3)',
                borderRadius: '28px',
                px: 5,
                py: 1.3,
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              Close
            </Button>
          </DialogActions>
        ) : (
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setApplicationDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitApplication}
              disabled={submitting || !applicationForm.firstName || !applicationForm.email || !applicationForm.resume}
              sx={{
                bgcolor: '#0C3F05',
                '&:hover': { bgcolor: '#0a2f04' },
                boxShadow: '0 4px 12px rgba(12, 63, 5, 0.3)',
                borderRadius: '25px',
                px: 3,
                py: 1.2
              }}
            >
              {submitting ? <CircularProgress size={20} /> : 'Submit Application'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Detailed Job View Dialog */}
      <Dialog
        open={showJobDetails}
        onClose={() => setShowJobDetails(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#0C3F05', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 3,
          px: 4
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WorkIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}>
              {selectedJobDetails?.title}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setShowJobDetails(false)}
            sx={{ 
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          {selectedJobDetails && (
            <Box>
              {/* Job Header */}
              <Box sx={{ mb: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <WorkIcon sx={{ color: '#0C3F05', mr: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        {selectedJobDetails.department || 'General'}
                      </Typography>
                    </Box>
                                             <Typography variant="h6" sx={{ 
                           color: '#0C3F05', 
                           fontWeight: 700,
                           letterSpacing: '-0.01em',
                           lineHeight: 1.3
                         }}>
                           {selectedJobDetails.title}
                         </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationOnIcon sx={{ color: '#0C3F05', mr: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        {selectedJobDetails.location || 'Remote'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoneyIcon sx={{ color: '#0C3F05', mr: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        {selectedJobDetails.salary || 'Competitive'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Job Description */}
              <Box sx={{ mb: 4 }}>
                              <Typography variant="h6" sx={{ 
                mb: 3, 
                color: '#0C3F05', 
                fontWeight: 700,
                letterSpacing: '-0.01em',
                fontSize: '1.25rem'
              }}>
                Job Description
              </Typography>
              <Typography variant="body1" sx={{ 
                lineHeight: 1.7, 
                color: 'text.secondary',
                fontWeight: 400,
                fontSize: '1rem'
              }}>
                {selectedJobDetails.description || 
                  'We are looking for a talented professional to join our team. This role offers exciting opportunities for growth and development in a dynamic environment.'}
              </Typography>
              </Box>

              {/* Key Skills */}
              <Box sx={{ mb: 4 }}>
                              <Typography variant="h6" sx={{ 
                mb: 3, 
                color: '#0C3F05', 
                fontWeight: 700,
                letterSpacing: '-0.01em',
                fontSize: '1.25rem'
              }}>
                Key Skills & Requirements
              </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(selectedJobDetails.skills || [
                    'Strong communication skills',
                    'Team collaboration',
                    'Problem-solving abilities',
                    'Attention to detail',
                    'Adaptability'
                  ]).map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      sx={{
                        bgcolor: 'rgba(12, 63, 5, 0.1)',
                        color: '#0C3F05',
                        border: '1px solid rgba(12, 63, 5, 0.3)',
                        '&:hover': {
                          bgcolor: 'rgba(12, 63, 5, 0.2)'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Additional Details */}
              <Box sx={{ mb: 4 }}>
                              <Typography variant="h6" sx={{ 
                mb: 3, 
                color: '#0C3F05', 
                fontWeight: 700,
                letterSpacing: '-0.01em',
                fontSize: '1.25rem'
              }}>
                Additional Details
              </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ScheduleIcon sx={{ color: '#0C3F05', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Type: {selectedJobDetails.type || 'Full-time'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <SchoolIcon sx={{ color: '#0C3F05', mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Experience: {selectedJobDetails.experience || 'Entry Level'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 4, bgcolor: 'grey.50', gap: 2 }}>
          <Button 
            onClick={() => setShowJobDetails(false)}
            sx={{ 
              color: 'text.secondary',
              fontWeight: 500,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.05)'
              }
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowJobDetails(false);
              setSelectedJob(selectedJobDetails);
              setApplicationDialog(true);
            }}
            sx={{
              bgcolor: '#0C3F05',
              '&:hover': { 
                bgcolor: '#0a2f04',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 20px rgba(12, 63, 5, 0.4)'
              },
              boxShadow: '0 4px 15px rgba(12, 63, 5, 0.3)',
              borderRadius: '28px',
              px: 4,
              py: 1.3,
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Apply Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CareerPortal;
