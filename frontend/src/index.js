import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig, msalInstance } from "./msalConfig";
import App from "./App";
import "./index.css";

console.log('Loaded msalConfig:', msalConfig);
console.log('process.env.REACT_APP_CLIENT_ID:', process.env.REACT_APP_CLIENT_ID);
console.log('process.env.REACT_APP_AUTHORITY:', process.env.REACT_APP_AUTHORITY);
console.log('process.env.REACT_APP_REDIRECT_URI:', process.env.REACT_APP_REDIRECT_URI);

// The initialize() method must be called before any other MSAL API can be used.
msalInstance.initialize().then(() => {
  // This ensures that MSAL has finished processing any redirects before the app renders.
  // It is the recommended pattern for applications using the redirect flow.
  msalInstance.handleRedirectPromise().then(() => {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>
    );
  }).catch(err => {
      console.error("MSAL Redirect Error:", err);
  });
});