import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = 'https://dental-ai-8qr1.onrender.com'; // Pointing to deployed backend

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle token refresh logic here if needed
    return Promise.reject(error);
  }
);
