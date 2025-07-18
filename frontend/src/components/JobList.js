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

  const columns = useMemo(() => {
    const baseColumns = [
      {
        field: 'title',
        headerName: 'Job Role',
        flex: isMobile ? 1 : 1.5,
        minWidth: isMobile ? 150 : 200,
        renderCell: (params) => (
          <Button
            color="primary"
            onClick={() => navigate(`/job/${params.row.id}/candidates`)}
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
        field: 'candidatesCount',
        headerName: isMobile ? 'Candidates' : 'Candidates In Review',
        width: isMobile ? 100 : 180,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <Button
            color="primary"
            onClick={() => navigate(`/job/${params.row.id}/candidates`)}
            sx={{ 
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              minWidth: 'auto'
            }}
          >
            {params.value || 0}
          </Button>
        )
      }
    ];

    // Add additional columns based on screen size
    if (!isMobile) {
      baseColumns.splice(1, 0, {
        field: 'listedBy',
        headerName: 'Listed By',
        width: isTablet ? 140 : 180,
        hide: isMobile
      });
    }

    if (!isMobile && !isTablet) {
      baseColumns.splice(2, 0, {
        field: 'hiringManagers',
        headerName: 'Hiring Manager(s)',
        width: 220,
        valueGetter: (params) => params.value?.join(', ') || '-'
      });
    }

    if (!isMobile) {
      baseColumns.splice(-1, 0, {
        field: 'datePosted',
        headerName: isTablet ? 'Date Posted' : 'Date Posted',
        width: isTablet ? 140 : 160,
        valueGetter: (params) => formatDate(params.value),
        sortComparator: (v1, v2, param1, param2) => {
          const timestamp1 = param1.api.getCellValue(param1.id, 'datePosted');
          const timestamp2 = param2.api.getCellValue(param2.id, 'datePosted');
          return (timestamp1?.seconds || 0) - (timestamp2?.seconds || 0);
        }
      });
    }

    if (!isMobile && !isTablet) {
      baseColumns.splice(-1, 0, {
        field: 'dateHired',
        headerName: 'Date Hired',
        width: 160,
        valueGetter: (params) => formatDate(params.value)
      });
    }

    return baseColumns;
  }, [navigate, isMobile, isTablet]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const jobsCollection = collection(db, 'jobs');
        const jobsSnapshot = await getDocs(collection(db, 'jobs'));
        
        console.log('Found jobs:', jobsSnapshot.size);
        
        const jobsData = await Promise.all(jobsSnapshot.docs.map(async doc => {
          const jobData = doc.data();
          console.log('Job data:', { id: doc.id, ...jobData });
          
          // Get candidates count for this job
          const candidatesCollection = collection(db, 'candidates');
          const candidatesSnapshot = await getDocs(
            query(candidatesCollection, where('job_id', '==', doc.id))
          );
          
          return {
            id: doc.id,
            title: jobData.title,
            description: jobData.description,
            required_skills: jobData.required_skills,
            location: jobData.location,
            type: jobData.type,
            listedBy: jobData.listedBy || 'System',
            hiringManagers: jobData.hiringManagers || [],
            datePosted: jobData.datePosted || null,
            dateHired: jobData.dateHired || null,
            candidatesCount: candidatesSnapshot.size
          };
        }));
        
        console.log('Processed jobs:', jobsData);
        setJobs(jobsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ 
        height: 'calc(100vh - 150px)', 
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
    </Container>
  );
};

export default JobList;
