import axios from 'axios';
import { toast } from 'sonner';

const meta = import.meta as any;
let rawURL = (meta && meta.env && meta.env.VITE_API_URL) || 'https://omvik-crm-dy3u.onrender.com/api';

// Fallback safeguard against old/dead URL in environment variables
if (!rawURL || rawURL.includes('omvik-backend.onrender.com')) {
  rawURL = 'https://omvik-crm-dy3u.onrender.com/api';
}

const baseURL = rawURL;

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 120000, // 120 seconds timeout for Render free tier cold starts
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
      ? 'The server was waking up (Render free tier cold start). Please try again now!'
      : (error.response?.data?.message || 'Something went wrong. Please try again.');
    
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthPage = ['/login', '/forgot-password', '/reset-password', '/register'].some(p => pathname.startsWith(p));

    // Show toast for non-401 errors, or 401 errors when NOT on auth pages
    if (status !== 401 || !isAuthPage) {
      toast.error(message, {
        duration: 4000,
        position: 'top-right'
      });
    }

    return Promise.reject(error);
  }
);

export default api;
