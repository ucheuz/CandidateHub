import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Grid, 
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Alert,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import NotesHub from './NotesHub';

dayjs.extend(relativeTime);

const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return 'recently';
  if (timestamp.seconds) {
    return dayjs(new Date(timestamp.seconds * 1000)).fromNow();
  }
  return dayjs(timestamp).fromNow();
};

export const sections = {
  CV: 'cv',
  OVERALL_FEEDBACK: 'overall-feedback',
  SCORECARD: 'scorecard',
  COLLABORATIVE_NOTES: 'collaborative-notes',
  HIRING_PIPELINE: 'hiring-pipeline'
};

const CandidateProfile = ({ activeSection: initialSection, onSectionChange, onCandidateChange }) => {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (candidateId && onCandidateChange) {
      onCandidateChange(candidateId);
    }
  }, [candidateId, onCandidateChange]);

  useEffect(() => {
    if (initialSection && onSectionChange) {
      onSectionChange(initialSection);
    }
  }, [initialSection, onSectionChange]);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/candidates/${candidateId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch candidate data');
        }
        const data = await response.json();
        setCandidate(data);
      } catch (err) {
        console.error('Error fetching candidate:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const renderActiveSection = () => {
    switch (initialSection) {
      case sections.CV:
        return (
          <Paper 
            sx={{ 
              height: '70vh', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                p: 2, 
                bgcolor: '#0274B3', 
                fontFamily: 'Helvetica',
                fontWeight: 'bold',
                color: 'white',
                width: '100%',
                textAlign: 'center'
              }}
            >
              CANDIDATE CV
            </Typography>
            <Divider />
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <iframe
                src={`http://localhost:5000/api/resume/${candidate?.resume_blob_path}`}
                title="Resume Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  overflow: 'auto'
                }}
              />
            </Box>
          </Paper>
        );

      case sections.OVERALL_FEEDBACK:
        return (
          <Paper sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
            <Typography variant="h6" gutterBottom>Overall Feedback Coming Soon</Typography>
          </Paper>
        );

      case sections.SCORECARD:
        return (
          <Paper sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
            <Typography variant="h6" gutterBottom>Scorecard Coming Soon</Typography>
          </Paper>
        );

      case sections.COLLABORATIVE_NOTES:
        return <NotesHub candidateId={candidateId} />;

      case sections.HIRING_PIPELINE:
        return (
          <Paper sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
            <Typography variant="h6" gutterBottom>Hiring Pipeline Coming Soon</Typography>
          </Paper>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!candidate) {
    return null;
  }

  const isUnknownCandidate = candidate.name === 'Unknown Candidate';

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, mt: 4 }}>
        {/* Profile Header */}
        <Box display="flex" mb={3} sx={{ mt: -2 }}>
          {/* Left side - Rank and HM Score */}
          <Box display="flex" gap={2} alignItems="center" sx={{ width: '200px', ml: -5 }}>
            <Paper 
              sx={{ 
                p: 1.5, 
                bgcolor: '#f5f5f5', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                minWidth: 90
              }}
            >
              <Typography variant="body2" color="textSecondary">Rank</Typography>
              <Typography variant="h6" color="primary">
                {candidate.rank || '-'}
              </Typography>
            </Paper>
            <Paper 
              sx={{ 
                p: 1.5, 
                bgcolor: '#f5f5f5', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                minWidth: 90
              }}
            >
              <Typography variant="body2" color="textSecondary">HM Score</Typography>
              <Typography variant="h6" color="primary">
                {candidate.hmScore || '-'}
              </Typography>
            </Paper>
          </Box>

          {/* Center - Candidate Info */}
          <Box flex={1} display="flex" alignItems="center" justifyContent="center" sx={{ mr: '200px' }}>
            <Box width="100%" maxWidth={500}>
              <Typography variant="h4" component="h1" textAlign="center" sx={{ width: '100%' }}>
                {candidate.name}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mt={1}>
                <Chip
                  size="small"
                  label={candidate.status}
                  color={
                    candidate.status === 'Evaluated' ? 'success' :
                    candidate.status === 'Processing' ? 'warning' :
                    candidate.status === 'Failed' ? 'error' : 'default'
                  }
                />
                <Typography variant="body2" color="textSecondary">
                  Added {formatFirestoreTimestamp(candidate.upload_date)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Status Alerts */}
        {isUnknownCandidate && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            The candidate's name could not be automatically extracted from their resume. 
            You may need to manually update their information.
          </Alert>
        )}
        {candidate.status === 'Processing' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            The candidate's profile is still being processed. Evaluation results will appear soon.
          </Alert>
        )}
        {candidate.status === 'Failed' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            There was an error processing this candidate's profile. 
            {candidate.error && `: ${candidate.error}`}
          </Alert>
        )}
      </Box>

      {/* Render Active Section */}
      <Box>
        {renderActiveSection()}
      </Box>
    </Container>
  );
};

export default CandidateProfile;