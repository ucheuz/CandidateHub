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
  // Job & Access Management tab state
  const [jobs, setJobs] = useState([
    { id: 'job1', title: 'Software Engineer', required_skills: ['React', 'Python'], hiringManagers: ['Sarah Johnson'], department: 'Engineering' },
    { id: 'job2', title: 'Product Manager', required_skills: ['Agile', 'Leadership'], hiringManagers: ['Mike Chen'], department: 'Product' }
  ]);
  const [candidates, setCandidates] = useState([
    { id: 'cand1', name: 'Alice Smith', job_id: 'job1' },
    { id: 'cand2', name: 'Bob Lee', job_id: 'job2' }
  ]);
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

  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'Sarah Johnson', email: 'sarah@techcorp.com', role: 'HR Director', permissions: 'Admin' },
    { id: 2, name: 'Mike Chen', email: 'mike@techcorp.com', role: 'Recruiter', permissions: 'Editor' },
    { id: 3, name: 'Lisa Wang', email: 'lisa@techcorp.com', role: 'Hiring Manager', permissions: 'Viewer' }
  ]);

  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: '', permissions: 'Viewer' });

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

  const handleAddTeamMember = () => {
    if (newMember.name && newMember.email && newMember.role) {
      setTeamMembers([...teamMembers, { ...newMember, id: Date.now() }]);
      setNewMember({ name: '', email: '', role: '', permissions: 'Viewer' });
      setAddMemberDialog(false);
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
      <Paper elevation={3} sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}
        >
          <Tab icon={<Business />} label={<Box fontWeight={600}>Company Profile</Box>} />
          <Tab icon={<Settings />} label={<Box fontWeight={600}>System Settings</Box>} />
          <Tab icon={<People />} label={<Box fontWeight={600}>Team Management</Box>} />
          <Tab icon={<IntegrationInstructions />} label={<Box fontWeight={600}>Integrations</Box>} />
          <Tab icon={<Analytics />} label={<Box fontWeight={600}>Analytics & Reports</Box>} />
          <Tab icon={<Security />} label={<Box fontWeight={600}>Security & Compliance</Box>} />
          <Tab icon={<Edit />} label={<Box fontWeight={600}>Job & Access Management</Box>} />
        </Tabs>
      {/* Job & Access Management Tab */}
      <TabPanel value={activeTab} index={6}>
        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={700} color="primary.main">Job & Access Management</Typography>
          <Divider sx={{ mb: 3 }} />
          <Box mb={3}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Jobs</Typography>
            <Grid container spacing={2}>
              {jobs.map(job => (
                <Grid item xs={12} md={6} key={job.id}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>{job.title.charAt(0)}</Avatar>
                    <Box flexGrow={1}>
                      <Typography fontWeight={600}>{job.title}</Typography>
                      <Chip label={job.department} size="small" sx={{ ml: 1 }} />
                      <Box mt={0.5}>
                        <Chip label={job.required_skills.join(', ')} size="small" color="info" />
                      </Box>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button size="small" variant="outlined" onClick={() => { setSelectedJob(job); setEditJobDialog(true); }} title="Edit Job">Edit</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => { setSelectedJob(job); setConfirmDeleteJob(true); }} title="Delete Job">Delete</Button>
                      <Button size="small" variant="outlined" onClick={() => setEditSkills(job.required_skills)} title="Edit Skills">Skills</Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box mb={3}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Candidates</Typography>
            <Grid container spacing={2}>
              {candidates.map(cand => (
                <Grid item xs={12} md={6} key={cand.id}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>{cand.name.charAt(0)}</Avatar>
                    <Box flexGrow={1}>
                      <Typography fontWeight={600}>{cand.name}</Typography>
                    </Box>
                    <Button size="small" color="error" variant="outlined" onClick={() => { setSelectedCandidate(cand); setConfirmDeleteCandidate(true); }} title="Delete Candidate">Delete</Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box mb={3}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Hiring Managers</Typography>
            <Grid container spacing={2}>
              {teamMembers.map(member => (
                <Grid item xs={12} md={6} key={member.id}>
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>{member.name.charAt(0)}</Avatar>
                    <Box flexGrow={1}>
                      <Typography fontWeight={600}>{member.name}</Typography>
                      <Chip label={member.role} size="small" sx={{ ml: 1 }} />
                      <Chip label={member.permissions} size="small" sx={{ ml: 1 }} />
                    </Box>
                    <Button size="small" variant="outlined" title="Revoke Access">Revoke</Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Button size="small" variant="contained" sx={{ mt: 2 }} onClick={() => setAddMemberDialog(true)}>Add Access</Button>
          </Box>
        </Paper>
        {/* Edit Job Dialog */}
        <Dialog open={editJobDialog} onClose={() => setEditJobDialog(false)}>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogContent sx={{ minWidth: 320 }}>
            <TextField fullWidth label="Job Title" value={selectedJob?.title || ''} onChange={e => setSelectedJob({ ...selectedJob, title: e.target.value })} sx={{ mb: 2 }} helperText="Enter the job title" />
            <TextField fullWidth label="Department" value={selectedJob?.department || ''} onChange={e => setSelectedJob({ ...selectedJob, department: e.target.value })} sx={{ mb: 2 }} helperText="Department for this job" />
            <TextField fullWidth label="Hiring Managers" value={selectedJob?.hiringManagers?.join(', ') || ''} onChange={e => setSelectedJob({ ...selectedJob, hiringManagers: e.target.value.split(',').map(s => s.trim()) })} sx={{ mb: 2 }} helperText="Comma separated names" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditJobDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setEditJobDialog(false)}>Save</Button>
          </DialogActions>
        </Dialog>
        {/* Edit Skills Dialog */}
        <Dialog open={!!editSkills.length} onClose={() => setEditSkills([])}>
          <DialogTitle>Edit Departmental Skills</DialogTitle>
          <DialogContent sx={{ minWidth: 320 }}>
            <TextField fullWidth label="Skills (comma separated)" value={editSkills.join(', ')} onChange={e => setEditSkills(e.target.value.split(',').map(s => s.trim()))} helperText="List key skills for this job" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditSkills([])}>Cancel</Button>
            <Button variant="contained" onClick={() => setEditSkills([])}>Save</Button>
          </DialogActions>
        </Dialog>
        {/* Confirm Delete Job Dialog */}
        <Dialog open={confirmDeleteJob} onClose={() => setConfirmDeleteJob(false)}>
          <DialogTitle>Delete Job</DialogTitle>
          <DialogContent sx={{ minWidth: 320 }}>
            <Typography color="error.main">Are you sure you want to delete this job?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDeleteJob(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={() => setConfirmDeleteJob(false)}>Delete</Button>
          </DialogActions>
        </Dialog>
        {/* Confirm Delete Candidate Dialog */}
        <Dialog open={confirmDeleteCandidate} onClose={() => setConfirmDeleteCandidate(false)}>
          <DialogTitle>Delete Candidate</DialogTitle>
          <DialogContent sx={{ minWidth: 320 }}>
            <Typography color="error.main">Are you sure you want to delete this candidate?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDeleteCandidate(false)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={() => setConfirmDeleteCandidate(false)}>Delete</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>
      </Paper>

      {/* Company Profile Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Industry"
                    value={companyInfo.industry}
                    onChange={(e) => setCompanyInfo({...companyInfo, industry: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Company Size</InputLabel>
                    <Select
                      value={companyInfo.size}
                      onChange={(e) => setCompanyInfo({...companyInfo, size: e.target.value})}
                      label="Company Size"
                    >
                      <MenuItem value="1-10 employees">1-10 employees</MenuItem>
                      <MenuItem value="11-50 employees">11-50 employees</MenuItem>
                      <MenuItem value="51-200 employees">51-200 employees</MenuItem>
                      <MenuItem value="201-1000 employees">201-1000 employees</MenuItem>
                      <MenuItem value="1000+ employees">1000+ employees</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={companyInfo.location}
                    onChange={(e) => setCompanyInfo({...companyInfo, location: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={companyInfo.website}
                    onChange={(e) => setCompanyInfo({...companyInfo, website: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Company Description"
                    value={companyInfo.description}
                    onChange={(e) => setCompanyInfo({...companyInfo, description: e.target.value})}
                  />
                </Grid>
              </Grid>
              <Box mt={3}>
                <Button variant="contained" startIcon={<Save />} onClick={handleSaveCompanyInfo}>
                  Save Changes
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Company Logo
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Avatar sx={{ width: 120, height: 120, bgcolor: 'primary.main', fontSize: '3rem' }}>
                  {companyInfo.name.charAt(0)}
                </Avatar>
                <Button variant="outlined" startIcon={<CloudUpload />}>
                  Upload Logo
                </Button>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Recommended: Square image, minimum 200x200px
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* System Settings Tab */}
      <TabPanel value={activeTab} index={1}>
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
      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Team Members ({teamMembers.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddMemberDialog(true)}
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

      {/* Integrations Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {integrations.map((integration) => (
            <Grid item xs={12} sm={6} md={4} key={integration.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {getIntegrationIcon(integration.type)}
                      </Avatar>
                      <Typography variant="h6">
                        {integration.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={integration.status}
                      color={getIntegrationColor(integration.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {integration.type.replace('_', ' ').charAt(0).toUpperCase() + integration.type.replace('_', ' ').slice(1)}
                  </Typography>
                  <Button
                    variant={integration.status === 'connected' ? 'outlined' : 'contained'}
                    size="small"
                    fullWidth
                  >
                    {integration.status === 'connected' ? 'Configure' : 'Connect'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Analytics & Reports Tab */}
      <TabPanel value={activeTab} index={4}>
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
      <TabPanel value={activeTab} index={5}>
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
                  <MenuItem value="Viewer">Viewer</MenuItem>
                  <MenuItem value="Editor">Editor</MenuItem>
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
