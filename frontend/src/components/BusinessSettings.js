import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  LinearProgress
} from '@mui/material';
// Firebase imports
import { getDocs, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
Business,
Settings,
Notifications,
Security,
People,
IntegrationInstructions,
Analytics,
Email,
Phone,
LocationOn,
Edit,
Add,
Delete,
Save,
Refresh,
CloudUpload,
Download
} from '@mui/icons-material';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`settings-tabpanel-${index}`}
    aria-labelledby={`settings-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const BusinessSettings = () => {
  // Auth state: get currentUser from localStorage only
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser')) || null;
    } catch {
      return null;
    }
  });
  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };
  // Job & Access Management tab state
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobError, setJobError] = useState(null);

  // Fetch jobs from Firestore
  React.useEffect(() => {
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        const jobsSnapshot = await getDocs(collection(db, 'jobs'));
        const jobsList = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJobs(jobsList);
        setJobError(null);
      } catch (err) {
        setJobError('Failed to load jobs');
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  // Edit job handler
  const handleEditJob = async (updatedJob) => {
    try {
      await updateDoc(doc(db, 'jobs', updatedJob.id), updatedJob);
      setJobs(jobs.map(j => j.id === updatedJob.id ? updatedJob : j));
      setEditJobDialog(false);
    } catch (err) {
      setJobError('Failed to update job');
    }
  };

  // Delete job handler
  const handleDeleteJob = async (jobId) => {
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setJobs(jobs.filter(j => j.id !== jobId));
      setConfirmDeleteJob(false);
    } catch (err) {
      setJobError('Failed to delete job');
    }
  };

  // Update departmental skills handler
  const handleUpdateSkills = async (jobId, skills) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), { required_skills: skills });
      setJobs(jobs.map(j => j.id === jobId ? { ...j, required_skills: skills } : j));
      setEditSkills([]);
    } catch (err) {
      setJobError('Failed to update skills');
    }
  };
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [candidateError, setCandidateError] = useState(null);
  // Fetch candidates from Firestore
  React.useEffect(() => {
    const fetchCandidates = async () => {
      setLoadingCandidates(true);
      try {
        const candSnapshot = await getDocs(collection(db, 'candidates'));
        const candList = candSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCandidates(candList);
        setCandidateError(null);
      } catch (err) {
        setCandidateError('Failed to load candidates');
      } finally {
        setLoadingCandidates(false);
      }
    };
    fetchCandidates();
  }, []);

  // Delete candidate handler
  const handleDeleteCandidate = async (candId) => {
    try {
      await deleteDoc(doc(db, 'candidates', candId));
      setCandidates(candidates.filter(c => c.id !== candId));
      setConfirmDeleteCandidate(false);
    } catch (err) {
      setCandidateError('Failed to delete candidate');
    }
  };
  const [selectedJob, setSelectedJob] = useState(null);
  const [editJobDialog, setEditJobDialog] = useState(false);
  const [editSkills, setEditSkills] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState(false);
  const [confirmDeleteCandidate, setConfirmDeleteCandidate] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [companyInfo, setCompanyInfo] = useState({
    name: 'TechCorp Solutions',
    industry: 'Technology',
    size: '51-200 employees',
    location: 'San Francisco, CA',
    website: 'https://techcorp.com',
    description: 'Leading technology solutions provider',
    logo: null
  });

  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoArchiveAfterDays: 90,
    requireApprovalForOffers: true,
    allowBulkOperations: true,
    enableAIRecommendations: true,
    dataRetentionDays: 365
  });

  const [integrations, setIntegrations] = useState([
    { id: 1, name: 'LinkedIn Recruiter', status: 'connected', type: 'sourcing' },
    { id: 2, name: 'Indeed', status: 'disconnected', type: 'job_board' },
    { id: 3, name: 'Greenhouse', status: 'connected', type: 'ats' },
    { id: 4, name: 'Slack', status: 'connected', type: 'communication' },
    { id: 5, name: 'Zoom', status: 'disconnected', type: 'video' }
  ]);

  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState(null);
  // Fetch team members from Firestore
  React.useEffect(() => {
    const fetchTeam = async () => {
      setLoadingTeam(true);
      try {
        const teamSnapshot = await getDocs(collection(db, 'teamMembers'));
        const teamList = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeamMembers(teamList);
        setTeamError(null);
      } catch (err) {
        setTeamError('Failed to load team members');
      } finally {
        setLoadingTeam(false);
      }
    };
    fetchTeam();
  }, []);

  // Delete team member handler
  const handleDeleteTeamMember = async (memberId) => {
    try {
      await deleteDoc(doc(db, 'teamMembers', memberId));
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    } catch (err) {
      setTeamError('Failed to delete team member');
    }
  };

  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: '', permissions: 'Hiring Manager' });

  // Always reset permissions to a valid value when opening dialog
  const handleOpenAddMemberDialog = () => {
    setNewMember({ name: '', email: '', role: '', permissions: 'Hiring Manager' });
    setAddMemberDialog(true);
  };
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSaveCompanyInfo = () => {
    // Save company information
    console.log('Saving company info:', companyInfo);
  };

  const handleSaveSystemSettings = () => {
    // Save system settings
    console.log('Saving system settings:', systemSettings);
  };


  const handleAddTeamMember = async () => {
    if (newMember.name && newMember.email && newMember.role) {
      try {
        // Add to teamMembers collection
        const teamRef = collection(db, 'teamMembers');
        const teamDoc = await addDoc(teamRef, {
          name: newMember.name,
          email: newMember.email,
          role: newMember.role,
          permissions: newMember.permissions
        });
        setTeamMembers([...teamMembers, { ...newMember, id: teamDoc.id }]);

        // Check if user exists in users collection
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const userExists = usersSnapshot.docs.some(doc => doc.data().email === newMember.email);
        if (!userExists) {
          // Add to users collection with temporary password
          await addDoc(usersRef, {
            name: newMember.name,
            email: newMember.email,
            role: newMember.role,
            permissions: newMember.permissions,
            password: 'Temporary',
            mustChangePassword: true
          });
        }

        setNewMember({ name: '', email: '', role: '', permissions: 'Hiring Manager' });
        setAddMemberDialog(false);
      } catch (err) {
        setTeamError('Failed to add team member');
      }
    }
  };

  const getIntegrationIcon = (type) => {
    const icons = {
      sourcing: <People />,
      job_board: <Business />,
    ats: <IntegrationInstructions />,
      communication: <Email />,
      video: <Phone />
    };
    return icons[type] || <Settings />;
  };

  const getIntegrationColor = (status) => {
    return status === 'connected' ? 'success' : 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" sx={{ letterSpacing: 1, color: 'primary.main' }}>
          Business Settings
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          Configure your organisation's recruitment platform
        </Typography>
        <Divider sx={{ my: 2 }} />
      </Box>

      {/* Settings Navigation */}
      {!currentUser && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Please login from the Welcome/Login page to access business settings.
          </Alert>
        </Box>
      )}
      {currentUser && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Logged in as: {currentUser.name} ({currentUser.email}) [{currentUser.permissions}]</Typography>
        </Box>
      )}
      <Paper elevation={3} sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}
        >
          <Tab icon={<Settings />} label={<Box fontWeight={600}>System Settings</Box>} />
          <Tab icon={<People />} label={<Box fontWeight={600}>Team Management</Box>} />
          <Tab icon={<Analytics />} label={<Box fontWeight={600}>Analytics & Reports</Box>} />
          <Tab icon={<Security />} label={<Box fontWeight={600}>Security & Compliance</Box>} />
          {currentUser && currentUser.permissions === 'Admin' && (
            <Tab icon={<Edit />} label={<Box fontWeight={600}>Job & Access Management</Box>} />
          )}
        </Tabs>
      {/* System Settings Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notification Settings
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Email Notifications" secondary="Receive updates via email" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={systemSettings.emailNotifications}
                      onChange={(e) => setSystemSettings({...systemSettings, emailNotifications: e.target.checked})}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText primary="SMS Notifications" secondary="Receive urgent updates via SMS" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={systemSettings.smsNotifications}
                      onChange={(e) => setSystemSettings({...systemSettings, smsNotifications: e.target.checked})}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText primary="AI Recommendations" secondary="Enable AI-powered candidate suggestions" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={systemSettings.enableAIRecommendations}
                      onChange={(e) => setSystemSettings({...systemSettings, enableAIRecommendations: e.target.checked})}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Workflow Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Auto-archive after (days)"
                    value={systemSettings.autoArchiveAfterDays}
                    onChange={(e) => setSystemSettings({...systemSettings, autoArchiveAfterDays: parseInt(e.target.value)})}
                    helperText="Automatically archive inactive candidates"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Data retention period (days)"
                    value={systemSettings.dataRetentionDays}
                    onChange={(e) => setSystemSettings({...systemSettings, dataRetentionDays: parseInt(e.target.value)})}
                    helperText="How long to keep candidate data"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={systemSettings.requireApprovalForOffers}
                        onChange={(e) => setSystemSettings({...systemSettings, requireApprovalForOffers: e.target.checked})}
                      />
                    }
                    label="Require approval for job offers"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={systemSettings.allowBulkOperations}
                        onChange={(e) => setSystemSettings({...systemSettings, allowBulkOperations: e.target.checked})}
                      />
                    }
                    label="Allow bulk operations"
                  />
                </Grid>
              </Grid>
              <Box mt={3}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveSystemSettings}>
                  Save Settings
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      {/* Team Management Tab */}
      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Team Members ({teamMembers.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAddMemberDialog}
            >
              Add Member
            </Button>
          </Box>
          <List>
            {teamMembers.map((member) => (
              <ListItem key={member.id} divider>
                <ListItemIcon>
                  <Avatar>{member.name.charAt(0)}</Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={member.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {member.email} • {member.role}
                      </Typography>
                      <Chip label={member.permissions} size="small" sx={{ mt: 0.5 }} />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end">
                    <Edit />
                  </IconButton>
                  <IconButton edge="end">
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </TabPanel>
      {/* Analytics & Reports Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Report Scheduling
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Weekly Pipeline Report"
                    secondary="Every Monday at 9:00 AM"
                  />
                  <ListItemSecondaryAction>
                    <Switch defaultChecked />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Monthly Analytics Summary"
                    secondary="First day of each month"
                  />
                  <ListItemSecondaryAction>
                    <Switch defaultChecked />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Quarterly Business Review"
                    secondary="End of each quarter"
                  />
                  <ListItemSecondaryAction>
                    <Switch />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Export
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button variant="outlined" startIcon={<Download />}>
                  Export All Candidates
                </Button>
                <Button variant="outlined" startIcon={<Download />}>
                  Export Job Analytics
                </Button>
                <Button variant="outlined" startIcon={<Download />}>
                  Export Pipeline Data
                </Button>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Exports are available in CSV, Excel, and PDF formats
                </Alert>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      {/* Security & Compliance Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Security
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="GDPR Compliance"
                    secondary="Enabled - Auto-delete after retention period"
                  />
                  <Chip label="Active" color="success" size="small" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="Data Encryption"
                    secondary="AES-256 encryption for all data"
                  />
                  <Chip label="Enabled" color="success" size="small" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="Access Logging"
                    secondary="Track all user access and actions"
                  />
                  <Chip label="Enabled" color="success" size="small" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Compliance Reports
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button variant="outlined" fullWidth>
                  Generate Security Audit Report
                </Button>
                <Button variant="outlined" fullWidth>
                  Data Processing Activities Record
                </Button>
                <Button variant="outlined" fullWidth>
                  User Access Report
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Last security audit: March 15, 2024
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      {/* Job & Access Management Tab (Admin only) */}
      {currentUser && currentUser.permissions === 'Admin' && (
        <TabPanel value={activeTab} index={4}>
          {/* ...existing code for Job & Access Management TabPanel... */}
        </TabPanel>
      )}
      </Paper>

      

      {/* Add Team Member Dialog */}
      <Dialog open={addMemberDialog} onClose={() => setAddMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={newMember.name}
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={newMember.role}
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Permission Level</InputLabel>
                <Select
                  value={newMember.permissions}
                  onChange={(e) => setNewMember({...newMember, permissions: e.target.value})}
                  label="Permission Level"
                >
                  <MenuItem value="Hiring Manager">Hiring Manager</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTeamMember}>
            Add Member
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BusinessSettings;
