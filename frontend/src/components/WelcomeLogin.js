import React, { useEffect } from 'react';
import { Button, Box, Typography, Paper, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AccountCircle } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Microsoft Authentication Library (MSAL) setup
// You need to install @azure/msal-browser and @azure/msal-react
// npm install @azure/msal-browser @azure/msal-react
const WelcomeLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    // Trim input
    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();
    try {
      console.log('Checking credentials:', emailTrimmed, passwordTrimmed);
      // Query by email only, then check password in JS
      const q = query(
        collection(db, 'users'),
        where('email', '==', emailTrimmed)
      );
      const querySnapshot = await getDocs(q);
      console.log('Query result:', querySnapshot.docs.map(doc => doc.data()));
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.password === passwordTrimmed) {
          localStorage.setItem('currentUser', JSON.stringify(userData));
          localStorage.setItem('candidatehub_auth', JSON.stringify({ email: emailTrimmed }));
          setTimeout(() => {
            navigate('/dashboard');
          }, 50);
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('Login error. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      width: '100vw',
      bgcolor: 'linear-gradient(135deg, #eaf6fb 60%, #f8f9fa 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: { xs: 1, md: 0 },
      position: 'relative'
    }}>
      <Paper elevation={12} sx={{
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 8,
        textAlign: 'center',
        maxWidth: { xs: 340, sm: 480, md: 600, lg: 700 },
        width: { xs: '98%', sm: '90%', md: '80%', lg: '60%' },
        boxShadow: '0 8px 32px rgba(12,63,5,0.13)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: { xs: '60vh', md: '50vh' },
        bgcolor: 'white',
        border: '2px solid #eaf6fb'
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <AccountCircle sx={{ fontSize: 80, color: '#0C3F05', mb: 1, bgcolor: '#eaf6fb', borderRadius: '50%', p: 2, boxShadow: '0 2px 8px rgba(12,63,5,0.10)' }} />
          <Typography variant="h4" fontWeight={900} mb={1} color="#0C3F05" fontFamily="Black Han Sans, Arial Black, sans-serif" sx={{ letterSpacing: 1 }}>
            CandidateHub
          </Typography>
          <Typography variant="subtitle1" color="#0274B3" fontWeight={600} mb={1} sx={{ fontFamily: 'Helvetica, Arial, sans-serif', opacity: 0.85 }}>
            Empowering Smart Hiring Decisions
          </Typography>
          <Divider sx={{ bgcolor: '#0C3F05', height: 3, width: 60, borderRadius: 2, mb: 2 }} />
        </Box>
        <Typography variant="body1" mb={4} color="#333" fontWeight={500} sx={{ fontSize: 18 }}>
          Welcome! Please sign in with your company credentials to access the dashboard.
        </Typography>
        <form onSubmit={handleLogin}>
          <Box mb={3}>
            <input
              type="email"
              placeholder="Company Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '18px', fontSize: '18px', borderRadius: '10px', border: '2px solid #0C3F05', background: '#f7fbff', marginBottom: '2px', fontFamily: 'Helvetica, Arial, sans-serif' }}
              autoFocus
            />
          </Box>
          <Box mb={3}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '18px', fontSize: '18px', borderRadius: '10px', border: '2px solid #0C3F05', background: '#f7fbff', fontFamily: 'Helvetica, Arial, sans-serif' }}
            />
          </Box>
          {error && <Typography color="error" mb={2} fontWeight={700} fontSize={16} sx={{ textAlign: 'center' }}>{error}</Typography>}
          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: '#0C3F05',
              color: 'white',
              borderRadius: 3,
              px: 4,
              py: 2,
              width: '100%',
              fontWeight: 700,
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(12,63,5,0.10)',
              letterSpacing: '0.5px',
              mt: 2,
              mb: 2,
              '&:hover': {
                backgroundColor: '#145c0a'
              }
            }}
          >
            Sign In
          </Button>
        </form>
        <Divider sx={{ mt: 3, mb: 1, bgcolor: '#0C3F05', height: 2, borderRadius: 2 }} />
        <Typography variant="caption" color="#0C3F05" fontWeight={600}>
          © {new Date().getFullYear()} IHS CandidateHub
        </Typography>
      </Paper>
    </Box>
  );
};

export default WelcomeLogin;
