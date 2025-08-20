import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  LinearProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
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
  Tooltip
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assessment,
  Schedule,
  CheckCircle,
  Star,
  WorkOutline
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';

// Modern gradient and vibrant colors for pipeline stages
const PIPELINE_COLORS = [
  'url(#blueGradient)',
  'url(#greenGradient)',
  'url(#orangeGradient)',
  'url(#pinkGradient)',
  'url(#purpleGradient)',
  'url(#tealGradient)',
  'url(#goldGradient)'
];

const MetricCard = ({ title, value, change, changeType, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" color={color} fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {title}
          </Typography>
          {change && (
            <Box display="flex" alignItems="center">
              {changeType === 'increase' ? (
                <TrendingUp sx={{ fontSize: 20, color: 'success.main', mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ fontSize: 20, color: 'error.main', mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                color={changeType === 'increase' ? 'success.main' : 'error.main'}
              >
                {change}% vs last month
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

const JobAnalytics = () => {
  const { jobId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobAnalytics = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/analytics`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Error fetching job analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobAnalytics();
    }
  }, [jobId]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography>No analytics data available</Typography>
      </Container>
    );
  }

  const { jobDetails, candidateMetrics, topCandidates } = analytics;

  // Prepare stage distribution data for chart
  const stageData = Object.entries(candidateMetrics.stageDistribution).map(([stage, count]) => ({
    name: stage.replace('_', ' '),
    value: count,
    percentage: ((count / candidateMetrics.total) * 100).toFixed(1)
  }));

  // Mock time series data for hiring funnel
  const funnelData = [
    { stage: 'Applied', count: candidateMetrics.total, percentage: 100 },
    { stage: 'Screening', count: Math.floor(candidateMetrics.total * 0.7), percentage: 70 },
    { stage: 'Interview 1', count: Math.floor(candidateMetrics.total * 0.4), percentage: 40 },
    { stage: 'Interview 2', count: Math.floor(candidateMetrics.total * 0.2), percentage: 20 },
    { stage: 'Offer', count: Math.floor(candidateMetrics.total * 0.1), percentage: 10 },
    { stage: 'Hired', count: Math.floor(candidateMetrics.total * 0.05), percentage: 5 }
  ];

  // Skills demand analysis (mock data)
  const skillsData = jobDetails.requiredSkills?.slice(0, 6).map((skill, index) => ({
    skill,
    demand: Math.floor(Math.random() * 50) + 50,
    availability: Math.floor(Math.random() * 40) + 30
  })) || [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Job Analytics: {jobDetails.title}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Comprehensive recruitment performance analysis
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Applications"
            value={candidateMetrics.total}
            change={15}
            changeType="increase"
            icon={<People />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Match Score"
            value={`${candidateMetrics.averageMatchScore}%`}
            change={8}
            changeType="increase"
            icon={<Assessment />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Time to Hire"
            value="14 days"
            change={-12}
            changeType="decrease"
            icon={<Schedule />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Conversion Rate"
            value="5.2%"
            change={3}
            changeType="increase"
            icon={<CheckCircle />}
            color="info.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Pipeline Distribution - visually enhanced */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)', boxShadow: 4, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#0274B3', letterSpacing: 1 }}>
              Candidate Pipeline Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0274B3" />
                    <stop offset="100%" stopColor="#4FC3F7" />
                  </linearGradient>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#43e97b" />
                    <stop offset="100%" stopColor="#38f9d7" />
                  </linearGradient>
                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffb347" />
                    <stop offset="100%" stopColor="#ffcc80" />
                  </linearGradient>
                  <linearGradient id="pinkGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f06292" />
                    <stop offset="100%" stopColor="#ba68c8" />
                  </linearGradient>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7b1fa2" />
                    <stop offset="100%" stopColor="#9575cd" />
                  </linearGradient>
                  <linearGradient id="tealGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#26c6da" />
                    <stop offset="100%" stopColor="#80deea" />
                  </linearGradient>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#fff9c4" />
                  </linearGradient>
                </defs>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  dataKey="value"
                  label={({ name, percentage, value }) => (
                    <text style={{ fontWeight: 600, fontSize: 14, fill: '#343a40', filter: 'drop-shadow(0 1px 2px #fff)' }}>
                      {name}: {value} ({percentage}%)
                    </text>
                  )}
                  labelLine={false}
                  isAnimationActive={true}
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0274B322', color: '#0274B3', fontWeight: 500 }}
                  itemStyle={{ color: '#0274B3', fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontWeight: 600, fontSize: 15, color: '#0274B3', marginTop: 10 }}
                  iconType="circle"
                  align="center"
                  layout="horizontal"
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Hiring Funnel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Hiring Funnel Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" />
                <Tooltip />
                <Bar dataKey="count" fill="#0274B3" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Candidates */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <CardHeader
              title="Top Performing Candidates"
              action={
                <Button variant="outlined" size="small">
                  View All
                </Button>
              }
            />
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Match Score</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar>{candidate.name?.charAt(0)}</Avatar>
                        <Typography variant="body2" fontWeight={500}>
                          {candidate.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={candidate.stage?.replace('_', ' ')} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={candidate.matchScore}
                          sx={{ width: 60, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="body2">
                          {candidate.matchScore}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Star sx={{ color: '#fdd835', fontSize: 18, mr: 0.5 }} />
                        <Typography variant="body2">
                          4.2/5
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label="Active" size="small" color="success" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* Skills Analysis - Source of Hire chart hidden for now */}
        {/* <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Skills Demand vs Availability
            </Typography>
            <List dense>
              {skillsData.map((skill, index) => (
                <ListItem key={skill.skill}>
                  <ListItemIcon>
                    <WorkOutline />
                  </ListItemIcon>
                  <ListItemText
                    primary={skill.skill}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Demand: {skill.demand}% | Available: {skill.availability}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(skill.availability / skill.demand) * 100}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid> */}

        {/* Job Performance Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Job Performance Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    92%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Job Satisfaction Score
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    14 days
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Time to Hire
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    $2,500
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cost per Hire
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    95%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Offer Acceptance Rate
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default JobAnalytics;
