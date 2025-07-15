import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import axios from 'axios';

const JobList = () => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/jobs');
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Job Listings
        </Typography>
        <Grid container spacing={3}>
          {jobs.map((job) => (
            <Grid item xs={12} md={6} key={job.id}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="h2">
                    {job.title}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {job.location} • {job.type}
                  </Typography>
                  <Typography variant="body2" component="p" paragraph>
                    {job.description.substring(0, 200)}...
                  </Typography>
                  <Typography color="textSecondary" paragraph>
                    Required Skills: {job.required_skills}
                  </Typography>
                  <Button
                    component={Link}
                    to={`/resume/upload?jobId=${job.id}`}
                    variant="contained"
                    color="primary"
                  >
                    Upload Resume
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default JobList;
