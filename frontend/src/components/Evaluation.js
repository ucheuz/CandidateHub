import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Grid, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from 'axios';

const Evaluation = () => {
  const [evaluation, setEvaluation] = useState({ summary: '', detail: '' });
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { jobId, resumeId } = useParams();

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10; // Try for about 50 seconds total
    const retryInterval = 5000; // 5 seconds between retries
    let retryTimeout;

    const fetchEvaluation = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/evaluate/${jobId}/${resumeId}`);
        setEvaluation({
          summary: response.data.summary,
          detail: response.data.detail
        });
        setError(null);
        setLoading(false);
      } catch (error) {
        console.log('Attempt', retryCount + 1, 'failed:', error);
        
        if (error.response?.status === 404 && retryCount < maxRetries) {
          // If evaluation is not ready yet, retry after delay
          retryCount++;
          retryTimeout = setTimeout(fetchEvaluation, retryInterval);
          setError(`Evaluation in progress... (Attempt ${retryCount}/${maxRetries})`);
        } else {
          console.error('Error fetching evaluation:', error);
          setError('Failed to fetch evaluation. The evaluation process may have failed.');
          setLoading(false);
        }
      }
    };

    fetchEvaluation();

    // Cleanup function to clear any pending timeouts
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
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

  if (error) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Typography color="error">{error}</Typography>
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
                Summary
              </Typography>
              <Typography variant="body1" component="pre" style={{ whiteSpace: 'pre-wrap', marginBottom: 2 }}>
                {evaluation.summary}
              </Typography>
              
              <Box display="flex" justifyContent="center" mt={2} mb={2}>
                <Button
                  variant="outlined"
                  onClick={() => setShowDetails(!showDetails)}
                  endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
              </Box>

              {showDetails && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Detailed Evaluation
                  </Typography>
                  <Typography variant="body1" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                    {evaluation.detail}
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Evaluation;
