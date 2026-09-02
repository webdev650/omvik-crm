import axios from 'axios';
import { toast } from 'sonner';

let rawURL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://omvik-crm-dy3u.onrender.com/api';

// Fallback safeguard against old/dead URL in environment variables
if (!rawURL || rawURL.includes('omvik-backend.onrender.com')) {
  rawURL = 'https://omvik-crm-dy3u.onrender.com/api';
}

const baseURL = rawURL;

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000, // 60 seconds timeout to allow Render free tier cold starts
  headers: {
    'Content-Type': 'application/json'
  }
});

// Global Axios Request Interceptor: attach token header as fallback
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('omvik_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global Axios Response Error Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const message = isTimeout
      ? 'Server is warming up, please try again in a few seconds.'
      : (error.response?.data?.message || 'Something went wrong. Please try again.');
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

    // Show toast for non-401 errors, or 401 errors when not on login page
    if (status !== 401 || !isLoginPage) {
      toast.error(message, {
        duration: 4000,
        position: 'top-right'
      });
    }

    return Promise.reject(error);
  }
);

export default api;
