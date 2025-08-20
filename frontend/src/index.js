import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig, msalInstance } from "./msalConfig";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

console.log('Loaded msalConfig:', msalConfig);
console.log('Environment variables:', {
  CLIENT_ID: process.env.REACT_APP_CLIENT_ID ? 'Set' : 'Not set',
  AUTHORITY: process.env.REACT_APP_AUTHORITY ? 'Set' : 'Not set',
  REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI ? 'Set' : 'Not set'
});

// Function to render the app
const renderApp = () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error("Root element not found");
      return;
    }
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <MsalProvider instance={msalInstance}>
            <App />
          </MsalProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error rendering app:", error);
    // Fallback rendering without MSAL if there's an error
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>App Loading Error</h2>
          <p>There was an error loading the application. Please refresh the page.</p>
          <button onclick="window.location.reload()">Refresh Page</button>
        </div>
      `;
    }
  }
};

// The initialize() method must be called before any other MSAL API can be used.
msalInstance.initialize()
  .then(() => {
    console.log('MSAL initialized successfully');
    // This ensures that MSAL has finished processing any redirects before the app renders.
    // It is the recommended pattern for applications using the redirect flow.
    return msalInstance.handleRedirectPromise();
  })
  .then(() => {
    console.log('MSAL redirect promise handled successfully');
    renderApp();
  })
  .catch(err => {
    console.error("MSAL Initialization Error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    // Still render the app even if MSAL fails - for debugging
    console.log("Attempting to render app without MSAL...");
    renderApp();
  });