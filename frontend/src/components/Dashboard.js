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
  Legend
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

const COLORS = ['#0274B3', '#4FC3F7', '#81C784', '#FFB74D', '#F06292', '#BA68C8'];

const MetricCard = ({ title, value, subtitle, icon, color = '#0274B3', trend = null }) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
            {value}
          </Typography>
          <Typography variant="h6" component="div" sx={{ mb: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box display="flex" alignItems="center" mt={1}>
              <TrendingUp sx={{ fontSize: 16, color: trend > 0 ? 'success.main' : 'error.main', mr: 0.5 }} />
              <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                {trend > 0 ? '+' : ''}{trend}% from last week
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
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
        const response = await fetch('http://localhost:5000/api/analytics/dashboard');
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setAnalytics(data);
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

  const matchScoreData = Object.entries(trends.matchScoreDistribution).map(([category, count]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count,
    percentage: ((count / overview.totalCandidates) * 100).toFixed(1)
  }));

  const topJobs = jobMetrics
    .sort((a, b) => b.candidateCount - a.candidateCount)
    .slice(0, 5);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          HR Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Comprehensive view of your recruitment pipeline
        </Typography>
      </Box>

      {/* Overview Metrics */}
      <Grid container spacing={3} mb={4}>
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

      <Grid container spacing={3}>
        {/* Pipeline Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Hiring Pipeline Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
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
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              CV Match Score Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
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
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
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
                      borderRadius: 1
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={job.title}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Chip
                            label={`${job.candidateCount} candidates`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={`${job.avgMatchScore.toFixed(1)}% avg match`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                    <Box display="flex" alignItems="center">
                      <Tooltip title="View candidates">
                        <IconButton>
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
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/jobs/new')}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Work sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">Post New Job</Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/job-selection')}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center">
                    <People sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">Add Candidate</Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/candidates')}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Assessment sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">View All Candidates</Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate('/jobs')}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center">
                    <CheckCircle sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="body1">Manage Jobs</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
