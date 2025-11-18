// Custom hook for real-time chat updates and synchronization

import { useEffect, useCallback, useRef } from 'react';
import api, { markMessagesAsRead } from '../utils/api';
import type { Chat, Message } from '../types/chat';
import type { WebSocketSendMessage } from '../types/websocket';

interface UseRealTimeChatOptions {
  activeChat: Chat | null;
  myId: string;
  isConnected: boolean;
  sendWSMessageRef: React.MutableRefObject<WebSocketSendMessage | null>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setLastMessages: React.Dispatch<React.SetStateAction<{ [chatId: string]: string }>>;
  markChatAsRead: (chatId: string) => Promise<void>;
}

export const useRealTimeChat = ({
  activeChat,
  myId,
  isConnected,
  sendWSMessageRef,
  setMessages,
  setLastMessages,
  markChatAsRead,
}: UseRealTimeChatOptions) => {
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const msgs = await api.get(`/messages/chat/${chatId}`);
      const sortedMessages = (msgs.data as Message[]).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedMessages);

      if (sortedMessages && sortedMessages.length > 0) {
        const lastMsg = sortedMessages[sortedMessages.length - 1];
        setLastMessages(prev => ({
          ...prev,
          [chatId]: lastMsg.message || "📎 File"
        }));
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  }, [setMessages, setLastMessages]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    loadMessages(activeChat.id);
    
    // Mark as read when opening chat
    markChatAsRead(activeChat.id);
  }, [activeChat?.id, loadMessages, markChatAsRead, setMessages]);

  // Reload messages when page becomes visible (window reopened)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && activeChat) {
        // Reload messages when page becomes visible
        await loadMessages(activeChat.id);
        
        // Mark chat as read when user returns
        await markChatAsRead(activeChat.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeChat?.id, loadMessages, markChatAsRead]);

  // Join chat room via WebSocket when chat is opened
  useEffect(() => {
    if (activeChat && isConnected && sendWSMessageRef.current) {
      // Add a small delay to ensure WebSocket is fully ready
      const joinTimeout = setTimeout(() => {
        if (sendWSMessageRef.current) {
          sendWSMessageRef.current({ type: "join_chat", chat_id: activeChat.id });
        }
      }, 200);
      return () => clearTimeout(joinTimeout);
    }
  }, [activeChat?.id, isConnected, sendWSMessageRef]);

  // Leave chat room when switching away
  useEffect(() => {
    return () => {
      if (activeChat && isConnected && sendWSMessageRef.current) {
        sendWSMessageRef.current({ type: "leave_chat", chat_id: activeChat.id });
      }
    };
  }, [activeChat?.id, isConnected, sendWSMessageRef]);
};

