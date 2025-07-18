import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Box,
  CircularProgress,
  Paper,
  Chip,
  Button,
  Breadcrumbs,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';

const JobSelection = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        const jobsSnapshot = await getDocs(jobsCollection);
        const jobsList = jobsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setJobs(jobsList);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={0} sx={{ p: 4, backgroundColor: 'transparent' }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress size={60} />
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
          <Typography color="text.primary">Add Candidate</Typography>
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
            Select Job Position
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              maxWidth: { xs: '100%', md: '600px' },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Choose the job position you're hiring for. This will help us tailor the candidate evaluation process.
          </Typography>
        </Box>

        {/* Jobs Grid */}
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {jobs.map((job) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={3} key={job.id}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  minHeight: { xs: 280, sm: 320 },
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    elevation: 8,
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                  },
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <CardActionArea 
                  onClick={() => navigate(`/upload/${job.id}`)}
                  sx={{ height: '100%', p: 0 }}
                >
                  <CardContent sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column' 
                  }}>
                    {/* Job Title */}
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom
                        sx={{ 
                          fontWeight: 600,
                          color: 'text.primary',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
                          lineHeight: 1.2
                        }}
                      >
                        <WorkIcon sx={{ fontSize: { xs: 18, sm: 20 }, color: 'primary.main' }} />
                        {job.title}
                      </Typography>
                    </Box>

                    {/* Job Description */}
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: { xs: 2, sm: 3 },
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      }}
                    >
                      {(String(job.description || "No description provided"))}
                    </Typography>

                    {/* Job Details */}
                    <Box sx={{ mb: 2 }}>
                      {job.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationOnIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                            {job.location}
                          </Typography>
                        </Box>
                      )}
                      {job.type && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <BusinessIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                            {job.type}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Required Skills */}
                    <Box sx={{ mt: 'auto' }}>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          fontWeight: 500, 
                          mb: 1, 
                          display: 'block',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                      >
                        Required Skills:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.isArray(job.required_skills) ? (
                          job.required_skills.slice(0, 3).map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                height: { xs: 20, sm: 24 },
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                '& .MuiChip-label': {
                                  px: { xs: 1, sm: 1.5 }
                                }
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                            {String(job.required_skills || "No required skills specified")}
                          </Typography>
                        )}
                        {Array.isArray(job.required_skills) && job.required_skills.length > 3 && (
                          <Chip
                            label={`+${job.required_skills.length - 3} more`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 },
                              borderColor: 'text.secondary',
                              color: 'text.secondary',
                              '& .MuiChip-label': {
                                px: { xs: 1, sm: 1.5 }
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {jobs.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: 'center',
              backgroundColor: 'grey.50',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'grey.300'
            }}
          >
            <WorkIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              No Jobs Available
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 3,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Create a job posting first before adding candidates.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/jobs/new')}
              sx={{ 
                mt: 1,
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 }
              }}
            >
              Create New Job
            </Button>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default JobSelection;
