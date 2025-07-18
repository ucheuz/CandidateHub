import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu as MenuIcon,
  Dashboard,
  Work,
  People,
  PersonAdd,
  Notifications,
  Settings,
  AccountCircle
} from '@mui/icons-material';

const Navbar = () => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleMenuClick = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
    { path: '/jobs', label: 'Jobs', icon: <Work /> },
    { path: '/candidates', label: 'Candidates', icon: <People /> },
    { path: '/job-selection', label: 'Add Candidate', icon: <PersonAdd /> },
  ];

  return (
    <AppBar position="static" sx={{ backgroundColor: '#0C3F05', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar sx={{ minHeight: '70px' }}>
        {/* Logo and Brand */}
        <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }}>
          <Typography
            sx={{ 
              color: 'white', 
              mr: 2, 
              fontFamily: 'Black Han Sans, Arial Black, sans-serif',
              fontWeight: 900,
              fontSize: '32px',
              letterSpacing: '1px'
            }}
          >
            IHS
          </Typography>
          <Box>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                cursor: 'pointer',
                color: 'white',
                fontFamily: 'Helvetica, Arial, sans-serif'
              }}
              onClick={() => navigate('/dashboard')}
            >
              CandidateHub
            </Typography>
          </Box>
        </Box>
        
        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                component={Link}
                to={item.path}
                startIcon={item.icon}
                sx={{
                  backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: 'white',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontFamily: 'Helvetica, Arial, sans-serif',
                  '&:hover': { 
                    backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

        {/* Notifications and Profile */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
          <IconButton 
            color="inherit" 
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'scale(1.05)'
              }
            }}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <IconButton
            onClick={handleProfileMenuOpen}
            color="inherit"
            sx={{ 
              ml: 1,
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Box>

        {/* Mobile Navigation Button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenuClick}
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Mobile Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { width: 250, mt: 1 }
          }}
        >
          {navigationItems.map((item) => (
            <MenuItem 
              key={item.path}
              onClick={() => {
                handleMenuClose();
                navigate(item.path);
              }}
              sx={{
                py: 1.5,
                backgroundColor: isActive(item.path) ? 'action.selected' : 'transparent'
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              {isActive(item.path) && (
                <Chip size="small" label="Active" color="primary" />
              )}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon><Notifications /></ListItemIcon>
            <ListItemText primary="Notifications" />
            <Badge badgeContent={3} color="error" />
          </MenuItem>
        </Menu>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={handleProfileMenuClose}
          PaperProps={{
            sx: { width: 200, mt: 1 }
          }}
        >
          <MenuItem onClick={handleProfileMenuClose}>
            <ListItemIcon><AccountCircle /></ListItemIcon>
            <ListItemText primary="Profile" />
          </MenuItem>
          <MenuItem onClick={handleProfileMenuClose}>
            <ListItemIcon><Settings /></ListItemIcon>
            <ListItemText primary="Settings" />
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleProfileMenuClose}>
            <ListItemText primary="Sign Out" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
