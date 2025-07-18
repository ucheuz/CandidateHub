import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Rating,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Typography
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return 'N/A';
  try {
    const date = new Date(timestamp.seconds * 1000);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid Date';
  }
};

const formatName = (name) => {
  if (!name) return '';
  return name.toLowerCase().split(' ')
    .map(part => {
      // Handle hyphenated names
      if (part.includes('-')) {
        return part.split('-')
          .map(namePart => namePart.charAt(0).toUpperCase() + namePart.slice(1))
          .join('-');
      }
      // Handle Mc and Mac prefixes
      if (part.startsWith('mc') && part.length > 2) {
        return 'Mc' + part.charAt(2).toUpperCase() + part.slice(3);
      }
      if (part.startsWith('mac') && part.length > 3) {
        return 'Mac' + part.charAt(3).toUpperCase() + part.slice(4);
      }
      // Regular capitalization
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};

const StyledRating = styled(Rating)({
  '& .MuiRating-iconFilled': {
    color: '#1976d2',
  },
});

const StyledDataGrid = styled(DataGrid)({
  '& .status-screening': {
    // Background color removed
  },
  '& .status-interview': {
    // Background color removed
  },
  '& .status-offer': {
    // Background color removed
  },
  '& .status-rejected': {
    // Background color removed
  },
  '& .source-column .MuiChip-label': {
    color: '#000000',
  },
  '& .feedback-column .MuiChip-label': {
    color: '#000000',
  },
  '& .feedback-positive': {
    color: '#2e7d32',
  },
  '& .feedback-neutral': {
    color: '#ed6c02',
  },
  '& .feedback-negative': {
    color: '#d32f2f',
  },
});

const CandidateList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(searchParams.get('jobId') || null);
  const [jobs, setJobs] = useState([]);

  const columns = useMemo(() => [
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1,
      valueFormatter: (params) => formatName(params.value),
      renderCell: (params) => {
        const formattedName = formatName(params.value);
        return (
          <Button
            color="primary"
            onClick={() => navigate(`/candidates/${params.row.id}`)}
            sx={{ textTransform: 'none' }}  // This prevents button styling from affecting the case
          >
            {formattedName}
          </Button>
        );
      }
    },
    { 
      field: 'uploadDate', 
      headerName: 'Date Submitted', 
      flex: 1,
      valueGetter: (params) => {
        const timestamp = params.row.upload_date;
        if (!timestamp || !timestamp.seconds) return 'N/A';
        return formatFirestoreTimestamp(timestamp);
      },
      sortComparator: (v1, v2, param1, param2) => {
        const timestamp1 = param1.api.getCellValue(param1.id, 'upload_date');
        const timestamp2 = param2.api.getCellValue(param2.id, 'upload_date');
        const seconds1 = timestamp1?.seconds || 0;
        const seconds2 = timestamp2?.seconds || 0;
        return seconds1 - seconds2;
      }
    },
    { 
      field: 'cv_match_score',
      headerName: 'CV Match', 
      width: 160,
      valueGetter: (params) => {
        const matchScore = params.row.cv_match_score;
        if (matchScore === undefined || matchScore === null) return 0;
        return matchScore / 20; // Convert percentage to 5-star scale
      },
      renderCell: (params) => {
        const matchScore = params.row.cv_match_score;
        if (matchScore === undefined || matchScore === null) return null;
        
        return (
          <StyledRating
            value={matchScore / 20}
            readOnly
            precision={0.5}
            max={5}
          />
        );
      }
    },
    { 
      field: 'managerRating', 
      headerName: 'Manager Rating', 
      width: 150,
      renderCell: (params) => (
        <StyledRating
          value={params.value || 0}
          readOnly
          precision={0.5}
          max={5}
        />
      )
    },
    { 
      field: 'weightedAverage', 
      headerName: 'Weighted Average', 
      width: 150,
      valueGetter: (params) => {
        const cvScore = params.row.cv_match_score !== undefined ? params.row.cv_match_score / 20 : 0; // Convert percentage to 5-star scale
        const managerRating = params.row.managerRating || 0;
        return (cvScore * 0.4 + managerRating * 0.6).toFixed(2);
      },
      renderCell: (params) => (
        <StyledRating
          value={Number(params.value)}
          readOnly
          precision={0.5}
          max={5}
        />
      )
    },
    { 
      field: 'source', 
      headerName: 'Source', 
      width: 130,
      cellClassName: 'source-column',
      renderCell: (params) => (
        <Chip
          label={params.value || 'Direct'}
          size="small"
          color="default"
          variant="outlined"
        />
      )
    },
    { 
      field: 'screeningCall', 
      headerName: 'Screening', 
      width: 100,
      type: 'boolean',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Yes' : 'No'}
          size="small"
          color={params.value ? 'success' : 'default'}
          variant="outlined"
        />
      )
    },
    { 
      field: 'feedback', 
      headerName: 'Feedback', 
      width: 130,
      cellClassName: 'feedback-column',
      renderCell: (params) => {
        const value = params.value || 'Neutral';
        return (
          <Chip
            label={value}
            size="small"
            className={`feedback-${value.toLowerCase()}`}
            variant="outlined"
          />
        );
      }
    },
    { 
      field: 'stage', 
      headerName: 'Stage', 
      width: 130,
      renderCell: (params) => {
        const stage = params.value || 'Screening';
        const stageColors = {
          'Screening': '#e3f2fd',  // Light blue
          'Interview': '#e8f5e9',  // Light green
          'Offer': '#f3e5f5',     // Light purple
          'Rejected': '#ffebee',   // Light red
        };
        return (
          <Chip
            label={stage}
            size="small"
            className={`status-${stage.toLowerCase()}`}
            sx={{
              backgroundColor: stageColors[stage] || '#f5f5f5',
              color: 'text.primary',
              '& .MuiChip-label': {
                color: 'text.primary',
              }
            }}
          />
        );
      }
    }
  ], [navigate]);

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
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again later.');
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const candidatesRef = collection(db, 'candidates');
        let candidatesQuery = candidatesRef;
        
        if (selectedJob) {
          candidatesQuery = query(candidatesRef, where('job_id', '==', selectedJob));
        }
        
        const querySnapshot = await getDocs(candidatesQuery);
        const candidatesList = await Promise.all(querySnapshot.docs.map(async doc => {
          const data = doc.data();
          
          // Get latest notes for candidate
          const notesRef = collection(doc.ref, 'notes');
          const notesQuery = query(notesRef, orderBy('timestamp', 'desc'), limit(1));
          const notesSnapshot = await getDocs(notesQuery);
          const latestNote = notesSnapshot.docs[0]?.data();
          
          const formattedData = {
            id: doc.id,
            ...data,
            name: formatName(data.name),
            feedback: latestNote?.sentiment || 'Neutral',
          };
          return formattedData;
        }));
        
        setCandidates(candidatesList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates. Please try again later.');
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [selectedJob]);

  // Calculate counts for each stage
  const stageCounts = {
    NEW: candidates.filter(c => !c.stage || c.stage === 'NEW').length,
    SCREENING: candidates.filter(c => c.stage === 'SCREENING').length,
    'INTERVIEW 1': candidates.filter(c => c.stage === 'INTERVIEW 1').length,
    'INTERVIEW 2': candidates.filter(c => c.stage === 'INTERVIEW 2').length,
    OFFERED: candidates.filter(c => c.stage === 'OFFERED').length,
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', width: '100%', p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Job</InputLabel>
          <Select
            value={selectedJob || ''}
            onChange={(e) => {
              const newJobId = e.target.value;
              setSelectedJob(newJobId);
              if (newJobId) {
                navigate(`/candidates?jobId=${newJobId}`);
              } else {
                navigate('/candidates');
              }
            }}
            label="Filter by Job"
          >
            <MenuItem value="">
              <em>All Jobs</em>
            </MenuItem>
            {jobs.map((job) => (
              <MenuItem key={job.id} value={job.id}>
                {job.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/job-selection')}
        >
          Add Candidate
        </Button>
      </Box>

      {/* Stage Statistics Bar */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        justifyContent: 'space-between',
        width: '100%'
      }}>
        {Object.entries(stageCounts).map(([stage, count]) => (
          <Paper
            key={stage}
            elevation={1}
            sx={{
              p: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {count}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              {stage}
            </Typography>
          </Paper>
        ))}
      </Box>
      
      <StyledDataGrid
        rows={candidates}
        columns={columns}
        loading={loading}
        autoHeight
        density="comfortable"
        disableSelectionOnClick
        getRowClassName={(params) => `status-${(params.row.stage || 'screening').toLowerCase()}`}
        components={{
          Toolbar: GridToolbar,
        }}
        componentsProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        sx={{
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
        }}
      />
    </Box>
  );
};

export default CandidateList;
