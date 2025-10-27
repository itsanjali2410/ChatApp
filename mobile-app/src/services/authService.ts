import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure base URL for your backend
const API_BASE_URL = 'https://your-backend-url.com/api'; // Replace with your actual backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  // Login user
  loginUser: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response;
  },

  // Register user
  registerUser: async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    username?: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response;
  },

  // Logout user
  logoutUser: async () => {
    await AsyncStorage.multiRemove(['token', 'role', 'email', 'user_id', 'org_id']);
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response;
  },

  // Refresh token
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response;
  },
};

// Export individual functions for easier imports
export const loginUser = authService.loginUser;
export const registerUser = authService.registerUser;
export const logoutUser = authService.logoutUser;
export const getCurrentUser = authService.getCurrentUser;
export const refreshToken = authService.refreshToken;


