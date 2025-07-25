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

const COLORS = ['#0274B3', '#4FC3F7', '#81C784', '#FFB74D', '#F06292', '#BA68C8'];

const MetricCard = ({ title, value, subtitle, icon, color = '#0274B3', trend = null }) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              fontWeight: 'bold', 
              color,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            {value}
          </Typography>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              mb: 1,
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' }
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            >
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box display="flex" alignItems="center" mt={1}>
              <TrendingUp sx={{ fontSize: { xs: 14, sm: 16 }, color: trend > 0 ? 'success.main' : 'error.main', mr: 0.5 }} />
              <Typography 
                variant="caption" 
                color={trend > 0 ? 'success.main' : 'error.main'}
                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              >
                {trend > 0 ? '+' : ''}{trend}% from last week
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ 
          bgcolor: color, 
          width: { xs: 40, sm: 48, md: 56 }, 
          height: { xs: 40, sm: 48, md: 56 }
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

  const { overview, stageDistribution, jobMetrics, trends } = analytics;

  // Prepare chart data
  const stageData = Object.entries(stageDistribution).map(([stage, count]) => ({
    name: stage.replace('_', ' '),
    value: count,
    percentage: ((count / overview.totalCandidates) * 100).toFixed(1)
  }));

  const matchScoreData = ['excellent', 'good', 'fair', 'poor'].map(category => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count: trends.matchScoreDistribution[category] || 0,
    percentage: (((trends.matchScoreDistribution[category] || 0) / overview.totalCandidates) * 100).toFixed(1)
  }));

  const topJobs = jobMetrics
    .sort((a, b) => b.candidateCount - a.candidateCount)
    .slice(0, 5);

  // Source of Hire data
  const sourceOfHireData = [
    { name: 'LinkedIn', value: analytics.sourceOfHire?.linkedin || 0, color: '#0077B5' },
    { name: 'Referral', value: analytics.sourceOfHire?.referral || 0, color: '#4CAF50' },
    { name: 'SmartRecruiter', value: analytics.sourceOfHire?.smartrecruiter || 0, color: '#FF9800' },
    { name: 'Direct Application', value: analytics.sourceOfHire?.direct || 0, color: '#9C27B0' },
    { name: 'Job Board', value: analytics.sourceOfHire?.jobboard || 0, color: '#F44336' }
  ].filter(item => item.value > 0);

  // Rejection Reasons data - standardized reasons matching the hiring pipeline
  const rejectionReasonsData = [
    { reason: 'Did not fit company culture', count: analytics.rejectionReasons?.culture || 0 },
    { reason: 'Did not meet desired qualifications', count: analytics.rejectionReasons?.desiredQualifications || 0 },
    { reason: 'Did not meet minimum qualifications', count: analytics.rejectionReasons?.minimumQualifications || 0 },
    { reason: 'Did not meet screening requirements', count: analytics.rejectionReasons?.screeningRequirements || 0 },
    { reason: 'Incomplete application', count: analytics.rejectionReasons?.incompleteApplication || 0 },
    { reason: 'Ineligible to work in location', count: analytics.rejectionReasons?.ineligibleLocation || 0 },
    { reason: 'Misrepresented qualifications', count: analytics.rejectionReasons?.misrepresented || 0 },
    { reason: 'More qualified candidate selected', count: analytics.rejectionReasons?.moreQualified || 0 },
    { reason: 'No show for interview', count: analytics.rejectionReasons?.noShow || 0 },
    { reason: 'Unresponsive', count: analytics.rejectionReasons?.unresponsive || 0 },
    { reason: 'High Remuneration Expectations', count: analytics.rejectionReasons?.highSalary || 0 },
    { reason: 'Overqualified', count: analytics.rejectionReasons?.overqualified || 0 },
    { reason: 'Background Checks', count: analytics.rejectionReasons?.backgroundCheck || 0 },
    { reason: 'Unsuccessful Skills Assessment', count: analytics.rejectionReasons?.skillsAssessment || 0 },
    { reason: 'Other', count: analytics.rejectionReasons?.other || 0 }
  ].filter(item => item.count > 0);

  // Debug logging for rejection reasons
  console.log('=== Dashboard Rejection Reasons Debug ===');
  console.log('Analytics rejection reasons:', analytics.rejectionReasons);
  console.log('Filtered rejection reasons data:', rejectionReasonsData);

  // Time to Hire data (in days)
  const timeToHireData = [
    { period: '0-7 days', count: analytics.timeToHire?.week1 || 0 },
    { period: '8-14 days', count: analytics.timeToHire?.week2 || 0 },
    { period: '15-30 days', count: analytics.timeToHire?.month1 || 0 },
    { period: '31-60 days', count: analytics.timeToHire?.month2 || 0 },
    { period: '60+ days', count: analytics.timeToHire?.beyond || 0 }
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box mb={{ xs: 2, sm: 3, md: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          HR Dashboard
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          Comprehensive view of your recruitment pipeline
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
            value={`${overview.averageMatchScore}%`}
            subtitle="CV compatibility"
            icon={<Assessment />}
            color="#81C784"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Recent Candidates"
            value={overview.recentCandidates}
            subtitle="Last 7 days"
            icon={<Schedule />}
            color="#FFB74D"
          />
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Pipeline Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: { xs: 350, sm: 400 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
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
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: { xs: 350, sm: 400 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
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
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
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
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderRadius: 1,
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: COLORS[index % COLORS.length],
                        width: { xs: 32, sm: 40 },
                        height: { xs: 32, sm: 40 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body1" 
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
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
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                          />
                          <Chip
                            label={`${job.avgMatchScore.toFixed(1)}% avg match`}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                          />
                        </Box>
                      }
                    />
                    <Box display="flex" alignItems="center">
                      <Tooltip title="View candidates">
                        <IconButton size="small">
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
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/jobs/new')}
              >
                <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
                  <Box display="flex" alignItems="center">
                    <Work sx={{ mr: 2, color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                    <Typography 
                      variant="body1"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      Post New Job
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/job-selection')}
              >
                <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
                  <Box display="flex" alignItems="center">
                    <People sx={{ mr: 2, color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                    <Typography 
                      variant="body1"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      Add Candidate
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/candidates')}
              >
                <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
                  <Box display="flex" alignItems="center">
                    <Assessment sx={{ mr: 2, color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                    <Typography 
                      variant="body1"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      View All Candidates
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/jobs')}
              >
                <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
                  <Box display="flex" alignItems="center">
                    <CheckCircle sx={{ mr: 2, color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                    <Typography 
                      variant="body1"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
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
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: { xs: 350, sm: 400 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
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
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: { xs: 350, sm: 400 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
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
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: { xs: 350, sm: 400 } }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
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
  );
};

export default Dashboard;
