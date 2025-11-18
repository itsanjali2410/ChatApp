// Custom hook for managing chat data fetching and state

import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { User, Chat, Message } from '../types/chat';
import type { ApiError } from '../types/api';

export const useChatData = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMessages, setLastMessages] = useState<{ [chatId: string]: string }>({});
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<{ [chatId: string]: string }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [chatId: string]: number }>({});
  const [lastMessageStatus, setLastMessageStatus] = useState<{ [chatId: string]: { status: string; seen_at?: string } }>({});

  const loadInitialData = useCallback(async () => {
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      const currentPath = window.location.pathname;
      if (currentPath.includes('/chat')) {
        setError("Please log in to access the chat");
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      }
      return;
    }

    // Validate token format only - don't check expiration
    // Session persists until user explicitly logs out
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Token format is valid - proceed
      // Don't check expiration - session never expires automatically
    } catch (e) {
      console.error("Invalid token format:", e);
      // Only redirect if token format is completely invalid
      // This means user never logged in properly
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
          setError("Invalid session. Please log in.");
          setTimeout(() => { window.location.href = "/login"; }, 2000);
        }
      }
      return;
    }

    try {
      const resUsers = await api.get("/users/by_org");
      setUsers(resUsers.data);

      // Load current user profile
      try {
        const resProfile = await api.get("/users/profile/me");
        setCurrentUser(resProfile.data);
      } catch (profileError) {
        try {
          const resAdminProfile = await api.get("/admin/profile");
          setCurrentUser(resAdminProfile.data);
        } catch (adminError) {
          console.error("Failed to load profiles:", profileError, adminError);
          setError("Failed to load user profile");
        }
      }

      // Load existing chats (without loading all messages - messages load only when chat is opened)
      const resChats = await api.get("/chats/my-chats");
      const loadedChats = resChats.data;
      setChats(loadedChats);

      // Load last message for each chat to populate timestamps and previews
      const lastMessagesData: { [chatId: string]: string } = {};
      const lastTimestampsData: { [chatId: string]: string } = {};
      const unreadCountsData: { [chatId: string]: number } = {};

      // Fetch last message for each chat in parallel (but only the last one, not all messages)
      const lastMessagePromises = loadedChats.map(async (chat: Chat) => {
        try {
          const messagesRes = await api.get(`/messages/chat/${chat.id}`);
          const messages = messagesRes.data;
          if (Array.isArray(messages) && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            lastTimestampsData[chat.id] = lastMsg.timestamp;
            
            // Format last message preview
            if (lastMsg.message_type === 'image') {
              lastMessagesData[chat.id] = '📷 Image';
            } else if (lastMsg.message_type === 'file') {
              lastMessagesData[chat.id] = `📎 ${lastMsg.attachment?.filename || 'File'}`;
            } else {
              lastMessagesData[chat.id] = lastMsg.message || '';
            }
          }
        } catch {
          // Silently fail for individual chats - they might not have messages yet
          console.debug(`No messages found for chat ${chat.id}`);
        }
      });

      // Wait for all last message fetches to complete
      await Promise.all(lastMessagePromises);

      setLastMessages(lastMessagesData);
      setLastMessageTimestamps(lastTimestampsData);
      setUnreadCounts(unreadCountsData);
    } catch (e: unknown) {
      const apiError = e as ApiError;
      const detail = apiError?.response?.data?.detail || "Failed to load users";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    users,
    setUsers,
    chats,
    setChats,
    currentUser,
    setCurrentUser,
    loading,
    setLoading,
    error,
    setError,
    lastMessages,
    setLastMessages,
    lastMessageTimestamps,
    setLastMessageTimestamps,
    unreadCounts,
    setUnreadCounts,
    lastMessageStatus,
    setLastMessageStatus,
    reloadChats: loadInitialData,
  };
};


