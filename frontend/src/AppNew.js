import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import NavbarNew from './components/NavbarNew';
import Dashboard from './components/Dashboard';
import JobList from './components/JobList';
import JobForm from './components/JobForm';
import ResumeUpload from './components/ResumeUpload';
import Evaluation from './components/Evaluation';
import CandidateList from './components/CandidateList';
import CandidateProfile from './components/CandidateProfile';
import JobSelection from './components/JobSelection';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0274B3',
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/new" element={<JobForm />} />
          <Route path="/job-selection" element={<JobSelection />} />
          <Route path="/upload/:jobId" element={<ResumeUpload />} />
          <Route path="/job/:jobId/candidates" element={<CandidateList />} />
          <Route path="/candidates" element={<CandidateList />} />
          <Route 
            path="/candidates/:candidateId" 
            element={<CandidateProfile />} 
          />
          <Route path="/evaluation/:jobId/:resumeId" element={<Evaluation />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
