import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component={Link} to="/" style={{ textDecoration: 'none', color: 'white' }}>
          CandidateHub
        </Typography>
        <Box ml={3}>
          <Button color="inherit" component={Link} to="/">
            Jobs
          </Button>
          <Button color="inherit" component={Link} to="/jobs/new">
            Add Job
          </Button>
          <Button color="inherit" component={Link} to="/resume/upload">
            Upload Resume
          </Button>
          <Button color="inherit" component={Link} to="/models">
            AI Models
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
