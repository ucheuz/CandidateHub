import axios from 'axios';
import { msalInstance } from '../msalConfig';
import { protectedResources } from '../msalConfig';
import { InteractionRequiredAuthError, EventType } from "@azure/msal-browser";

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

// Track MSAL interaction status globally for use in the interceptor
window.msalInProgress = 'none';
msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.HANDLE_REDIRECT_START || event.eventType === EventType.LOGIN_START || event.eventType === EventType.ACQUIRE_TOKEN_START) {
    window.msalInProgress = 'inProgress';
  } else if (event.eventType === EventType.HANDLE_REDIRECT_END || event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS || event.eventType === EventType.LOGIN_FAILURE || event.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
    window.msalInProgress = 'none';
  }
});

axiosInstance.interceptors.request.use(
  async (config) => {
    // Debug: Interceptor triggered
    console.log('[axiosInstance] Interceptor triggered for URL:', config.url);
    // Prevent token acquisition if MSAL interaction is in progress
    if (window.msalInProgress && window.msalInProgress !== 'none') {
      console.warn('[axiosInstance] MSAL interaction in progress, skipping token acquisition.');
      return config;
    }

    const account = msalInstance.getActiveAccount();
    if (!account) {
      console.warn('[axiosInstance] No active MSAL account found, skipping token attachment.');
      return config;
    }

    // Always request the API access token for backend authorization
    const tokenRequest = {
      scopes: protectedResources.api.scopes,
      account,
    };

    try {
      const response = await msalInstance.acquireTokenSilent(tokenRequest);
      if (response && response.accessToken) {
        config.headers.Authorization = `Bearer ${response.accessToken}`;
        console.log('[axiosInstance] Authorization header set (access token):', config.headers.Authorization);
      } else {
        console.warn('[axiosInstance] acquireTokenSilent returned no accessToken:', response);
      }
    } catch (error) {
      console.error('[axiosInstance] acquireTokenSilent error:', error);
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await msalInstance.acquireTokenPopup(tokenRequest);
          if (response && response.accessToken) {
            config.headers.Authorization = `Bearer ${response.accessToken}`;
            console.log('[axiosInstance] Authorization header set (popup, access token):', config.headers.Authorization);
          } else {
            console.warn('[axiosInstance] acquireTokenPopup returned no accessToken:', response);
          }
        } catch (popupError) {
          console.error('[axiosInstance] Failed to acquire token interactively (popup):', popupError);
          // Fallback to redirect if popup fails or is blocked
          msalInstance.acquireTokenRedirect(tokenRequest);
        }
      } else if (error.errorCode === "interaction_in_progress") {
        // Optionally, queue the request or show a message
        console.warn('[axiosInstance] MSAL interaction already in progress.');
      } else {
        console.error('[axiosInstance] MSAL token acquisition error:', error);
      }
    }

    if (!config.headers.Authorization) {
      console.warn('[axiosInstance] Authorization header was NOT set for', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;