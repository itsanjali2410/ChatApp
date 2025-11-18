// utils/api.ts
import axios from "axios";

const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.railway.app'
  : 'http://localhost:8000';

const instance = axios.create({
  baseURL: API_URL,
});

// Function to check if token is valid (not expired)
// NOTE: We don't auto-logout on expiration - session persists until explicit logout
const isTokenValid = (token: string): boolean => {
  try {
    if (!token) return false;
    
    // Decode JWT token (basic check)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Always return true if token exists - don't check expiration
    // Session should persist until user explicitly logs out
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
    // Always attach token - don't check expiration
    // Session persists until explicit logout
    config.headers = config.headers || {};
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  } else {
    console.log("No token found in localStorage");
  }
  
  return config;
});

// Add response interceptor to handle 401 errors
// NOTE: We don't auto-logout on 401 - session persists until explicit logout
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("401 Unauthorized error:", error.response?.data);
      
      // Don't auto-logout - session persists until user explicitly logs out
      // Only log the error, don't redirect
      const token = localStorage.getItem('token');
      if (!token) {
        // Only redirect if there's no token at all (user never logged in)
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
            window.location.href = "/login";
          }
        }
      } else {
        // Token exists - don't logout, just log the error
        // This might be a temporary server issue or permission problem
        console.warn("401 error but token exists - not logging out. Error:", error.response?.data);
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

// Ticket API functions
import type { Ticket, TicketCreate, TicketUpdate } from '../types/ticket';

export const createTicket = async (ticketData: TicketCreate): Promise<Ticket> => {
  const response = await instance.post("/tickets/create", ticketData);
  return response.data;
};

export const getTickets = async (): Promise<Ticket[]> => {
  const response = await instance.get("/tickets/");
  return response.data;
};

export const getMyTickets = async (): Promise<Ticket[]> => {
  const response = await instance.get("/tickets/my-created");
  return response.data;
};

export const getTicket = async (ticketId: string): Promise<Ticket> => {
  const response = await instance.get(`/tickets/${ticketId}`);
  return response.data;
};

export const updateTicket = async (ticketId: string, updateData: TicketUpdate): Promise<Ticket> => {
  const response = await instance.put(`/tickets/${ticketId}`, updateData);
  return response.data;
};

export const addTicketNote = async (ticketId: string, noteContent: string): Promise<Ticket> => {
  const response = await instance.post(`/tickets/${ticketId}/notes`, { content: noteContent });
  return response.data;
};

export const addTicketMessage = async (ticketId: string, messageData: any): Promise<Ticket> => {
  const response = await instance.post(`/tickets/${ticketId}/messages`, messageData);
  return response.data;
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  const response = await instance.delete(`/tickets/${ticketId}`);
  return response.data;
};

export default instance;
