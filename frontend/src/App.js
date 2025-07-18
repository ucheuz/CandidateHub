import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Navbar from './components/Navbar';
import JobList from './components/JobList';
import JobForm from './components/JobForm';
import ResumeUpload from './components/ResumeUpload';
import Evaluation from './components/Evaluation';
import CandidateList from './components/CandidateList';
import CandidateProfile from './components/CandidateProfile';

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
  const [activeSection, setActiveSection] = React.useState('cv');
  const [candidateId, setCandidateId] = React.useState(null);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const handleCandidateChange = (id) => {
    setCandidateId(id);
  };

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Navbar 
          onSectionChange={handleSectionChange} 
          activeSection={activeSection}
          candidateId={candidateId}
        />
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/new" element={<JobForm />} />
          <Route path="/resume/upload" element={<ResumeUpload />} />
          <Route path="/job/:jobId/candidates" element={<CandidateList />} />
          <Route 
            path="/candidates/:candidateId" 
            element={
              <CandidateProfile 
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                onCandidateChange={handleCandidateChange}
              />
            } 
          />
          <Route path="/evaluation/:jobId/:resumeId" element={<Evaluation />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
