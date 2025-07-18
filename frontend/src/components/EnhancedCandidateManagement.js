import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  FilterList,
  Sort,
  MoreVert,
  Edit,
  Delete,
  Archive,
  Email,
  Phone,
  Star,
  StarBorder,
  Schedule,
  Assessment,
  TrendingUp,
  Download,
  Share
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  '& .MuiDataGrid-cell': {
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '12px 16px',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: theme.palette.grey[50],
    borderBottom: `2px solid ${theme.palette.divider}`,
    borderRadius: '12px 12px 0 0',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  '& .MuiDataGrid-row': {
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.light + '20',
    },
  },
}));

const EnhancedCandidateManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [bulkActionsMenuAnchor, setBulkActionsMenuAnchor] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    jobId: '',
    stage: '',
    minMatchScore: '',
    source: ''
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockCandidates = [
      {
        id: '1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1 234-567-8900',
        jobTitle: 'Senior Software Engineer',
        jobId: 'job1',
        stage: 'INTERVIEW_1',
        cvMatchScore: 85,
        managerRating: 4.2,
        source: 'LinkedIn',
        appliedDate: new Date('2024-01-15'),
        lastActivity: new Date('2024-01-20'),
        status: 'Active',
        experience: '5+ years',
        skills: ['React', 'Node.js', 'Python'],
        notes: 3,
        starred: true
      },
      // Add more mock candidates...
    ];

    const mockJobs = [
      { id: 'job1', title: 'Senior Software Engineer' },
      { id: 'job2', title: 'Product Manager' },
      { id: 'job3', title: 'Data Scientist' }
    ];

    setCandidates(mockCandidates);
    setJobs(mockJobs);
    setLoading(false);
  }, []);

  const handleBulkAction = async (action) => {
    setBulkActionsMenuAnchor(null);
    
    try {
      switch (action) {
        case 'stage':
          // Implement bulk stage update
          break;
        case 'archive':
          // Implement bulk archive
          break;
        case 'delete':
          // Implement bulk delete
          break;
        case 'export':
          // Implement bulk export
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Bulk action error:', error);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'NEW': '#9e9e9e',
      'SCREENING': '#2196f3',
      'INTERVIEW_1': '#ff9800',
      'INTERVIEW_2': '#ff5722',
      'FINAL_INTERVIEW': '#e91e63',
      'OFFERED': '#4caf50',
      'HIRED': '#8bc34a',
      'REJECTED': '#f44336'
    };
    return colors[stage] || '#9e9e9e';
  };

  const columns = [
    {
      field: 'starred',
      headerName: '',
      width: 50,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => e.stopPropagation()}>
          {params.value ? (
            <Star sx={{ color: '#fdd835' }} />
          ) : (
            <StarBorder sx={{ color: '#bdbdbd' }} />
          )}
        </IconButton>
      ),
    },
    {
      field: 'name',
      headerName: 'Candidate',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            {params.value.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight={600}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'jobTitle',
      headerName: 'Position',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Applied {new Date(params.row.appliedDate).toLocaleDateString()}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'stage',
      headerName: 'Stage',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value.replace('_', ' ')}
          size="small"
          sx={{
            backgroundColor: getStageColor(params.value),
            color: 'white',
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      field: 'cvMatchScore',
      headerName: 'CV Match',
      width: 120,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={params.value}
            sx={{
              width: 60,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: params.value >= 80 ? '#4caf50' : params.value >= 60 ? '#ff9800' : '#f44336',
                borderRadius: 3,
              },
            }}
          />
          <Typography variant="caption" fontWeight={600}>
            {params.value}%
          </Typography>
        </Box>
      ),
    },
    {
      field: 'managerRating',
      headerName: 'Rating',
      width: 120,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              sx={{
                fontSize: 16,
                color: star <= params.value ? '#fdd835' : '#e0e0e0',
              }}
            />
          ))}
          <Typography variant="caption" sx={{ ml: 1 }}>
            {params.value.toFixed(1)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      width: 80,
      renderCell: (params) => (
        <Badge badgeContent={params.value} color="primary">
          <IconButton size="small">
            <Assessment />
          </IconButton>
        </Badge>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small">
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Email">
            <IconButton size="small">
              <Email />
            </IconButton>
          </Tooltip>
          <Tooltip title="More">
            <IconButton size="small">
              <MoreVert />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100vh', p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Candidate Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Advanced candidate tracking and management system
        </Typography>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {candidates.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Candidates
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {candidates.filter(c => c.stage === 'HIRED').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hired This Month
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {candidates.filter(c => c.stage.includes('INTERVIEW')).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Interviews
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light' }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {Math.round(candidates.reduce((sum, c) => sum + c.cvMatchScore, 0) / candidates.length)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Match Score
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light' }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search candidates..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          
          <Button
            startIcon={<FilterList />}
            onClick={() => setFilterDialogOpen(true)}
            variant="outlined"
          >
            Filters
          </Button>

          {selectedCandidates.length > 0 && (
            <Button
              startIcon={<Edit />}
              onClick={(e) => setBulkActionsMenuAnchor(e.currentTarget)}
              variant="contained"
              color="primary"
            >
              Bulk Actions ({selectedCandidates.length})
            </Button>
          )}

          <Box flexGrow={1} />

          <Button startIcon={<Download />} variant="outlined">
            Export
          </Button>
          
          <Button startIcon={<Share />} variant="outlined">
            Share
          </Button>
        </Box>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 'calc(100vh - 300px)' }}>
        <StyledDataGrid
          rows={candidates}
          columns={columns}
          loading={loading}
          checkboxSelection
          disableSelectionOnClick
          onSelectionModelChange={(selection) => setSelectedCandidates(selection)}
          components={{
            Toolbar: GridToolbar,
          }}
          componentsProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
        />
      </Paper>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkActionsMenuAnchor}
        open={Boolean(bulkActionsMenuAnchor)}
        onClose={() => setBulkActionsMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleBulkAction('stage')}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText primary="Update Stage" />
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('archive')}>
          <ListItemIcon><Archive /></ListItemIcon>
          <ListItemText primary="Archive" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleBulkAction('export')}>
          <ListItemIcon><Download /></ListItemIcon>
          <ListItemText primary="Export Selected" />
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('delete')} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete /></ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Advanced Filters</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Job Position</InputLabel>
                <Select
                  value={filters.jobId}
                  onChange={(e) => setFilters({...filters, jobId: e.target.value})}
                  label="Job Position"
                >
                  <MenuItem value="">All Positions</MenuItem>
                  {jobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>{job.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Stage</InputLabel>
                <Select
                  value={filters.stage}
                  onChange={(e) => setFilters({...filters, stage: e.target.value})}
                  label="Stage"
                >
                  <MenuItem value="">All Stages</MenuItem>
                  <MenuItem value="NEW">New</MenuItem>
                  <MenuItem value="SCREENING">Screening</MenuItem>
                  <MenuItem value="INTERVIEW_1">Interview 1</MenuItem>
                  <MenuItem value="INTERVIEW_2">Interview 2</MenuItem>
                  <MenuItem value="OFFERED">Offered</MenuItem>
                  <MenuItem value="HIRED">Hired</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min CV Match Score"
                type="number"
                value={filters.minMatchScore}
                onChange={(e) => setFilters({...filters, minMatchScore: e.target.value})}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={filters.source}
                  onChange={(e) => setFilters({...filters, source: e.target.value})}
                  label="Source"
                >
                  <MenuItem value="">All Sources</MenuItem>
                  <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                  <MenuItem value="Indeed">Indeed</MenuItem>
                  <MenuItem value="Direct">Direct Application</MenuItem>
                  <MenuItem value="Referral">Referral</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setFilterDialogOpen(false)} variant="contained">Apply Filters</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedCandidateManagement;
