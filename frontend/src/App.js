import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Navbar from './components/Navbar';
import JobList from './components/JobList';
import JobForm from './components/JobForm';
import ResumeUpload from './components/ResumeUpload';
import Evaluation from './components/Evaluation';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/new" element={<JobForm />} />
          <Route path="/resume/upload" element={<ResumeUpload />} />
          <Route path="/evaluation/:jobId/:resumeId" element={<Evaluation />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
