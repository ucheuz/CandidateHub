import axios from 'axios';

// Configure axios based on environment
const axiosInstance = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8000'  // Use local backend in development (avoiding macOS ControlCenter on 5000)
    : '',  // Use relative URLs in production (nginx will proxy to backend)
});

// Log the configuration for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('Axios Instance Config:', {
    baseURL: process.env.NODE_ENV === 'production' ? 'relative URLs' : 'http://localhost:5000',
    environment: process.env.NODE_ENV
  });
}

// Attach User-Id header from localStorage to every request if available
axiosInstance.interceptors.request.use((config) => {
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['User-Id'] = userId;
  }
  
  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Axios Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: config.baseURL + config.url
    });
  }
  
  return config;
});

export default axiosInstance;