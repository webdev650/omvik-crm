import axios from 'axios';
import { toast } from 'sonner';

let rawURL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://omvik-crm-dy3u.onrender.com/api';

// Auto-target local backend on port 5000 when running on localhost
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  rawURL = 'http://localhost:5000/api';
} else if (!rawURL || rawURL.includes('omvik-backend.onrender.com')) {
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

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthPage = ['/login', '/forgot-password', '/reset-password', '/register'].some(p => pathname.startsWith(p));

    if (error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (typeof window !== 'undefined' && !pathname.startsWith('/change-password')) {
        toast.error('Password change is required before proceeding.', { id: 'pwd-req' });
        setTimeout(() => {
          window.location.href = '/change-password';
        }, 500);
      }
      return Promise.reject(error);
    }

    if (status === 401 && !isAuthPage) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('omvik_token');
        localStorage.removeItem('omvik_user');
        localStorage.removeItem('user');
        sessionStorage.clear();
        if (!pathname.startsWith('/login')) {
          toast.error('Session expired. Please log in again.', { id: 'session-expired' });
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
        }
      }
      return Promise.reject(error);
    }

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
