import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';

const Navbar = ({ onSectionSelect }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const location = useLocation();
  
  const isCandidateProfile = location.pathname.includes('/candidate/');

  const handleMenuClick = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleSectionSelect = (section) => {
    onSectionSelect(section);
    handleMenuClose();
  };

  const sections = {
    CV: 'cv',
    OVERALL_FEEDBACK: 'overall-feedback',
    SCORECARD: 'scorecard',
    COLLABORATIVE_NOTES: 'collaborative-notes',
    HIRING_PIPELINE: 'hiring-pipeline'
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#0C3F05' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
          <Typography 
            variant="h3" 
            component={Link} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: '#FFFFFF',
              fontFamily: '"Black Han Sans", sans-serif',
              fontSize: '48px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            IHS
          </Typography>
          <Typography 
            variant="subtitle1" 
            component={Link} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Candidate Hub
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
        </Box>
        
        {isCandidateProfile && (
          <>
            <IconButton
              sx={{
                p: 0,
                ml: 2,
                '&:hover': {
                  backgroundColor: 'transparent'
                }
              }}
              disableRipple
              onClick={handleMenuClick}
            >
              <MenuIcon sx={{ fontSize: 28, color: 'white' }} />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  '& .MuiMenuItem-root': {
                    fontFamily: 'Helvetica',
                    fontSize: '14px',
                    py: 1,
                    px: 2,
                    minWidth: '200px',
                    '&.Mui-selected': {
                      backgroundColor: '#f5f5f5',
                      fontWeight: 'bold',
                      color: '#0C3F05'
                    }
                  }
                }
              }}
            >
              <MenuItem onClick={() => handleSectionSelect(sections.CV)}>
                CV
              </MenuItem>
              <MenuItem onClick={() => handleSectionSelect(sections.OVERALL_FEEDBACK)}>
                Overall Feedback
              </MenuItem>
              <MenuItem onClick={() => handleSectionSelect(sections.SCORECARD)}>
                Scorecard
              </MenuItem>
              <MenuItem onClick={() => handleSectionSelect(sections.COLLABORATIVE_NOTES)}>
                Collaborative Notes
              </MenuItem>
              <MenuItem onClick={() => handleSectionSelect(sections.HIRING_PIPELINE)}>
                Hiring Pipeline
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
