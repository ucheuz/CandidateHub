import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';

const JobForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    location: '',
    type: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting form data:', formData);
    try {
      const response = await axios.post('http://localhost:5000/api/job', formData);
      if (response.status === 201) {
        alert('Job created successfully!');
        // Reset form
        setFormData({
          title: '',
          description: '',
          required_skills: '',
          location: '',
          type: ''
        });
      }
    } catch (error) {
      console.error('Error creating job:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert(`Error creating job: ${errorMessage}`);
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
