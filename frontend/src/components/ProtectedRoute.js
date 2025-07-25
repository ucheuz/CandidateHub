import React, { useState, useEffect } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Outlet, Navigate } from 'react-router-dom';
import { InteractionStatus } from '@azure/msal-browser';
import { Box, CircularProgress, Typography } from '@mui/material';
import NavbarNew from './NavbarNew';
import axiosInstance from '../api/axiosInstance';

const ProtectedRoute = () => {
  const { instance, inProgress, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isAuthorized, setIsAuthorized] = useState(null); // null: pending, true: authorized, false: unauthorized
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // This effect runs when MSAL is ready and a user is authenticated.
    // It's responsible for verifying the user's access with our backend.
    if (isAuthenticated && inProgress === InteractionStatus.None && accounts.length > 0) {
      // Avoid re-running the check if authorization is already confirmed.
      if (isAuthorized) return;

      const verifyUserAccess = async () => {
        try {
          console.log('Calling /api/auth/verify with account:', accounts[0]);
          // The axiosInstance will automatically attach the access token.
          const response = await axiosInstance.get('/api/auth/verify');
          console.log('Backend verify response:', response);
          // Backend confirmed the user is valid. Store the fresh profile.
          localStorage.setItem('currentUser', JSON.stringify(response.data));
          setIsAuthorized(true);
        } catch (error) {
          console.error("Backend authorization check failed:", error);
          setIsAuthorized(false);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            setAuthError('Your account is not authorized to access this application. Please contact an administrator.');
          } else {
            setAuthError('An error occurred while verifying your access. Please try again later.');
          }
          // If authorization fails for any reason, log the user out.
          instance.logoutRedirect({ postLogoutRedirectUri: "/" });
        }
      };

      verifyUserAccess();
    }
  }, [isAuthenticated, inProgress, accounts, instance, isAuthorized]);

  // Show a loading spinner while MSAL is processing or we are verifying with the backend.
  if (inProgress !== InteractionStatus.None || (isAuthenticated && isAuthorized === null)) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying your access...</Typography>
      </Box>
    );
  }

  // If authorization failed, the useEffect has already triggered a logout.
  // We can show a message while that redirect is in flight.
  if (isAuthorized === false) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
        <Typography color="error" variant="h6">Access Denied</Typography>
        <Typography sx={{ mt: 1 }}>{authError}</Typography>
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>Redirecting to sign-in page...</Typography>
      </Box>
    );
  }

  // If authenticated with MSAL and authorized by our backend, render the app.
  if (isAuthenticated && isAuthorized) {
    return (
      <>
        <NavbarNew />
        <main>
          <Outlet />
        </main>
      </>
    );
  }

  // If not authenticated at all, redirect to the home/login page.
    return <Navigate to="/" replace />;
};

export default ProtectedRoute;