// utils/api.ts
import axios from "axios";

const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.railway.app/api'
  : 'http://localhost:8000/api';

const instance = axios.create({
  baseURL: API_URL,
});

instance.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Utility function to get file URLs
export const getFileUrl = (filePath: string | undefined | null): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return `${API_URL}/files/${filePath}`;
};

export default instance;
