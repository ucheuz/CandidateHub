import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  TrendingUp,
  People,
  Work,
  Assessment,
  Star,
  Schedule,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

// IHS Brand Colors
const IHS_COLORS = {
  primary: '#0C3F05',      // Dark Green (IHS Primary)
  secondary: '#4CAF50',    // Medium Green
  accent: '#8BC34A',       // Light Green
  blue: '#0274B3',         // IHS Blue
  lightBlue: '#4FC3F7',    // Light Blue
  orange: '#FF9800',       // Orange
  red: '#F44336',          // Red
  purple: '#9C27B0',       // Purple
  gray: '#757575',         // Gray
  lightGray: '#F5F5F5'     // Light Gray
};

const COLORS = [IHS_COLORS.primary, IHS_COLORS.blue, IHS_COLORS.secondary, IHS_COLORS.orange, IHS_COLORS.purple, IHS_COLORS.red];

const MetricCard = ({ title, value, subtitle, icon, color = IHS_COLORS.primary, trend = null }) => (
  <Card sx={{ 
    height: '100%', 
    background: 'white',
    borderRadius: 3,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      borderColor: color
    }
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h3" 
            component="div" 
            sx={{ 
              fontWeight: 800, 
              color: color,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
              mb: 1,
              lineHeight: 1.1
            }}
          >
            {value}
          </Typography>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              mb: 1,
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              fontWeight: 600,
              color: IHS_COLORS.primary
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '0.9rem' },
                fontWeight: 500
              }}
            >
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box display="flex" alignItems="center" mt={2}>
              <TrendingUp sx={{ 
                fontSize: { xs: 16, sm: 18 }, 
                color: trend > 0 ? IHS_COLORS.secondary : IHS_COLORS.red, 
                mr: 1 
              }} />
              <Typography 
                variant="caption" 
                color={trend > 0 ? IHS_COLORS.secondary : IHS_COLORS.red}
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  fontWeight: 600
                }}
              >
                {trend > 0 ? '+' : ''}{trend}% from last week
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ 
          bgcolor: color, 
          width: { xs: 48, sm: 56, md: 64 }, 
          height: { xs: 48, sm: 56, md: 64 },
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '& .MuiSvgIcon-root': {
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          }
        }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Use the axios instance which automatically handles the auth token
        const response = await axiosInstance.get('/api/analytics/dashboard');
        setAnalytics(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <LinearProgress sx={{ width: '50%' }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography color="error" align="center">{error}</Typography>
      </Container>
    );
  }

  // Safely destructure analytics data with fallbacks
  const { 
    overview = {}, 
    stageDistribution = {}, 
    jobMetrics = [], 
    trends = {} 
  } = analytics || {};
  
  // Debug logging for analytics data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Dashboard Analytics Debug ===');
    console.log('Overview:', overview);
    console.log('Stage Distribution:', stageDistribution);
    console.log('Job Metrics:', jobMetrics);
    console.log('Trends:', trends);
  }

  // Prepare chart data with defensive programming
  const stageData = stageDistribution && typeof stageDistribution === 'object' 
    ? Object.entries(stageDistribution).map(([stage, count]) => ({
        name: stage.replace('_', ' '),
        value: count,
        percentage: ((count / (overview.totalCandidates || 1)) * 100).toFixed(1)
      }))
    : [];

  const matchScoreData = ['excellent', 'good', 'fair', 'poor'].map(category => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count: (trends?.matchScoreDistribution?.[category]) || 0,
    percentage: (((trends?.matchScoreDistribution?.[category] || 0) / (overview?.totalCandidates || 1)) * 100).toFixed(1)
  }));

  const topJobs = Array.isArray(jobMetrics) && jobMetrics.length > 0
    ? jobMetrics
        .sort((a, b) => b.candidateCount - a.candidateCount)
        .slice(0, 5)
    : [];

  // Source of Hire data
  const sourceOfHireData = [
    { name: 'LinkedIn', value: analytics?.sourceOfHire?.linkedin || 0, color: '#0077B5' },
    { name: 'Referral', value: analytics?.sourceOfHire?.referral || 0, color: '#4CAF50' },
    { name: 'SmartRecruiter', value: analytics?.sourceOfHire?.smartrecruiter || 0, color: '#FF9800' },
    { name: 'Direct Application', value: analytics?.sourceOfHire?.direct || 0, color: '#9C27B0' },
    { name: 'Job Board', value: analytics?.sourceOfHire?.jobboard || 0, color: '#F44336' }
  ].filter(item => item.value > 0);

  // Rejection Reasons data - standardized reasons matching the hiring pipeline
  const rejectionReasonsData = [
    { reason: 'Did not fit company culture', count: analytics?.rejectionReasons?.culture || 0 },
    { reason: 'Did not meet desired qualifications', count: analytics?.rejectionReasons?.desiredQualifications || 0 },
    { reason: 'Did not meet minimum qualifications', count: analytics?.rejectionReasons?.minimumQualifications || 0 },
    { reason: 'Did not meet screening requirements', count: analytics?.rejectionReasons?.screeningRequirements || 0 },
    { reason: 'Incomplete application', count: analytics?.rejectionReasons?.incompleteApplication || 0 },
    { reason: 'Ineligible to work in location', count: analytics?.rejectionReasons?.ineligibleLocation || 0 },
    { reason: 'Misrepresented qualifications', count: analytics?.rejectionReasons?.misrepresented || 0 },
    { reason: 'More qualified candidate selected', count: analytics?.rejectionReasons?.moreQualified || 0 },
    { reason: 'No show for interview', count: analytics?.rejectionReasons?.noShow || 0 },
    { reason: 'Unresponsive', count: analytics?.rejectionReasons?.unresponsive || 0 },
    { reason: 'High Remuneration Expectations', count: analytics?.rejectionReasons?.highSalary || 0 },
    { reason: 'Overqualified', count: analytics?.rejectionReasons?.overqualified || 0 },
    { reason: 'Background Checks', count: analytics?.rejectionReasons?.backgroundCheck || 0 },
    { reason: 'Unsuccessful Skills Assessment', count: analytics?.rejectionReasons?.skillsAssessment || 0 },
    { reason: 'Other', count: analytics?.rejectionReasons?.other || 0 }
  ].filter(item => item.count > 0);

  // Debug logging for rejection reasons (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Dashboard Rejection Reasons Debug ===');
    console.log('Analytics rejection reasons:', analytics?.rejectionReasons);
    console.log('Filtered rejection reasons data:', rejectionReasonsData);
  }

  // Time to Hire data (in days)
  const timeToHireData = [
    { period: '0-7 days', count: analytics?.timeToHire?.week1 || 0 },
    { period: '8-14 days', count: analytics?.timeToHire?.week2 || 0 },
    { period: '15-30 days', count: analytics?.timeToHire?.month1 || 0 },
    { period: '31-60 days', count: analytics?.timeToHire?.month2 || 0 },
    { period: '60+ days', count: analytics?.timeToHire?.beyond || 0 }
  ];

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      minHeight: '100vh',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Modern Dashboard Header */}
        <Box sx={{ 
          mb: 4, 
          textAlign: 'center',
          background: 'white',
          borderRadius: 4,
          p: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800, 
              color: IHS_COLORS.primary,
              mb: 2,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' }
            }}
          >
            IHS Recruitment Dashboard
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: IHS_COLORS.gray,
              fontWeight: 500,
              maxWidth: '600px',
              mx: 'auto'
            }}
          >
            Comprehensive overview of your recruitment pipeline, candidate analytics, and hiring performance
          </Typography>
        </Box>

      {/* Overview Metrics */}
      <Grid container spacing={{ xs: 2, sm: 3 }} mb={{ xs: 2, sm: 3, md: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Jobs"
            value={overview.totalJobs}
            subtitle="Active positions"
            icon={<Work />}
            color="#0274B3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Candidates"
            value={overview.totalCandidates}
            subtitle="In pipeline"
            icon={<People />}
            color="#4FC3F7"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Match Score"
            value={`${overview.overallAvgMatchScore || 0}%`}
            subtitle="CV compatibility"
            icon={<Assessment />}
            color="#81C784"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Hired Candidates"
            value={overview.hiredCandidates || 0}
            subtitle="Successfully placed"
            icon={<CheckCircle />}
            color="#4CAF50"
          />
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Pipeline Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 }, 
            height: { xs: 350, sm: 400 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              Hiring Pipeline Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Match Score Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 }, 
            height: { xs: 350, sm: 400 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              CV Match Score Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={matchScoreData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Bar dataKey="count" fill="#0274B3" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Performing Jobs */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              Top Performing Jobs
            </Typography>
            <List>
              {topJobs.map((job, index) => (
                <React.Fragment key={job.id}>
                  <ListItem
                    button
                    onClick={() => navigate(`/job/${job.id}/candidates`)}
                    sx={{
                      '&:hover': { 
                        backgroundColor: IHS_COLORS.lightGray,
                        transform: 'translateX(4px)'
                      },
                      borderRadius: 2,
                      px: { xs: 2, sm: 3 },
                      py: 1.5,
                      transition: 'all 0.3s ease-in-out',
                      border: '1px solid transparent',
                      '&:hover': {
                        borderColor: IHS_COLORS.primary,
                        backgroundColor: IHS_COLORS.lightGray
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: COLORS[index % COLORS.length],
                        width: { xs: 36, sm: 44 },
                        height: { xs: 36, sm: 44 },
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            fontWeight: 600,
                            color: IHS_COLORS.primary
                          }}
                        >
                          {job.title}
                        </Typography>
                      }
                      secondary={
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          gap={1} 
                          mt={1}
                          sx={{ flexWrap: 'wrap' }}
                        >
                          <Chip
                            label={`${job.candidateCount} candidates`}
                            size="small"
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              fontWeight: 600,
                              bgcolor: IHS_COLORS.blue + '15',
                              color: IHS_COLORS.blue,
                              borderColor: IHS_COLORS.blue
                            }}
                          />
                          <Chip
                            label={`${(job.avgMatchScore || 0).toFixed(1)}% avg match`}
                            size="small"
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              fontWeight: 600,
                              bgcolor: IHS_COLORS.secondary + '15',
                              color: IHS_COLORS.secondary,
                              borderColor: IHS_COLORS.secondary
                            }}
                          />
                        </Box>
                      }
                    />
                    <Box display="flex" alignItems="center">
                      <Tooltip title="View candidates">
                        <IconButton 
                          size="small"
                          sx={{
                            color: IHS_COLORS.primary,
                            '&:hover': {
                              bgcolor: IHS_COLORS.primary + '15'
                            }
                          }}
                        >
                          <Star />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                  {index < topJobs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Card
                sx={{ 
                  cursor: 'pointer', 
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    borderColor: IHS_COLORS.primary
                  } 
                }}
                onClick={() => navigate('/jobs/new')}
              >
                <CardContent sx={{ py: { xs: 2, sm: 2.5 } }}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ 
                      bgcolor: IHS_COLORS.blue, 
                      mr: 2, 
                      width: 32, 
                      height: 32 
                    }}>
                      <Work sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Typography 
                      variant="body1"
                      sx={{ 
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        fontWeight: 600,
                        color: IHS_COLORS.primary
                      }}
                    >
                      Post New Job
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ 
                  cursor: 'pointer', 
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    borderColor: IHS_COLORS.secondary
                  } 
                }}
                onClick={() => navigate('/job-selection')}
              >
                <CardContent sx={{ py: { xs: 2, sm: 2.5 } }}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ 
                      bgcolor: IHS_COLORS.secondary, 
                      mr: 2, 
                      width: 32, 
                      height: 32 
                    }}>
                      <People sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Typography 
                      variant="body1"
                      sx={{ 
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        fontWeight: 600,
                        color: IHS_COLORS.primary
                      }}
                    >
                      Add Candidate
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ 
                  cursor: 'pointer', 
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    borderColor: IHS_COLORS.accent
                  } 
                }}
                onClick={() => navigate('/candidates')}
              >
                <CardContent sx={{ py: { xs: 2, sm: 2.5 } }}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ 
                      bgcolor: IHS_COLORS.accent, 
                      mr: 2, 
                      width: 32, 
                      height: 32 
                    }}>
                      <Assessment sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Typography 
                      variant="body1"
                      sx={{ 
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        fontWeight: 600,
                        color: IHS_COLORS.primary
                      }}
                    >
                      View All Candidates
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ 
                  cursor: 'pointer', 
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    borderColor: IHS_COLORS.orange
                  } 
                }}
                onClick={() => navigate('/jobs')}
              >
                <CardContent sx={{ py: { xs: 2, sm: 2.5 } }}>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ 
                      bgcolor: IHS_COLORS.orange, 
                      mr: 2, 
                      width: 32, 
                      height: 32 
                    }}>
                      <CheckCircle sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Typography 
                      variant="body1"
                      sx={{ 
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        fontWeight: 600,
                        color: IHS_COLORS.primary
                      }}
                    >
                      Manage Jobs
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>

        {/* Source of Hire Chart */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 }, 
            height: { xs: 350, sm: 400 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              Source of Hire
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourceOfHireData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {sourceOfHireData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Rejection Reasons Chart */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 }, 
            height: { xs: 350, sm: 400 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              Rejection Reasons
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rejectionReasonsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="reason" 
                  width={100}
                  fontSize={12}
                />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#F44336" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Time to Hire Chart */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ 
            p: { xs: 3, sm: 4 }, 
            height: { xs: 350, sm: 400 },
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'white'
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: IHS_COLORS.primary,
                mb: 2
              }}
            >
              Time to Hire
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeToHireData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis />
                <Bar dataKey="count" fill="#2196F3" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
        </Container>
      </Box>
    );
};

export default Dashboard;
