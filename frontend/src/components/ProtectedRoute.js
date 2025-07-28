import React, { useEffect, useRef, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Outlet, Navigate } from 'react-router-dom';
import { InteractionStatus } from '@azure/msal-browser';
import { Box, CircularProgress, Typography } from '@mui/material';
import NavbarNew from './NavbarNew';

const isIdTokenExpired = (account) => {
  if (!account || !account.idTokenClaims || !account.idTokenClaims.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return account.idTokenClaims.exp < now;
};

const ProtectedRoute = ({ children }) => {
  const { inProgress, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = accounts && accounts.length > 0 ? accounts[0] : null;
  const [expired, setExpired] = useState(isIdTokenExpired(account));
  const intervalRef = useRef();

  // Periodically check for ID token expiry every 30 seconds
  useEffect(() => {
    function checkExpiry() {
      setExpired(isIdTokenExpired(account));
    }
    intervalRef.current = setInterval(checkExpiry, 30000);
    // Also check immediately on mount
    checkExpiry();
    return () => clearInterval(intervalRef.current);
  }, [account]);

  if (inProgress !== InteractionStatus.None) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying your access...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated || !account || expired) {
    // Not authenticated or ID token expired, redirect to login
    return <Navigate to="/" replace />;
  }

  // Authenticated and ID token valid, render all protected content (children)
  return (
    <>
      {children ? children : (<><NavbarNew /><Outlet /></>)}
    </>
  );
};
export default ProtectedRoute;