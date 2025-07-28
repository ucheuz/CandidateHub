import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Button, Box, Typography, CircularProgress, Card } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { loginRequest } from '../msalConfig';
import { db, collection, query, where, getDocs } from "../firebase";
import { storeUserIdByEmail } from '../api/storeUserIdByEmail';

const MicrosoftSignIn = () => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState(null);

  const checkUserPermissions = async (email) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null; // User not found in our system
    }
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() }; // Return the full user profile with ID
  };

  useEffect(() => {
    // This effect handles the post-login flow
    if (isAuthenticated && accounts.length > 0) {
      // Always set the active MSAL account after login
      instance.setActiveAccount(accounts[0]);
      setLoading(true);
      const account = accounts[0];
      const userEmail = account.username; // email is in username field

      // Log the ID token (JWT)
      if (account && account.idToken) {
        console.log("ID Token (JWT):", account.idToken);
      }

      checkUserPermissions(userEmail).then(async firestoreUser => {
        if (firestoreUser) {
          // Store userId in localStorage for backend RBAC
          await storeUserIdByEmail(userEmail);
          // User is authorized. Store their details and navigate.
          localStorage.setItem('currentUser', JSON.stringify({
            ...firestoreUser,
            provider: 'microsoft'
          }));
          localStorage.setItem('candidatehub_auth', JSON.stringify({ email: userEmail }));
          navigate('/dashboard');
        } else {
          setAuthError("Your account is not authorized to access this application. Please contact your administrator.");
          instance.logoutRedirect({
            postLogoutRedirectUri: "/",
          });
        }
      }).catch(err => {
        console.error("Error checking user permissions:", err);
        setAuthError("An error occurred while verifying your permissions. Please try again.");
        instance.logoutRedirect({
            postLogoutRedirectUri: "/",
        });
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isAuthenticated, accounts, instance, navigate]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(e => {
      console.error(e);
      setAuthError("An error occurred during the sign-in process.");
    });
  };

  // Show a loading spinner while MSAL is processing the redirect or we are checking permissions.
  if (inProgress === InteractionStatus.HandleRedirect || loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Verifying your identity...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}>
      <Card sx={{ p: 4, minWidth: 350, boxShadow: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <GroupsIcon sx={{ fontSize: 48, color: '#0274B3' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#0274B3' }}>Sign in with Microsoft</Typography>
          <Typography variant="body2" sx={{ color: '#6c757d', mb: 2 }}>
            Use your Microsoft account to access CandidateHub.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleLogin} sx={{ mt: 2, minWidth: 200 }}>
            Sign in with Microsoft
          </Button>
          {authError && <Typography color="error" sx={{ mt: 2 }}>{authError}</Typography>}
        </Box>
      </Card>
    </Box>
  );
};

export default MicrosoftSignIn;
