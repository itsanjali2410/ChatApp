// Custom hook for chat messaging (sending messages, typing indicators, etc.)

import { useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import type { Chat, Message, ReplyTo, User } from '../types/chat';
import type { WebSocketSendMessage } from '../types/websocket';
import type { ApiError } from '../types/api';

interface UseChatMessagingOptions {
  activeChat: Chat | null;
  myId: string;
  currentUser: User | null;
  isConnected: boolean;
  sendWSMessageRef: React.MutableRefObject<WebSocketSendMessage | null>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setLastMessages: React.Dispatch<React.SetStateAction<{ [chatId: string]: string }>>;
  setLastMessageTimestamps: React.Dispatch<React.SetStateAction<{ [chatId: string]: string }>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useChatMessaging = ({
  activeChat,
  myId,
  currentUser,
  isConnected,
  sendWSMessageRef,
  setMessages,
  setLastMessages,
  setLastMessageTimestamps,
  setError,
}: UseChatMessagingOptions) => {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const currentReplyTo = replyingTo;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: activeChat.id,
      sender_id: myId,
      message: messageText,
      timestamp: new Date().toISOString(),
      message_type: "text",
      status: "sent",
      reply_to: currentReplyTo ?? undefined,
    };
    
    setMessages(prev => [...prev, optimisticMessage].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ));

    // Update last message
    const currentUserName = currentUser?.first_name || currentUser?.username || 'You';
    const previewText = activeChat.type === 'group' ? `${currentUserName}: ${messageText}` : messageText;
    setLastMessages(prev => ({ ...prev, [activeChat.id]: previewText }));
    setLastMessageTimestamps(prev => ({ ...prev, [activeChat.id]: optimisticMessage.timestamp }));

    // Clear input and reply state
    setNewMessage("");
    setReplyingTo(null);

    // Stop typing indicator
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isConnected && sendWSMessageRef.current) {
      sendWSMessageRef.current({ type: "typing", chat_id: activeChat.id, is_typing: false });
    }

    // Send via WebSocket
    if (isConnected && sendWSMessageRef.current) {
      sendWSMessageRef.current({
        type: "message",
        chat_id: activeChat.id,
        message: messageText,
        message_type: "text",
        timestamp: optimisticMessage.timestamp,
        temp_id: tempId,
        reply_to: currentReplyTo
      });
    }

    // Send to API
    const payload: {
      chat_id: string;
      message: string;
      message_type: string;
      reply_to?: ReplyTo;
    } = {
      chat_id: activeChat.id,
      message: messageText,
      message_type: "text"
    };

    if (currentReplyTo) {
      payload.reply_to = currentReplyTo;
    }

    try {
      const response = await api.post("/messages/send", payload);
      const sentMessage = response.data;
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempId);
        return [...filtered, sentMessage].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      setMessages(prev => prev.map(msg =>   
        msg.id === tempId ? { ...msg, status: 'error' as const } : msg
      ));

      const apiError = error as ApiError;

      if (apiError?.response?.status === 401) {
        // Don't auto-logout on 401 - session persists until explicit logout
        // Just show error message
        const detail = apiError?.response?.data?.detail || "Failed to send message. Please try again.";
        setError(detail);
        console.warn("401 error but not logging out - session persists");
      } else {
        const detail = apiError?.response?.data?.detail || "Failed to send message";
        setError(detail);
      }
    }
  }, [newMessage, activeChat, myId, currentUser, replyingTo, isConnected, sendWSMessageRef, setMessages, setLastMessages, setLastMessageTimestamps, setError]);

  const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping && activeChat && isConnected && sendWSMessageRef.current) {
      setIsTyping(true);
      sendWSMessageRef.current({ type: "typing", chat_id: activeChat.id, is_typing: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isConnected && activeChat && sendWSMessageRef.current) {
        sendWSMessageRef.current({ type: "typing", chat_id: activeChat.id, is_typing: false });
      }
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }, 1000);
  }, [isTyping, activeChat, isConnected, sendWSMessageRef]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleMessageReply = useCallback((message: Message, users?: User[]) => {
    const safeUsers = Array.isArray(users) ? users : [];
    const sender =
      safeUsers.find(u => u._id === message.sender_id) || null;
    const senderName =
      sender?.first_name ||
      sender?.username ||
      'Unknown User';
    
    const replyTo: ReplyTo = {
      message_id: message.id,
      message_text: message.message,
      sender_id: message.sender_id,
      sender_name: senderName
    };
    
    setReplyingTo(replyTo);
  }, []);

  return {
    newMessage,
    setNewMessage,
    isTyping,
    replyingTo,
    setReplyingTo,
    sendMessage,
    handleTyping,
    handleKeyPress,
    handleMessageReply,
  };
};

