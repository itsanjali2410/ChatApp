// API service for mobile app
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__ 
  ? 'http://localhost:8000' // Development URL - change to your local IP if testing on device
  : 'https://your-backend-url.railway.app'; // Production URL

const instance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests
instance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Handle 401 errors
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and navigate to login
      await AsyncStorage.multiRemove(['token', 'role', 'email', 'user_id', 'org_id']);
      // Navigation will be handled by the app
    }
    return Promise.reject(error);
  }
);

export const getFileUrl = (filePath: string | undefined | null): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  if (filePath.startsWith('/files/')) {
    return `${API_URL}${filePath}`;
  }
  return `${API_URL}/files/${filePath}`;
};

export default instance;

