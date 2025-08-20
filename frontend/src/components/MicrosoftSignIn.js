import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Button, Box, Typography, CircularProgress, Card } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { loginRequest } from '../msalConfig';
import { db, collection, query, where, getDocs, addDoc } from "../firebase";
import axiosInstance from '../api/axiosInstance';

const MicrosoftSignIn = () => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserPermissions = async (email, account) => {
    try {
      console.log("Starting checkUserPermissions for email:", email);
      console.log("MSAL account:", account);
      
      // Check if we're in production (using backend API) or development (using Firebase)
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // Production: Use backend API
        try {
          const response = await axiosInstance.get(`/api/users/by-email?email=${encodeURIComponent(email)}`);
          
          if (response.data) {
            console.log("User found via API:", response.data);
            return response.data;
          } else {
            // Check if this is the first user in the system
            const allUsersResponse = await axiosInstance.get('/api/users');
            
            if (allUsersResponse.data && allUsersResponse.data.length === 0) {
              // This is the first user - create them as an Admin
              console.log("First user detected, creating admin account...");
              
              let userName = "Admin User";
              if (account && account.name) {
                userName = account.name;
              } else if (account && account.username) {
                userName = account.username.split('@')[0];
              }
              
              const firstUser = {
                email: email,
                name: userName,
                permissions: "Admin",
                created_at: new Date().toISOString(),
                provider: "microsoft"
              };
              
              const createResponse = await axiosInstance.post('/api/users', firstUser);
              console.log("First user created via API:", createResponse.data);
              
              return createResponse.data;
            } else {
              console.log("User not found in system:", email);
              return null;
            }
          }
        } catch (apiError) {
          console.error("Backend API error, falling back to Firebase:", apiError);
          // Fall back to Firebase if backend API fails
        }
      }
      
      // Development or fallback: Use Firebase directly
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Check if this is the first user in the system
        const allUsersQuery = query(usersRef);
        const allUsersSnapshot = await getDocs(allUsersQuery);
        
        if (allUsersSnapshot.empty) {
          // This is the first user - create them as an Admin
          console.log("First user detected, creating admin account...");
          
          let userName = "Admin User";
          if (account && account.name) {
            userName = account.name;
          } else if (account && account.username) {
            userName = account.username.split('@')[0];
          }
          
          const firstUser = {
            email: email,
            name: userName,
            permissions: "Admin",
            created_at: new Date().toISOString(),
            provider: "microsoft"
          };
          
          const docRef = await addDoc(usersRef, firstUser);
          console.log("First user created with ID:", docRef.id);
          
          return { id: docRef.id, ...firstUser };
        } else {
          console.log("User not found in system:", email);
          return null;
        }
      }
      
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error("Error in checkUserPermissions:", error);
      throw error;
    }
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

      checkUserPermissions(userEmail, account).then(async firestoreUser => {
        if (firestoreUser) {
          console.log("User authenticated successfully:", firestoreUser);
          // Store user data in localStorage
          localStorage.setItem('currentUser', JSON.stringify({
            ...firestoreUser,
            provider: 'microsoft'
          }));
          localStorage.setItem('candidatehub_auth', JSON.stringify({ email: userEmail }));
          localStorage.setItem('userId', firestoreUser.id); // Store userId for backend RBAC
          navigate('/dashboard');
        } else {
          console.log("User not found in system:", userEmail);
          setAuthError("Your account is not authorized to access this application. Please contact your administrator.");
          instance.logoutRedirect({
            postLogoutRedirectUri: process.env.NODE_ENV === 'development' ? "http://localhost:3000" : "/",
          });
        }
      }).catch(err => {
        console.error("Error checking user permissions:", err);
        console.error("Error details:", {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
        setAuthError("An error occurred while verifying your permissions. Please try again.");
        instance.logoutRedirect({
            postLogoutRedirectUri: process.env.NODE_ENV === 'development' ? "http://localhost:3000" : "/",
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
