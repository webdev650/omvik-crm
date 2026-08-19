import axios from 'axios';
import { toast } from 'sonner';

const meta = import.meta as any;
const baseURL = (meta && meta.env && meta.env.VITE_API_URL) || 'https://omvik-crm-dy3u.onrender.com/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Global Axios Response Error Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
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
