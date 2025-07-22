import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';



import { ThemeProvider, createTheme } from '@mui/material';
import NavbarNew from './components/NavbarNew';
import Dashboard from './components/Dashboard';
import JobList from './components/JobList';
import BusinessSettings from './components/BusinessSettings';
import JobForm from './components/JobForm';
import ResumeUpload from './components/ResumeUpload';
import Evaluation from './components/Evaluation';
import CandidateList from './components/CandidateList';
import CandidateProfile from './components/CandidateProfile';
import JobSelection from './components/JobSelection';
import WelcomeLogin from './components/WelcomeLogin';

// Simple auth check
const isAuthenticated = () => {
  return !!localStorage.getItem('candidatehub_auth');
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#0C3F05',
    },
    secondary: {
      main: '#4FC3F7',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: 'Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <NavbarNew />
      <Routes>
        <Route path="/" element={<WelcomeLogin />} />
        <Route path="/dashboard" element={isAuthenticated() ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/jobs" element={isAuthenticated() ? <JobList /> : <Navigate to="/" replace />} />
        <Route path="/jobs/new" element={isAuthenticated() ? <JobForm /> : <Navigate to="/" replace />} />
        <Route path="/job-selection" element={isAuthenticated() ? <JobSelection /> : <Navigate to="/" replace />} />
        <Route path="/upload/:jobId" element={isAuthenticated() ? <ResumeUpload /> : <Navigate to="/" replace />} />
        <Route path="/job/:jobId/candidates" element={isAuthenticated() ? <CandidateList /> : <Navigate to="/" replace />} />
        <Route path="/candidates" element={isAuthenticated() ? <CandidateList /> : <Navigate to="/" replace />} />
        <Route path="/candidate/:candidateId" element={isAuthenticated() ? <CandidateProfile /> : <Navigate to="/" replace />} />
        <Route path="/candidates/:candidateId" element={isAuthenticated() ? <CandidateProfile /> : <Navigate to="/" replace />} />
        <Route path="/evaluation/:jobId/:resumeId" element={isAuthenticated() ? <Evaluation /> : <Navigate to="/" replace />} />
        <Route path="/settings" element={isAuthenticated() ? <BusinessSettings /> : <Navigate to="/" replace />} />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
