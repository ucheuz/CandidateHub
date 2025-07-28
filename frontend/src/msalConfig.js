// src/msalConfig.js
import { PublicClientApplication } from "@azure/msal-browser";

// Runtime check for environment variables. This will fail loudly during development
// if the .env file is not configured correctly.
if (!process.env.REACT_APP_CLIENT_ID || !process.env.REACT_APP_AUTHORITY || !process.env.REACT_APP_REDIRECT_URI) {
  throw new Error(
    "MSAL configuration is missing. Please check your .env file and ensure REACT_APP_CLIENT_ID, REACT_APP_AUTHORITY, and REACT_APP_REDIRECT_URI are set."
  );
}

// Replace the values below with your Azure AD app registration details
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID,
    authority: process.env.REACT_APP_AUTHORITY,
    redirectUri: process.env.REACT_APP_REDIRECT_URI,
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


