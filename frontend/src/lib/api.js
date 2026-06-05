import axios from 'axios';

const DEV_API_BASE_URL = 'http://127.0.0.1:5000/api';
const DEPLOYED_API_BASE_URL = '/_/backend/api';

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = import.meta.env.DEV
  ? (configuredBaseURL && configuredBaseURL !== DEPLOYED_API_BASE_URL
      ? configuredBaseURL
      : DEV_API_BASE_URL)
  : (configuredBaseURL || DEPLOYED_API_BASE_URL);

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

export default api;
