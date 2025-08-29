import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  CloudSync as CloudSyncIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axiosInstance from '../api/axiosInstance';

const SmartRecruitersSync = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncDialog, setSyncDialog] = useState(false);
  const [syncResults, setSyncResults] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      fetchJobs();
    } else if (activeTab === 2) {
      fetchCandidates();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/smartrecruiters/dashboard');
      if (response.data.success) {
        setDashboardData(response.data.dashboard);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await axiosInstance.get('/api/smartrecruiters/jobs');
      if (response.data.success) {
        setJobs(response.data.jobs);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs data');
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await axiosInstance.get('/api/smartrecruiters/candidates');
      if (response.data.success) {
        setCandidates(response.data.candidates);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to load candidates data');
    }
  };

  const handleForceSync = async (type = 'all') => {
    try {
      setSyncing(true);
      setSyncDialog(true);
      setSyncResults(null);

      const response = await axiosInstance.post('/api/smartrecruiters/force-sync', {
        type: type
      });

      if (response.data.success) {
        setSyncResults(response.data.results);
        // Refresh data
        await fetchDashboardData();
        if (activeTab === 1) await fetchJobs();
        if (activeTab === 2) await fetchCandidates();
      }
    } catch (err) {
      console.error('Error during force sync:', err);
      setError('Force sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusChip = (status, syncStatus) => {
    if (syncStatus === 'ERROR') {
      return <Chip label="Error" color="error" size="small" icon={<ErrorIcon />} />;
    }
    
    switch (status || syncStatus) {
      case 'SYNCED':
        return <Chip label="Synced" color="success" size="small" icon={<CheckCircleIcon />} />;
      case 'PENDING':
        return <Chip label="Pending" color="warning" size="small" icon={<PendingIcon />} />;
      case 'NEW':
        return <Chip label="New" color="info" size="small" />;
      case 'IN_REVIEW':
        return <Chip label="In Review" color="primary" size="small" />;
      case 'INTERVIEW':
        return <Chip label="Interview" color="secondary" size="small" />;
      case 'OFFER':
        return <Chip label="Offer" color="success" size="small" />;
      case 'HIRE':
        return <Chip label="Hired" color="success" size="small" />;
      case 'REJECTED':
        return <Chip label="Rejected" color="error" size="small" />;
      default:
        return <Chip label={status || 'Unknown'} color="default" size="small" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const renderDashboard = () => {
    if (!dashboardData) return <CircularProgress />;

    const { jobs: jobsStats, candidates: candidatesStats } = dashboardData;

    return (
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WorkIcon color="primary" />
                <Box>
                  <Typography variant="h4" color="primary">
                    {jobsStats.with_smartrecruiters}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SmartRecruiters Jobs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PeopleIcon color="secondary" />
                <Box>
                  <Typography variant="h4" color="secondary">
                    {candidatesStats.with_smartrecruiters}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Synced Candidates
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {jobsStats.synced}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Jobs Synced
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {jobsStats.errors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sync Errors
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Status Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Job Sync Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Synced Jobs</Typography>
                  <Typography variant="body2">{jobsStats.synced}/{jobsStats.with_smartrecruiters}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={jobsStats.with_smartrecruiters > 0 ? (jobsStats.synced / jobsStats.with_smartrecruiters) * 100 : 0}
                  color="success"
                />
              </Box>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`${jobsStats.synced} Synced`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PendingIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`${jobsStats.pending} Pending`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`${jobsStats.errors} Errors`} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Candidate Status Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Candidate Application Status
              </Typography>
              <List dense>
                {Object.entries(candidatesStats.statuses || {}).map(([status, count]) => (
                  <ListItem key={status}>
                    <ListItemIcon>
                      {getStatusChip(status).props.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${status.replace('_', ' ')}: ${count}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<SyncIcon />}
                  onClick={() => handleForceSync('all')}
                  disabled={syncing}
                >
                  Sync All
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WorkIcon />}
                  onClick={() => handleForceSync('jobs')}
                  disabled={syncing}
                >
                  Sync Jobs Only
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  onClick={() => handleForceSync('candidates')}
                  disabled={syncing}
                >
                  Sync Candidates Only
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  Refresh Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderJobsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Job Title</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Posting UUID</TableCell>
            <TableCell>Sync Status</TableCell>
            <TableCell>SR Status</TableCell>
            <TableCell>Last Sync</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell>{job.title}</TableCell>
              <TableCell>{job.department}</TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {job.posting_uuid ? job.posting_uuid.substring(0, 8) + '...' : 'N/A'}
                </Typography>
              </TableCell>
              <TableCell>{getStatusChip(job.sync_status)}</TableCell>
              <TableCell>{getStatusChip(job.sr_status)}</TableCell>
              <TableCell>{formatDate(job.last_sync)}</TableCell>
              <TableCell>
                <Tooltip title="View in SmartRecruiters">
                  <IconButton
                    size="small"
                    disabled={!job.posting_uuid}
                    onClick={() => window.open(`https://jobs.smartrecruiters.com/posting/${job.posting_uuid}`, '_blank')}
                  >
                    <CloudSyncIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCandidatesTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Candidate Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Job Posting</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Last Sync</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell>{candidate.name}</TableCell>
              <TableCell>{candidate.email}</TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {candidate.posting_uuid ? candidate.posting_uuid.substring(0, 8) + '...' : 'N/A'}
                </Typography>
              </TableCell>
              <TableCell>{getStatusChip(candidate.status)}</TableCell>
              <TableCell>{formatDate(candidate.submitted_at)}</TableCell>
              <TableCell>{formatDate(candidate.last_sync)}</TableCell>
              <TableCell>
                <Tooltip title="View in SmartRecruiters">
                  <IconButton
                    size="small"
                    disabled={!candidate.sr_candidate_id}
                    onClick={() => window.open(`https://app.smartrecruiters.com/candidates/${candidate.sr_candidate_id}`, '_blank')}
                  >
                    <AssignmentIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderSyncDialog = () => (
    <Dialog open={syncDialog} onClose={() => setSyncDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <SyncIcon />
          SmartRecruiters Sync Results
        </Box>
      </DialogTitle>
      <DialogContent>
        {syncing ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
            <CircularProgress />
            <Typography>Syncing with SmartRecruiters...</Typography>
          </Box>
        ) : syncResults ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Sync completed successfully!
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h6" color="success.main">
                  {syncResults.jobs_synced}
                </Typography>
                <Typography variant="body2">Jobs Synced</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" color="secondary.main">
                  {syncResults.candidates_synced}
                </Typography>
                <Typography variant="body2">Candidates Synced</Typography>
              </Grid>
            </Grid>
            {syncResults.errors.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="error">
                  Errors ({syncResults.errors.length}):
                </Typography>
                <List dense>
                  {syncResults.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSyncDialog(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading SmartRecruiters data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <DashboardIcon />
                Dashboard
              </Box>
            }
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <WorkIcon />
                Jobs
                {dashboardData && (
                  <Badge badgeContent={dashboardData.jobs.with_smartrecruiters} color="primary" />
                )}
              </Box>
            }
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PeopleIcon />
                Candidates
                {dashboardData && (
                  <Badge badgeContent={dashboardData.candidates.with_smartrecruiters} color="secondary" />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {activeTab === 0 && renderDashboard()}
      {activeTab === 1 && renderJobsTable()}
      {activeTab === 2 && renderCandidatesTable()}

      {renderSyncDialog()}
    </Box>
  );
};

export default SmartRecruitersSync;
