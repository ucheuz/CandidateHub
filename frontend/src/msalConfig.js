// src/msalConfig.js
import { PublicClientApplication } from "@azure/msal-browser";

// Get environment variables with fallbacks for production
const clientId = process.env.REACT_APP_CLIENT_ID || '197b2abb-77ba-424e-a94e-e3dc06d0eeb7';
const authority = process.env.REACT_APP_AUTHORITY || 'https://login.microsoftonline.com/5dadcdcb-ea32-47fe-84b2-0f6cc63c2e0f';

// Use localhost for development, production URL for production
const redirectUri = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000'  // Local development
  : (process.env.REACT_APP_REDIRECT_URI || 'https://candidatehub.azurewebsites.net'); // Production

// Log configuration for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('MSAL Config:', {
    clientId: clientId.substring(0, 8) + '...',
    authority,
    redirectUri,
    environment: process.env.NODE_ENV
  });
}

// Runtime check for environment variables in development
if (process.env.NODE_ENV === 'development') {
  if (!process.env.REACT_APP_CLIENT_ID || !process.env.REACT_APP_AUTHORITY) {
    console.error(
      "MSAL configuration is missing. Please check your .env file and ensure REACT_APP_CLIENT_ID and REACT_APP_AUTHORITY are set."
    );
  }
}

// Replace the values below with your Azure AD app registration details
export const msalConfig = {
  auth: {
    clientId,
    authority,
    redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage", // "localStorage" is the default, but "sessionStorage" can solve some edge cases.
    storeAuthStateInCookie: false,
  },
};

// Create MSAL instance here to be imported by other files, breaking the circular dependency.
export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ["user.read"],
};


