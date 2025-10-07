// utils/api.ts
import axios from "axios";

const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.railway.app'
  : 'http://localhost:8000';

const instance = axios.create({
  baseURL: API_URL,
});

// Function to check if token is valid (not expired)
const isTokenValid = (token: string): boolean => {
  try {
    if (!token) return false;
    
    // Decode JWT token (basic check)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      console.log("Token is expired");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
};

instance.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  if (token) {
    // Check if token is valid before making the request
    if (!isTokenValid(token)) {
      console.log("Token is invalid or expired, clearing localStorage");
      if (typeof window !== "undefined") {
        localStorage.clear();
        window.location.href = "/login";
      }
      return Promise.reject(new Error("Token expired"));
    }
    
    config.headers = config.headers || {};
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  } else {
    console.log("No token found in localStorage");
  }
  
  return config;
});

// Add response interceptor to handle 401 errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("401 Unauthorized error:", error.response?.data);
      
      // Only redirect to login if we're not already on the login page
      if (typeof window !== "undefined" && !window.location.pathname.includes('/login')) {
        console.log("Token expired or invalid, redirecting to login");
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Utility function to get file URLs
export const getFileUrl = (filePath: string | undefined | null): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  return `${API_URL}/files/${filePath}`;
};

// Message status functions
export const markMessagesAsDelivered = async (chatId: string) => {
  const response = await instance.post(`/messages/mark-delivered/${chatId}`);
  return response.data;
};

export const markMessagesAsRead = async (chatId: string) => {
  const response = await instance.post(`/messages/mark-read/${chatId}`);
  return response.data;
};

export const updateMessageStatus = async (messageId: string, status: string) => {
  const response = await instance.put(`/messages/${messageId}/status`, { status });
  return response.data;
};

export default instance;
