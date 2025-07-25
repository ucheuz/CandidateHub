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
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  List,
  Stack,
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
  LinearProgress,
  Tooltip,
  CircularProgress
} from '@mui/material';
// Firebase imports
import { getDocs, collection, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc } from 'firebase/firestore';
import { addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useMsal } from '@azure/msal-react';
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
    {...other}>
    {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
  </div>
);

const BusinessSettings = () => {
  const { accounts } = useMsal();
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch the detailed user profile from Firestore using the logged-in MSAL account
  useEffect(() => {
    const fetchUserProfile = async (email) => {
      if (!email) {
        setLoadingProfile(false);
        return;
      }
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          setUserProfile({ id: querySnapshot.docs[0].id, ...userDoc });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (accounts.length > 0) {
      const userEmail = accounts[0].username;
      fetchUserProfile(userEmail);
    } else {
      setLoadingProfile(false);
    }
  }, [accounts]);

  // System Settings State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Fetch system settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      const settingsDocRef = doc(db, 'settings', 'system');
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          setSystemSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Could not fetch system settings", err);
      }
    };
    fetchSettings();
  }, []);

  // Access Management State
  const [appUsers, setAppUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState(null);

  // Fetch users from Firestore for the admin panel
  useEffect(() => {
    const fetchUsers = async () => {
      if (userProfile?.permissions === 'Admin') {
        setLoadingUsers(true);
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAppUsers(usersList);
        } catch (err) {
          setUserError('Failed to load users.');
        } finally {
          setLoadingUsers(false);
        }
      }
    };
    fetchUsers();
  }, [userProfile]); // Re-fetch when admin profile is confirmed

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
  const handleEditJob = async () => {
    try {
      const { id, ...jobData } = selectedJob;
      await updateDoc(doc(db, 'jobs', id), jobData);
      setJobs(jobs.map(j => j.id === id ? selectedJob : j));
      setEditJobDialog(false);
      setSelectedJob(null);
    } catch (err) {
      setJobError('Failed to update job');
    }
  };

  // Delete job handler
  const handleDeleteJob = async (jobId) => {
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setJobs(jobs.filter(j => j.id !== jobId));
      setConfirmDeleteJobOpen(false);
      setJobToDelete(null);
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

  // Dialog states
  const [selectedJob, setSelectedJob] = useState(null);
  const [editJobDialog, setEditJobDialog] = useState(false);
  const [editSkills, setEditSkills] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [confirmDeleteJobOpen, setConfirmDeleteJobOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', permissions: 'Hiring Manager' });

  const [editUserDialog, setEditUserDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  const [confirmDeleteUserOpen, setConfirmDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [confirmDeleteCandidate, setConfirmDeleteCandidate] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [confirmDeleteMemberOpen, setConfirmDeleteMemberOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
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
  const handleDeleteTeamMember = async () => {
    if (!memberToDelete) return;
    try {
      await deleteDoc(doc(db, 'teamMembers', memberToDelete.id));
      setTeamMembers(teamMembers.filter(m => m.id !== memberToDelete.id));
      setConfirmDeleteMemberOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      setTeamError('Failed to delete team member');
    }
  };

  const handleUpdateTeamMember = async () => {
    if (!memberToEdit) return;
    try {
      const { id, ...memberData } = memberToEdit;
      await updateDoc(doc(db, 'teamMembers', id), memberData);
      setTeamMembers(teamMembers.map(m => m.id === id ? memberToEdit : m));
      setEditMemberDialogOpen(false);
      setMemberToEdit(null);
    } catch (err) {
      setTeamError('Failed to update team member.');
    }
  };

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

  const handleSaveSystemSettings = async () => {
    if (userProfile?.permissions !== 'Admin') {
      setSaveError("You do not have permission to change system settings.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const settingsDocRef = doc(db, 'settings', 'system');
      // Use setDoc with merge:true to create or update the document.
      await setDoc(settingsDocRef, systemSettings, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setSaveError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // User Access Management Handlers
  const handleAddUserAccess = async () => {
    if (!newUser.name || !newUser.email || !newUser.permissions) return;
    try {
      const userRef = await addDoc(collection(db, 'users'), newUser);
      setAppUsers([...appUsers, { id: userRef.id, ...newUser }]);
      setAddUserDialog(false);
      setNewUser({ name: '', email: '', permissions: 'Hiring Manager' });
    } catch (err) {
      setUserError('Failed to add user.');
    }
  };

  const handleUpdateUserAccess = async () => {
    if (!userToEdit) return;
    try {
      const { id, ...userData } = userToEdit;
      await updateDoc(doc(db, 'users', id), userData);
      setAppUsers(appUsers.map(u => u.id === id ? userToEdit : u));
      setEditUserDialog(false);
      setUserToEdit(null);
    } catch (err) {
      setUserError('Failed to update user permissions.');
    }
  };

  const handleDeleteUserAccess = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setAppUsers(appUsers.filter(u => u.id !== userToDelete.id));
      setConfirmDeleteUserOpen(false);
      setUserToDelete(null);
    } catch (err) {
      setUserError('Failed to revoke user access.');
    }
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
      {loadingProfile && <LinearProgress sx={{ mb: 2 }} />}
      {!userProfile && !loadingProfile && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Please sign in to access business settings.
          </Alert>
        </Box>
      )}
      {userProfile && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">
            Logged in as: {userProfile.name} ({userProfile.email}) [{userProfile.permissions}]
          </Typography>
        </Box>
      )}
      <Paper elevation={2} sx={{ display: 'flex', borderRadius: 3, minHeight: '70vh', border: '1px solid', borderColor: 'divider' }}>
        <Grid container>
          <Grid item xs={12} md={3} sx={{ borderRight: { md: '1px solid' }, borderColor: { md: 'divider' } }}>
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={activeTab}
              onChange={handleTabChange}
              aria-label="Business settings tabs"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 64,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  px: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  alignItems: 'center',
                  flexDirection: 'row', // Keep icon and label in a row
                  gap: 2
                },
                '& .Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 'bold',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                },
              }}
            >
              <Tab icon={<Settings />} label="System Settings" />
              <Tab icon={<People />} label="Team Management" />
              <Tab icon={<Analytics />} label="Analytics & Reports" />
              <Tab icon={<Security />} label="Security & Compliance" />
              {userProfile?.permissions === 'Admin' && (
                <Tab icon={<Edit />} label="Job & Access Management" />
              )}
            </Tabs>
          </Grid>
          <Grid item xs={12} md={9}>
      {/* System Settings Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardHeader title="Notification Settings" subheader="Manage how your team receives updates." />
              <Divider />
              <CardContent>
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
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardHeader title="Workflow Settings" subheader="Automate and streamline your hiring process." />
              <Divider />
              <CardContent>
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
                <Button variant="contained" startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <Save />} onClick={handleSaveSystemSettings} disabled={isSaving || userProfile?.permissions !== 'Admin'}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
              </CardContent>
              {saveSuccess && <Alert severity="success" sx={{ m: 2, mt: 0 }}>Settings saved successfully!</Alert>}
              {saveError && <Alert severity="error" sx={{ m: 2, mt: 0 }}>{saveError}</Alert>}
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      {/* Team Management Tab */}
      <TabPanel value={activeTab} index={1}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardHeader
            title={`Team Members (${teamMembers.length})`}
            subheader="Manage roles and permissions for your team."
            action={
              userProfile?.permissions === 'Admin' && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleOpenAddMemberDialog}
                >
                  Add Member
                </Button>
              )
            }
          />
          <Divider />
          <CardContent>
          {loadingTeam ? <LinearProgress /> : teamError ? <Alert severity="error">{teamError}</Alert> : <List>
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
                {userProfile?.permissions === 'Admin' && (
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => { setMemberToEdit(member); setEditMemberDialogOpen(true); }}>
                      <Edit />
                    </IconButton>
                    <IconButton edge="end" onClick={() => { setMemberToDelete(member); setConfirmDeleteMemberOpen(true); }}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>}
          </CardContent>
        </Card>
      </TabPanel>
      {/* Analytics & Reports Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardHeader title="Report Scheduling" subheader="Automate the delivery of key recruitment reports." />
              <Divider />
              <CardContent>
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
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardHeader title="Data Export" subheader="Download your recruitment data for offline analysis." />
              <Divider />
              <CardContent>
              <Stack spacing={2}>
                <Button variant="outlined" startIcon={<Download />}>
                  Export All Candidates
                </Button>
                <Button variant="outlined" startIcon={<Download />}>
                  Export Job Analytics
                </Button>
                <Button variant="outlined" startIcon={<Download />}>
                  Export Pipeline Data
                </Button>
              </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      {/* Security & Compliance Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardHeader title="Data Security" subheader="Review your data protection and security settings." />
              <Divider />
              <CardContent>
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
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardHeader title="Compliance Reports" subheader="Generate reports for auditing and compliance." />
              <Divider />
              <CardContent>
              <Stack spacing={2}>
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
              </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      {/* Job & Access Management Tab (Admin only) */}
      {userProfile?.permissions === 'Admin' && (
<TabPanel value={activeTab} index={4}>
  <Grid container spacing={{ xs: 2, md: 3 }}>
    {/* Job Management Section */}
    <Grid item xs={12} md={6}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
        <CardHeader
          title="Manage Jobs"
          subheader="Edit or delete existing job postings."
          action={
            <IconButton onClick={() => { /* Add refresh logic if needed */ }}>
              <Refresh />
            </IconButton>
          }
        />
        <CardContent>
          {loadingJobs ? <LinearProgress /> : jobError ? <Alert severity="error">{jobError}</Alert> : (
            <List>
              {jobs.map(job => (
                <ListItem key={job.id} divider>
                  <ListItemText primary={job.title} secondary={job.location} />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit Job">
                      <IconButton edge="end" onClick={() => { setSelectedJob(job); setEditJobDialog(true); }}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Job">
                      <IconButton edge="end" onClick={() => { setJobToDelete(job); setConfirmDeleteJobOpen(true); }}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>

    {/* User Access Management Section */}
    <Grid item xs={12} md={6}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
        <CardHeader
          title="Manage User Access"
          subheader="Grant or revoke application access."
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => setAddUserDialog(true)}>
              Add User
            </Button>
          }
        />
        <CardContent>
          {loadingUsers ? <LinearProgress /> : userError ? <Alert severity="error">{userError}</Alert> : (
            <List>
              {appUsers.map(user => (
                <ListItem key={user.id} divider>
                  <ListItemText primary={user.name} secondary={user.email} />
                  <Chip label={user.permissions} size="small" sx={{ mr: 4 }} />
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit Permissions">
                      <IconButton edge="end" onClick={() => { setUserToEdit(user); setEditUserDialog(true); }}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revoke Access">
                      <IconButton edge="end" onClick={() => { setUserToDelete(user); setConfirmDeleteUserOpen(true); }}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
</TabPanel>
      )}
          </Grid>
        </Grid>
      </Paper>

      

      {/* Edit Job Dialog */}
      <Dialog open={editJobDialog} onClose={() => setEditJobDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Job</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Job Title" value={selectedJob?.title || ''} onChange={(e) => setSelectedJob({ ...selectedJob, title: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} label="Description" value={selectedJob?.description || ''} onChange={(e) => setSelectedJob({ ...selectedJob, description: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Required Skills (comma-separated)" value={Array.isArray(selectedJob?.required_skills) ? selectedJob.required_skills.join(', ') : ''} onChange={(e) => setSelectedJob({ ...selectedJob, required_skills: e.target.value.split(',').map(s => s.trim()) })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditJobDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditJob}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Job Dialog */}
      <Dialog open={confirmDeleteJobOpen} onClose={() => setConfirmDeleteJobOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the job "{jobToDelete?.title}"? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteJobOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDeleteJob(jobToDelete.id)}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Add User Access Dialog */}
      <Dialog open={addUserDialog} onClose={() => setAddUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Permission Level</InputLabel>
                <Select
                  value={newUser.permissions}
                  onChange={(e) => setNewUser({ ...newUser, permissions: e.target.value })}
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
          <Button onClick={() => setAddUserDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUserAccess}>
            Grant Access
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Edit Team Member Dialog */}
      <Dialog open={editMemberDialogOpen} onClose={() => setEditMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={memberToEdit?.name || ''}
                onChange={(e) => setMemberToEdit({...memberToEdit, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={memberToEdit?.email || ''}
                onChange={(e) => setMemberToEdit({...memberToEdit, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={memberToEdit?.role || ''}
                onChange={(e) => setMemberToEdit({...memberToEdit, role: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Permission Level</InputLabel>
                <Select
                  value={memberToEdit?.permissions || ''}
                  onChange={(e) => setMemberToEdit({...memberToEdit, permissions: e.target.value})}
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
          <Button onClick={() => setEditMemberDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTeamMember}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Team Member Dialog */}
      <Dialog open={confirmDeleteMemberOpen} onClose={() => setConfirmDeleteMemberOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the team member "{memberToDelete?.name}"? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteMemberOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteTeamMember}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Access Dialog */}
      <Dialog open={editUserDialog} onClose={() => setEditUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Permissions</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Editing permissions for: <strong>{userToEdit?.email}</strong></Typography>
          <FormControl fullWidth>
            <InputLabel>Permission Level</InputLabel>
            <Select
              value={userToEdit?.permissions || ''}
              onChange={(e) => setUserToEdit({ ...userToEdit, permissions: e.target.value })}
              label="Permission Level"
            >
              <MenuItem value="Hiring Manager">Hiring Manager</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateUserAccess}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Revoke User Access Dialog */}
      <Dialog open={confirmDeleteUserOpen} onClose={() => setConfirmDeleteUserOpen(false)}>
        <DialogTitle>Confirm Access Revocation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to revoke access for "{userToDelete?.email}"? They will no longer be able to sign in.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteUserOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUserAccess}>Revoke Access</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BusinessSettings;