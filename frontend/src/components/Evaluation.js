import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Grid } from '@mui/material';
import axios from 'axios';

const Evaluation = () => {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { jobId, resumeId } = useParams();

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const response = await axios.post(`http://localhost:5000/api/evaluate/${jobId}/${resumeId}`);
        setEvaluation(response.data.evaluation);
      } catch (error) {
        console.error('Error fetching evaluation:', error);
        alert('Error fetching evaluation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [jobId, resumeId]);

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Candidate Evaluation
        </Typography>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Evaluation Results
              </Typography>
              <Typography variant="body1" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                {evaluation}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Evaluation;
