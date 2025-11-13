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

// Function to check if token needs refresh (expires within 1 hour)
const needsTokenRefresh = (token: string): boolean => {
  try {
    if (!token) return false;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - currentTime;
    
    // Refresh if token expires within 1 hour (3600 seconds)
    return expiresIn > 0 && expiresIn < 3600;
  } catch (error) {
    return false;
  }
};

instance.interceptors.request.use(async (config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  if (token) {
    // Check if token needs refresh (expires within 1 hour)
    if (needsTokenRefresh(token)) {
      console.log("Token expires soon, but will remain valid for now");
      // Token expiration extended to 24 hours on backend, so no immediate action needed
    }
    
    // Check if token is valid before making the request
    if (!isTokenValid(token)) {
      console.log("Token is invalid or expired, clearing localStorage");
      // Don't immediately redirect on request interceptor
      // Let the response interceptor handle it
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Only redirect if not on auth pages
        if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
          localStorage.clear();
          window.location.href = "/login";
        }
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
      // and if the error is actually a token expiration
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        
        // Don't redirect if already on login/signup pages
        if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
          console.log("Token expired or invalid, redirecting to login");
          
          // Check if token exists but is expired
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const currentTime = Math.floor(Date.now() / 1000);
              
              // Only redirect if token is actually expired
              if (payload.exp && payload.exp < currentTime) {
                localStorage.clear();
                window.location.href = "/login";
              }
              // If token isn't expired but still got 401, might be a server issue
              // Don't redirect in this case
            } catch (e) {
              // Invalid token format, clear and redirect
              localStorage.clear();
              window.location.href = "/login";
            }
          } else {
            // No token at all, redirect
            localStorage.clear();
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Utility function to get file URLs
export const getFileUrl = (filePath: string | undefined | null): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  
  // If the path already includes /files/, don't add it again
  if (filePath.startsWith('/files/')) {
    return `${API_URL}${filePath}`;
  }
  
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
