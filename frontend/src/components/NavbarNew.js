import React, { useState, useEffect } from 'react';
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
  AccountCircle,
  ExitToApp
} from '@mui/icons-material';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { collection, onSnapshot, query, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const Navbar = () => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [notificationsMenuAnchor, setNotificationsMenuAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();

  // Get user from localStorage to find their ID for notifications
  useEffect(() => {
    if (isAuthenticated) {
      try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user) {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error("Could not parse currentUser from localStorage", e);
      }
    } else {
      setCurrentUser(null);
    }
  }, [isAuthenticated]);

  // Listen for notifications in notifications collection (new pattern)
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      // notifications/{userId}/items
      const notificationsQuery = query(
        collection(db, 'notifications', currentUser.id, 'items'),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const fetched = [];
        let unread = 0;
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.read) unread++;
          fetched.push({ id: docSnap.id, ...data });
        });
        setNotifications(fetched);
        setUnreadCount(unread);
      }, (error) => {
        console.error('Error fetching notifications:', error);
      });
      return () => unsubscribe();
    }
  }, [isAuthenticated, currentUser]);

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

  const handleNotificationsMenuOpen = (event) => {
    setNotificationsMenuAnchor(event.currentTarget);
  };

  const handleNotificationsMenuClose = () => {
    setNotificationsMenuAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    // Clear any local storage items you've set manually for a clean state
    localStorage.removeItem('currentUser');
    localStorage.removeItem('candidatehub_auth');
    // Use MSAL's logout to properly sign out the user
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read in Firestore (notifications/{userId}/items/{id})
    const notificationRef = doc(db, 'notifications', currentUser.id, 'items', notification.id);
    await updateDoc(notificationRef, { read: true });
    // Optionally, navigate if notification has a link
    if (notification.link) {
      navigate(notification.link);
    }
    handleNotificationsMenuClose();
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
                cursor: isAuthenticated ? 'pointer' : 'default',
                color: 'white',
                fontFamily: 'Helvetica, Arial, sans-serif',
                opacity: isAuthenticated ? 1 : 0.7
              }}
              onClick={isAuthenticated ? () => navigate('/dashboard') : undefined}
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
              component={isAuthenticated ? Link : 'button'}
              to={isAuthenticated ? item.path : undefined}
              startIcon={item.icon}
              disabled={!isAuthenticated}
              sx={{
                backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: 'white',
                borderRadius: 2,
                px: 2,
                py: 1,
                fontFamily: 'Helvetica, Arial, sans-serif',
                opacity: isAuthenticated ? 1 : 0.5,
                cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                '&:hover': { 
                  backgroundColor: isAuthenticated ? (isActive(item.path) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)') : 'transparent',
                  transform: isAuthenticated ? 'translateY(-1px)' : 'none'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Notifications and Profile (only if authenticated) */}
        {isAuthenticated && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            <IconButton 
              color="inherit"
              onClick={handleNotificationsMenuOpen}
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
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
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                {isAuthenticated && accounts.length > 0 && accounts[0]?.name ? 
                  accounts[0].name.split(' ').map(n => n[0]).join('').toUpperCase() : 
                  <AccountCircle />
                }
              </Avatar>
            </IconButton>
          </Box>
        )}

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
                if (isAuthenticated) {
                  handleMenuClose();
                  navigate(item.path);
                }
              }}
              disabled={!isAuthenticated}
              sx={{
                py: 1.5,
                backgroundColor: isActive(item.path) ? 'action.selected' : 'transparent',
                opacity: isAuthenticated ? 1 : 0.5,
                cursor: isAuthenticated ? 'pointer' : 'not-allowed'
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
            <Badge badgeContent={unreadCount} color="error" />
          </MenuItem>
        </Menu>

        {/* Profile Menu (only if authenticated) */}
        {isAuthenticated && (
          <>
            <Menu
              anchorEl={notificationsMenuAnchor}
              open={Boolean(notificationsMenuAnchor)}
              onClose={handleNotificationsMenuClose}
              PaperProps={{
                sx: { width: 360, mt: 1, maxHeight: 400 }
              }}
            >
              <Typography variant="h6" sx={{ px: 2, py: 1 }}>Notifications</Typography>
              <Divider />
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <MenuItem key={notification.id} onClick={() => handleNotificationClick(notification)}>
                    <ListItemText
                      primary={notification.title}
                      secondary={notification.message}
                    />
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>
                  <ListItemText primary="No new notifications" />
                </MenuItem>
              )}
            </Menu>
            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: { width: 200, mt: 1 }
              }}
            >
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
                <ListItemIcon><Settings /></ListItemIcon>
                <ListItemText primary="Settings" />
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><ExitToApp /></ListItemIcon>
                <ListItemText primary="Sign Out" />
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
