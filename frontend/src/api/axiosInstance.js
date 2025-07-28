import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});


// Attach User-Id header from localStorage to every request if available
axiosInstance.interceptors.request.use((config) => {
  const userId = localStorage.getItem('userId');
  if (userId) {
    config.headers['User-Id'] = userId;
  }
  return config;
});

export default axiosInstance;