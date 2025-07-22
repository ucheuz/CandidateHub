// src/msalConfig.js
// Replace the values below with your Azure AD app registration details
export const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID", // e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID", // e.g. "https://login.microsoftonline.com/common" or your tenant
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["user.read"],
};
