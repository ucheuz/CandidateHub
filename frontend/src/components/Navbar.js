import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component={Link} to="/" style={{ textDecoration: 'none', color: 'white', flexGrow: 1 }}>
          CandidateHub
        </Typography>
        <Button color="inherit" component={Link} to="/jobs/new">
          Create Job
        </Button>
        <Button color="inherit" component={Link} to="/resume/upload">
          Upload Resume
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
