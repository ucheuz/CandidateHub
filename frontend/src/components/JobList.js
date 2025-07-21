import React, { useState, useEffect, useMemo } from 'react';
import { Container, Typography, Button, Box, useTheme, useMediaQuery } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  return dayjs(timestamp.seconds * 1000).format('MMM D, YYYY');
};

const JobList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiredCandidates, setHiredCandidates] = useState([]);

  const columns = useMemo(() => [
    {
      field: 'title',
      headerName: 'Job Role',
      flex: isMobile ? 1 : 1.5,
      minWidth: isMobile ? 150 : 200,
      renderCell: (params) => (
        <Button
          color="primary"
          onClick={() => navigate(`/candidates?jobId=${params.row.id}`)}
          sx={{ 
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            textTransform: 'none',
            whiteSpace: 'normal',
            lineHeight: 1.2,
            padding: '4px 8px',
            justifyContent: 'flex-start'
          }}
        >
          {params.value}
        </Button>
      )
    },
    {
      field: 'listedBy',
      headerName: 'Listed By',
      minWidth: 120,
      flex: 1,
      valueFormatter: (params) => params.value || '-',
    },
    {
      field: 'hiringManagers',
      headerName: 'Hiring Manager(s)',
      minWidth: 160,
      flex: 1.2,
      valueFormatter: (params) => Array.isArray(params.value) ? params.value.join(', ') : '-',
    },
    {
      field: 'datePosted',
      headerName: 'Date Posted',
      minWidth: 120,
      flex: 1,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: 'dateHired',
      headerName: 'Date Hired',
      minWidth: 120,
      flex: 1,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: 'candidatesCount',
      headerName: isMobile ? 'Candidates' : 'Candidates In Review',
      width: isMobile ? 100 : 180,
      align: 'left',
      headerAlign: 'left',
      renderCell: (params) => (
        <Button
          color="primary"
          onClick={() => navigate(`/candidates?jobId=${params.row.id}`)}
          sx={{ 
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            minWidth: 'auto'
          }}
        >
          {params.value || 0}
        </Button>
      )
    }
  ], [isMobile, navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        const jobsSnapshot = await getDocs(jobsCollection);
        const jobsData = await Promise.all(jobsSnapshot.docs.map(async doc => {
          const jobData = doc.data();
          // Count candidates in review for this job
          const candidatesRef = collection(db, 'candidates');
          const candidatesQuery = query(candidatesRef, where('job_id', '==', doc.id));
          const candidatesSnapshot = await getDocs(candidatesQuery);
          const candidatesInReview = candidatesSnapshot.docs.filter(c => c.data().status !== 'Rejected');
          // Count hired candidates
          const hiredCandidates = candidatesSnapshot.docs.filter(c => c.data().status === 'Hired');
          // Collect hired candidates for analytics
          const allHired = hiredCandidates.map(c => c.data());
          return {
            id: doc.id,
            title: jobData.title,
            required_skills: jobData.required_skills,
            location: jobData.location,
            type: jobData.type,
            listedBy: jobData.listedBy || 'System',
            hiringManagers: jobData.hiringManagers || [],
            datePosted: jobData.datePosted || null,
            dateHired: jobData.dateHired || null,
            candidatesCount: candidatesInReview.length
          };
        }));
        setJobs(jobsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);
// (Removed duplicate block)

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ 
        minHeight: 'calc(100vh - 150px)', 
        width: '100%', 
        p: { xs: 1, sm: 2, md: 3 }
      }}>
        <Box sx={{ 
          mb: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            sx={{ 
              fontFamily: 'Helvetica, Arial, sans-serif', 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            Job Listings
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/jobs/new"
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1.5, sm: 1 }
            }}
          >
            Add New Job
          </Button>
        </Box>

        <Box sx={{ bgcolor: 'white', borderRadius: 3, boxShadow: 2, p: 2 }}>
          <DataGrid
            rows={jobs}
            columns={columns}
            loading={loading}
            autoHeight
            density={isMobile ? "compact" : "comfortable"}
            disableSelectionOnClick
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
              '& .MuiDataGrid-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
              '& .MuiDataGrid-cell': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                whiteSpace: 'normal',
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'center',
                padding: { xs: '4px', sm: '6px', md: '8px' },
                borderRight: { xs: 'none', sm: '1px solid rgba(224, 224, 224, 1)' }
              },
              '& .MuiDataGrid-columnHeader': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                lineHeight: 1.2,
                padding: { xs: '6px', sm: '8px', md: '10px' },
                fontWeight: 'bold',
                whiteSpace: 'normal',
                overflow: 'visible',
                textOverflow: 'unset'
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                whiteSpace: 'normal',
                overflow: 'visible',
                textOverflow: 'unset',
                lineHeight: 1.2
              },
              '& .MuiDataGrid-columnHeaders': {
                borderBottom: '2px solid rgba(224, 224, 224, 1)'
              },
              '& .MuiDataGrid-toolbar': {
                padding: { xs: '8px', sm: '12px' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              },
              '& .MuiDataGrid-toolbarContainer': {
                flexWrap: { xs: 'wrap', sm: 'nowrap' }
              },
              // Allow content to wrap and scroll vertically within cells
              '& .MuiDataGrid-cell--textLeft': {
                whiteSpace: 'normal',
                minHeight: 'unset !important'
              },
              // Mobile specific styles
              ...(isMobile && {
                '& .MuiDataGrid-columnHeaders': {
                  minHeight: '40px !important'
                },
                '& .MuiDataGrid-row': {
                  minHeight: '48px !important'
                },
                '& .MuiDataGrid-cell': {
                  padding: '4px 2px'
                }
              })
            }}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default JobList;
