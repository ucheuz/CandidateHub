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
  Typography,
  CircularProgress
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axiosInstance from '../api/axiosInstance';

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
  '& .rejected-row': {
    textDecoration: 'line-through',
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
    '&:hover': {
      backgroundColor: '#eeeeee',
    },
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
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'rejected', 'all'
  const [evaluatingCandidate, setEvaluatingCandidate] = useState(null);

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
      field: 'dateSubmitted', 
      headerName: 'Date Submitted', 
      flex: 1,
      valueGetter: (params) => {
        const timestamp = params.row.date_submitted;
        if (!timestamp) return 'N/A';
        // Handle both ISO string and Firestore timestamp formats
        if (typeof timestamp === 'string') {
          return new Date(timestamp).toLocaleDateString();
        } else if (timestamp && timestamp.seconds) {
          return formatFirestoreTimestamp(timestamp);
        }
        return 'N/A';
      },
      sortComparator: (v1, v2, param1, param2) => {
        const timestamp1 = param1.api.getCellValue(param1.id, 'date_submitted');
        const timestamp2 = param2.api.getCellValue(param2.id, 'date_submitted');
        
        // Handle both ISO string and Firestore timestamp formats
        let seconds1 = 0, seconds2 = 0;
        
        if (typeof timestamp1 === 'string') {
          seconds1 = new Date(timestamp1).getTime() / 1000;
        } else if (timestamp1 && timestamp1.seconds) {
          seconds1 = timestamp1.seconds;
        }
        
        if (typeof timestamp2 === 'string') {
          seconds2 = new Date(timestamp2).getTime() / 1000;
        } else if (timestamp2 && timestamp2.seconds) {
          seconds2 = timestamp2.seconds;
        }
        
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
      field: 'status', 
      headerName: 'Stage', 
      width: 130,
      sortComparator: (v1, v2, param1, param2) => {
        // Define pipeline order
        const order = [
          'NEW',
          'EVALUATED',
          'Evaluated',
          'Phone Screen',
          'Interview 1',
          'Interview 2',
          'Interview 3',
          'Hired'
        ];
        // Get index for each value
        const idx1 = order.indexOf(param1.value);
        const idx2 = order.indexOf(param2.value);
        // If not found, treat as lowest priority
        const safeIdx1 = idx1 === -1 ? -99 : idx1;
        const safeIdx2 = idx2 === -1 ? -99 : idx2;
        // Ascending: lower index first, Descending: higher index first
        return safeIdx1 - safeIdx2;
      },
      renderCell: (params) => {
        const status = params.value || 'NEW';
        // Map status to display names
        const statusDisplayMap = {
          'NEW': 'New',
          'EVALUATED': 'Evaluated',
          'Evaluated': 'Evaluated',
          'Phone Screen': 'Screening',
          'Interview 1': 'Interview 1',
          'Interview 2': 'Interview 2',
          'Interview 3': 'Interview 3',
          'Hired': 'Hired',
          'Rejected': 'Rejected'
        };
        const displayName = statusDisplayMap[status] || status;
        
        const stageColors = {
          'New': '#e3f2fd',        // Light blue
          'Evaluated': '#e8f5e9',  // Light green (different from New)
          'Screening': '#e3f2fd',  // Light blue
          'Interview 1': '#e8f5e9',
          'Interview 2': '#e8f5e9',
          'Interview 3': '#e8f5e9',
          'Hired': '#f3e5f5',      // Light purple
          'Rejected': '#ffebee',   // Light red
        };
        return (
          <Chip
            label={displayName}
            size="small"
            className={`status-${displayName.toLowerCase().replace(/\s/g, '-')}`}
            sx={{
              backgroundColor: stageColors[displayName] || '#f5f5f5',
              color: 'text.primary',
              '& .MuiChip-label': {
                color: 'text.primary',
              }
            }}
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => {
        const candidate = params.row;
        const isNewCandidate = candidate.stage === 'NEW' || candidate.status === 'NEW';
        const isEvaluated = candidate.evaluated === true;
        
        if (isNewCandidate && !isEvaluated) {
          return (
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={() => handleEvaluateCandidate(candidate.id)}
              disabled={evaluatingCandidate === candidate.id}
              sx={{
                bgcolor: '#0C3F05',
                '&:hover': { bgcolor: '#0a2f04' },
                fontSize: '0.75rem',
                px: 2,
                py: 0.5
              }}
            >
              {evaluatingCandidate === candidate.id ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                'Evaluate'
              )}
            </Button>
          );
        }
        
        if (isEvaluated) {
          return (
            <Chip
              label="Evaluated"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          );
        }
        
        return null;
      }
    }
  ], [navigate, evaluatingCandidate]);

  const handleEvaluateCandidate = async (candidateId) => {
    try {
      setEvaluatingCandidate(candidateId);
      
      const response = await axiosInstance.post(`/api/candidates/${candidateId}/evaluate`);
      
      if (response.status === 200) {
        // Update the candidate in the local state
        setCandidates(prevCandidates => 
          prevCandidates.map(candidate => 
            candidate.id === candidateId 
              ? { 
                  ...candidate, 
                  evaluated: true,
                  stage: 'EVALUATED',
                  status: 'EVALUATED',
                  evaluation: response.data.evaluation,
                  cv_match_score: response.data.evaluation.match_score  // Update CV match score
                }
              : candidate
          )
        );
        
        // Show success message
        setError(null);
        console.log('Candidate evaluated successfully:', response.data);
      }
    } catch (error) {
      console.error('Error evaluating candidate:', error);
      setError('Failed to evaluate candidate. Please try again.');
    } finally {
      setEvaluatingCandidate(null);
    }
  };

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
          
          // Use stored sentiment analysis or default to Neutral
          let feedback = data.feedback_sentiment || 'Neutral';
          
          // If no sentiment analysis exists, trigger analysis
          if (!data.feedback_sentiment) {
            try {
              const response = await axiosInstance.post(`/api/candidates/${doc.id}/sentiment-analysis`);
              
              if (response.status === 200) {
                const sentimentData = response.data;
                feedback = sentimentData.sentiment;
              }
            } catch (error) {
              console.log(`Could not analyze sentiment for candidate ${doc.id}:`, error);
              // Keep default 'Neutral' if analysis fails
            }
          }
          
          const formattedData = {
            id: doc.id,
            ...data,
            // Use the merged name field if it exists, otherwise combine firstName + lastName
            name: data.name ? formatName(data.name) : formatName(`${data.firstName || ''} ${data.lastName || ''}`.trim()),
            feedback: feedback,
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
  }, [selectedJob, statusFilter]);

  // Filter candidates based on status filter
  const filteredCandidates = useMemo(() => {
    let filtered = [];
    
    if (statusFilter === 'active') {
      filtered = candidates.filter(c => c.status !== 'Rejected');
    } else if (statusFilter === 'rejected') {
      filtered = candidates.filter(c => c.status === 'Rejected');
    } else {
      // 'all' - show everything but with active candidates first
      const activeCandidates = candidates.filter(c => c.status !== 'Rejected');
      const rejectedCandidates = candidates.filter(c => c.status === 'Rejected');
      
      // Sort each group alphabetically by name
      const sortByName = (a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      };
      
      activeCandidates.sort(sortByName);
      rejectedCandidates.sort(sortByName);
      
      // Combine with active candidates first
      filtered = [...activeCandidates, ...rejectedCandidates];
    }
    
    return filtered;
  }, [candidates, statusFilter]);

  // Calculate counts for each stage
  const stageCounts = {
    NEW: candidates.filter(c => !c.status || c.status === 'NEW').length,
    EVALUATED: candidates.filter(c => c.status === 'EVALUATED' || c.status === 'Evaluated').length,
    SCREENING: candidates.filter(c => c.status === 'Phone Screen').length,
    'INTERVIEW 1': candidates.filter(c => c.status === 'Interview 1').length,
    'INTERVIEW 2': candidates.filter(c => c.status === 'Interview 2').length,
    'INTERVIEW 3': candidates.filter(c => c.status === 'Interview 3').length,
    OFFERED: candidates.filter(c => c.status === 'Hired').length,
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
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Paper sx={{ bgcolor: 'white', borderRadius: 3, boxShadow: 2, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
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
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="active">Active Candidates</MenuItem>
                <MenuItem value="rejected">Rejected Candidates</MenuItem>
                <MenuItem value="all">All Candidates</MenuItem>
              </Select>
            </FormControl>
          </Paper>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/job-selection')}
          >
            Add Candidate
          </Button>
        </Box>
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
      
      <Paper sx={{ bgcolor: 'white', borderRadius: 3, boxShadow: 2, p: 2 }}>
        <StyledDataGrid
          rows={filteredCandidates}
          columns={columns}
          loading={loading}
          autoHeight
          density="comfortable"
          disableSelectionOnClick
          getRowClassName={(params) => {
            const status = params.row.status || 'screening';
            // Map status to CSS class names
            const statusMap = {
              'NEW': 'screening',
              'Evaluated': 'screening',
              'Phone Screen': 'screening',
              'Interview 1': 'interview',
              'Interview 2': 'interview',
              'Interview 3': 'interview',
              'Hired': 'offer',
              'Rejected': 'rejected'
            };
            
            let className = `status-${statusMap[status] || 'screening'}`;
            
            // Add rejected row styling
            if (status === 'Rejected') {
              className += ' rejected-row';
            }
            
            return className;
          }}
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
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow: 0,
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
          }}
        />
      </Paper>
    </Box>
  );
};

export default CandidateList;
