import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  Business as BusinessIcon,
  Login as LoginIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig';

const HRLogin = () => {
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initiate Microsoft SSO login
      await instance.loginPopup(loginRequest);
      
      // If successful, redirect to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Microsoft login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPortal = () => {
    navigate('/');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'grey.50',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Avatar sx={{ 
              bgcolor: '#0274B3', 
              width: 80, 
              height: 80, 
              mx: 'auto',
              mb: 2
            }}>
              <BusinessIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0274B3', mb: 1 }}>
              iHS HR Portal
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Human Resources Login
            </Typography>
          </Box>

          {/* Login Form */}
          <Card sx={{ mb: 4, bgcolor: 'grey.50' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Access your HR dashboard to manage candidates, jobs, and recruitment pipeline.
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                onClick={handleMicrosoftLogin}
                disabled={loading}
                sx={{
                  bgcolor: '#0274B3',
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { bgcolor: '#025a8f' }
                }}
              >
                {loading ? 'Signing In...' : 'Sign in with Microsoft'}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Back to Portal */}
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToPortal}
            sx={{ color: '#0274B3', borderColor: '#0274B3' }}
          >
            Back to Career Portal
          </Button>

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              This portal is for authorized HR personnel only.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default HRLogin;
