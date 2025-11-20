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

// Function to check if token needs refresh (expires within 1 hour)

instance.interceptors.request.use(async (config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  if (token) {
    // Always attach token - don't check expiration
    // Session persists until explicit logout
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
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
import type { Ticket, TicketCreate, TicketUpdate, TicketMessageCreate } from '../types/ticket';

export const createTicket = async (ticketData: TicketCreate): Promise<Ticket> => {
  console.log('API: Creating ticket with data:', JSON.stringify(ticketData, null, 2));
  try {
    const response = await instance.post("/tickets/create", ticketData);
    console.log('API: Ticket created successfully:', response.data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown; status?: number } };
    console.error('API: Error creating ticket:', {
      status: axiosError?.response?.status,
      data: axiosError?.response?.data,
      fullError: error
    });
    throw error;
  }
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

export const addTicketMessage = async (ticketId: string, messageData: TicketMessageCreate): Promise<Ticket> => {
  const response = await instance.post(`/tickets/${ticketId}/messages`, messageData);
  return response.data;
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  const response = await instance.delete(`/tickets/${ticketId}`);
  return response.data;
};

export default instance;
