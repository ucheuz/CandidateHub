import React, { useState, useEffect, useMemo } from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
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
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = useMemo(() => [
    {
      field: 'title',
      headerName: 'Job Role',
      flex: 1,
      renderCell: (params) => (
        <Button
          color="primary"
          onClick={() => navigate(`/job/${params.row.id}/candidates`)}
          sx={{ 
            fontSize: '0.875rem',
            textTransform: 'none',
            whiteSpace: 'normal',
            lineHeight: 1.2,
            padding: '4px 8px'
          }}
        >
          {params.value}
        </Button>
      )
    },
    {
      field: 'listedBy',
      headerName: 'Listed By',
      width: 150,
    },
    {
      field: 'hiringManagers',
      headerName: 'Hiring Manager(s)',
      width: 200,
      valueGetter: (params) => params.value?.join(', ') || '-'
    },
    {
      field: 'datePosted',
      headerName: 'Date Posted',
      width: 150,
      valueGetter: (params) => formatDate(params.value),
      sortComparator: (v1, v2, param1, param2) => {
        const timestamp1 = param1.api.getCellValue(param1.id, 'datePosted');
        const timestamp2 = param2.api.getCellValue(param2.id, 'datePosted');
        return (timestamp1?.seconds || 0) - (timestamp2?.seconds || 0);
      }
    },
    {
      field: 'dateHired',
      headerName: 'Date Hired',
      width: 150,
      valueGetter: (params) => formatDate(params.value)
    },
    {
      field: 'candidatesCount',
      headerName: 'Candidates In Review',
      width: 180,
      type: 'number',
      renderCell: (params) => (
        <Button
          color="primary"
          onClick={() => navigate(`/job/${params.row.id}/candidates`)}
        >
          {params.value || 0}
        </Button>
      )
    }
  ], [navigate]);

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
    <Container maxWidth="lg">
      <Box sx={{ height: 'calc(100vh - 150px)', width: '100%', p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 'bold' }}>
            Job Listings
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/jobs/new"
          >
            Post New Job
          </Button>
        </Box>
        
        <DataGrid
          rows={jobs}
          columns={columns}
          loading={loading}
          autoHeight
          density="comfortable"
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
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              whiteSpace: 'normal',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: '0.875rem',
              lineHeight: 1.2,
              padding: '8px',
            },
            // Allow content to wrap and scroll vertically within cells
            '& .MuiDataGrid-cell--textLeft': {
              whiteSpace: 'normal',
              minHeight: 'unset !important'
            },
          }}
        />
      </Box>
    </Container>
  );
};

export default JobList;
