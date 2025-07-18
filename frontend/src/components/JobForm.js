import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const JobForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    location: '',
    type: '',
    listedBy: 'Current User', // This should be replaced with actual user info when auth is implemented
    hiringManagers: '',
    datePosted: null,
    dateHired: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const jobsCollection = collection(db, 'jobs');
      const serverDate = new Date();
      
      const jobData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        required_skills: formData.required_skills.split(',').map(skill => skill.trim()).filter(Boolean),
        location: formData.location.trim(),
        type: formData.type.trim(),
        listedBy: formData.listedBy.trim(),
        hiringManagers: formData.hiringManagers.split(',').map(manager => manager.trim()).filter(Boolean),
        datePosted: serverDate,
        dateHired: null
      };

      console.log('Creating new job:', jobData);
      const docRef = await addDoc(jobsCollection, jobData);
      console.log('Job created with ID:', docRef.id);
      
      alert('Job created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating job:', error);
      alert(`Error creating job: ${error.message}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Job
        </Typography>
        <Paper elevation={3} sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Job Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Job Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              margin="normal"
              required
              multiline
              rows={4}
            />
            <TextField
              fullWidth
              label="Required Skills (comma separated)"
              name="required_skills"
              value={formData.required_skills}
              onChange={handleChange}
              margin="normal"
              required
              helperText="Enter skills separated by commas"
            />
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Job Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Hiring Managers (comma separated)"
              name="hiringManagers"
              value={formData.hiringManagers}
              onChange={handleChange}
              margin="normal"
              required
              helperText="Enter manager names separated by commas"
            />
            <Box mt={2}>
              <Button type="submit" variant="contained" color="primary">
                Create Job
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default JobForm;
