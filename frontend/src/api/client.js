import axios from 'axios';

// In production, set VITE_API_URL=https://your-api.onrender.com (no trailing slash)
// In dev, leave empty to use Vite's proxy to localhost:8000
const API_URL = import.meta.env.VITE_API_URL || '';
const baseURL = API_URL ? `${API_URL}/api` : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
