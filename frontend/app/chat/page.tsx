"use client";

export const dynamic = 'force-dynamic';
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import api, { getFileUrl, markMessagesAsRead } from "../../utils/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useChatData } from "../../hooks/useChatData";
import { useMessageHandlers } from "../../hooks/useMessageHandlers";
import { useWebSocketMessages } from "../../hooks/useWebSocketMessages";
import FileUpload from "../../components/FileUpload";
import { DocumentsModal } from "../../components/DocumentsModal";
import { MediaManagerModal } from "../../components/MediaManagerModal";
import MessageBubble from "../../components/MessageBubble";
import { requestNotificationPermissionAndToken, onForegroundMessage, saveFCMTokenToBackend } from "../../utils/firebase";
import GroupManagementModal from "../../components/GroupManagementModal";
import type { User, Chat, Message, ReplyTo } from "../../types/chat";
import type { WebSocketSendMessage } from "../../types/websocket";
import type { ApiError, FileUploadData } from "../../types/api";
import { formatTimestamp, formatMessageDate, formatLastSeen, shouldShowDateSeparator } from "../../utils/formatUtils";
import { getDisplayName, getInitials } from "../../utils/userUtils";
import { notificationService } from "../../utils/notificationService";

// Extend the Window interface to include typingTimeout
declare global {
  interface Window {
    typingTimeout?: NodeJS.Timeout;
  }
}

export default function ChatPage() {
  // Constants
  const myId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";

  // Chat data hook
  const {
    users,
    setUsers,
    chats,
    setChats,
    currentUser,
    error,
    setError,
    lastMessages,
    setLastMessages,
    lastMessageTimestamps,
    setLastMessageTimestamps,
    unreadCounts,
    setUnreadCounts,
    setLastMessageStatus,
  } = useChatData();

  // Local state
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [hiddenUnreadBadge, setHiddenUnreadBadge] = useState<{ [chatId: string]: boolean }>({});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showPopupNotification, setShowPopupNotification] = useState(false);
  const [popupMessage, setPopupMessage] = useState<{ sender: string, message: string } | null>(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [lastSeenUpdateTime, setLastSeenUpdateTime] = useState(Date.now());
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const discardRecordingRef = useRef(false);
  const pointerActiveRef = useRef(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<Chat | null>(null);
  const usersRef = useRef<User[]>([]);
  const chatsRef = useRef<Chat[]>([]);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync with state
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  // Update last seen timing display every minute for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSeenUpdateTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Also update when user status changes
  useEffect(() => {
    setLastSeenUpdateTime(Date.now());
  }, [users]);

  const isNearBottom = useCallback(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return true;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const threshold = window.innerWidth < 768 ? 200 : 150;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottom()) {
      const delay = window.innerWidth < 768 ? 150 : 100;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      }, delay);
    }
  }, [isNearBottom]);

  // WebSocket sendMessage ref (must be declared before hooks that use it)
  const sendWSMessageRef = useRef<WebSocketSendMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Message handlers hook
  const {
    handleMessageCopy,
    handleMessageReply: createReplyTo,
    handleMessageEdit,
    handleMessageReact,
    handleMessageDelete,
  } = useMessageHandlers(
    myId,
    activeChat,
    messages,
    users,
    currentUser,
    setMessages,
    setLastMessages,
    setError,
    setPopupMessage,
    setShowPopupNotification,
    sendWSMessageRef,
    isConnected
  );

  const markChatAsRead = useCallback(async (chatId: string) => {
    setHiddenUnreadBadge(prev => ({ ...prev, [chatId]: true }));
    setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));

    try {
      await markMessagesAsRead(chatId);
      if (sendWSMessageRef.current) {
        sendWSMessageRef.current({ type: "mark_read", chat_id: chatId });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [setUnreadCounts]);

  const handleMessageReply = useCallback((message: Message) => {
    const replyTo = createReplyTo(message);
    setReplyingTo(replyTo);
    messageInputRef.current?.focus();
  }, [createReplyTo]);

  const handleChatDelete = useCallback(async (chatId: string) => {
    try {
      await api.delete(`/chats/${chatId}`);
      setChats(prev => prev.filter(chat => chat.id !== chatId));

      if (activeChat && activeChat.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }

      setLastMessages(prev => {
        const updated = { ...prev };
        delete updated[chatId];
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setError('Failed to delete chat');
    }
  }, [activeChat, setChats, setError, setLastMessages]);

  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  }, []);

  // WebSocket message handler hook
  const handleWebSocketMessage = useWebSocketMessages(
    myId,
    activeChatRef,
    usersRef,
    chatsRef,
    setMessages,
    setLastMessages,
    setLastMessageTimestamps,
    setUnreadCounts,
    setHiddenUnreadBadge,
    setUsers,
    setPopupMessage,
    setShowPopupNotification,
    sendWSMessageRef,
    setLastMessageStatus
  );

  // WebSocket connection
  const { isConnected: wsConnected, sendMessage: sendWSMessage } = useWebSocket({
    url: `/ws/${myId}`,
    onMessage: async (event) => {
      const data = JSON.parse(event.data);

      // Handle typing indicator separately
      if (data.type === "typing") {
        setOtherUserTyping(data.is_typing);
        return;
      }
      
      // Use the hook for other message types
      await handleWebSocketMessage(event);
    },
    onOpen: () => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
      sendWSMessageRef.current = sendWSMessage as WebSocketSendMessage;
      const token = localStorage.getItem("token");
      if (token) {
        api.post("/users/status/online").catch((error: unknown) => {
          console.error("Failed to set user online:", error);
        });
      }
    },
    onClose: () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      const token = localStorage.getItem("token");
      if (token) {
        api.post("/users/status/offline").catch((error: unknown) => {
          console.error("Failed to set user offline:", error);
        });
      }
    },
    onError: () => {
      // WebSocket error events are common during connection attempts
      // The reconnection logic will handle retries automatically
      // Silently handle errors - reconnection will be attempted automatically via onclose
    },
  });

  // Update isConnected when WebSocket connection changes
  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  // Auto-join all chats when WebSocket connects
  useEffect(() => {
    if (isConnected && chats.length > 0 && sendWSMessage) {
      console.log('🔌 WebSocket connected, joining all chats...');

      // Add a small delay to ensure WebSocket is fully open
      const joinChats = setTimeout(() => {
      chats.forEach(chat => {
        sendWSMessage({
          type: "join_chat",
          chat_id: chat.id
        });
        console.log(`✅ Joined chat: ${chat.id}`);
      });
      }, 100);

      return () => clearTimeout(joinChats);
    }
  }, [isConnected, chats, sendWSMessage]);

  // Listen for service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NEW_MESSAGE_NOTIFICATION') {
          console.log('📬 Service worker message received:', event.data);

          const data = event.data.data;
          const chatId = data.chatId || data.chat_id;

          if (chatId) {
            api.get(`/messages/chat/${chatId}`)
              .then(response => {
                if (response.data && response.data.length > 0) {
                  const lastMsg = response.data[response.data.length - 1];
                  setLastMessages(prev => ({
                    ...prev,
                    [chatId]: lastMsg.message || "📎 File"
                  }));
                  setLastMessageTimestamps(prev => ({
                    ...prev,
                    [chatId]: lastMsg.timestamp
                  }));

                  // Update unread count if not in active chat
                  if (activeChatRef.current?.id !== chatId) {
                    setUnreadCounts(prev => ({
                      ...prev,
                      [chatId]: (prev[chatId] || 0) + 1
                    }));
                  }
                }
              })
              .catch((err: unknown) => console.error('Failed to refresh messages:', err));
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [setLastMessages, setLastMessageTimestamps, setUnreadCounts]);

  // Firebase FCM initialization
  useEffect(() => {
    if (notificationPermission === 'granted') {
      requestNotificationPermissionAndToken().then((token) => {
        if (token) {
          console.log("✅ FCM Token obtained:", token);
          saveFCMTokenToBackend(token);
        }
      }).catch(error => {
        console.error("❌ Error getting FCM token:", error);
      });
    }

    onForegroundMessage((payload) => {
      console.log("📬 Foreground message received:", payload);
      if (payload.notification) {
        notificationService.showMessageNotification(
          payload.notification.title || 'New Message',
          payload.notification.body || 'You have a new message',
          payload.data?.chat_id
        );
      }
    });
  }, [notificationPermission]);

  // Detect screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 1024) {
        setShowSidebar(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Handle URL parameters for chat navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chat');
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) setActiveChat(chat);
    }
  }, [chats]);

  // Initial data loading is handled by useChatData hook

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.typingTimeout) {
        clearTimeout(window.typingTimeout);
      }
    };
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      setReplyingTo(null);
      return;
    }

    const loadMessages = async () => {
      try {
        const msgs = await api.get(`/messages/chat/${activeChat.id}`);
        const sortedMessages = (msgs.data as Message[]).sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);

        if (sortedMessages && sortedMessages.length > 0) {
          const lastMsg = sortedMessages[sortedMessages.length - 1];
          setLastMessages(prev => ({
            ...prev,
            [activeChat.id]: lastMsg.message || "📎 File"
          }));
        }
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    };

    loadMessages();
  }, [activeChat, setMessages, setLastMessages]);

  // Scroll to bottom immediately when chat changes (no smooth scroll)
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      // Use immediate scroll without animation
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
        // Hide scroll button after scrolling to bottom
        setShowScrollToBottom(false);
      }, 50);
    }
  }, [activeChat?.id, activeChat, messages.length]); // Only trigger when chat ID changes, not on every message

  // Check scroll position to show/hide scroll to bottom button
  useEffect(() => {
    if (!activeChat) {
      setShowScrollToBottom(false);
      return;
    }

    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const threshold = 200;
      const isNear = scrollHeight - scrollTop - clientHeight < threshold;
      setShowScrollToBottom(!isNear);
    };

    // Check initial position
    handleScroll();

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, [activeChat?.id, activeChat, messages.length]);

  const openDirectChat = useCallback(async (otherUserId: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSidebar(false);
    }

    if (!myId) {
      console.error("No user ID found in localStorage");
      setError("User not authenticated. Please log in again.");
      return;
    }

    try {
      const response = await api.post("/chats/create-direct", { other_user_id: otherUserId });
      const newChat = response.data;

      setChats(prev => {
        const exists = prev.some(chat => chat.id === newChat.id);
        return exists ? prev : [...prev, newChat];
      });

      setActiveChat(newChat);
      markChatAsRead(newChat.id);

      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setShowSidebar(false);
      }

      if (isConnected) {
        sendWSMessage({ type: "join_chat", chat_id: newChat.id });
      }
    } catch (e: unknown) {
      console.error("Error creating chat:", e);
      const apiError = e as ApiError;

      if (apiError?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.clear();
        setTimeout(() => { window.location.href = "/login"; }, 2000);
      } else {
        const detail = apiError?.response?.data?.detail || "Failed to create chat";
        setError(detail);
      }
    }
  }, [myId, isConnected, sendWSMessage, markChatAsRead, setChats, setError]);

  const openGroupChat = useCallback(async (chat: Chat) => {
    setActiveChat(chat);
    markChatAsRead(chat.id);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSidebar(false);
    }

    if (isConnected) {
      sendWSMessage({ type: "join_chat", chat_id: chat.id });
    }
  }, [isConnected, sendWSMessage, markChatAsRead]);

  const handleGroupUpdated = useCallback(async () => {
    try {
      const resChats = await api.get("/chats/my-chats");
      setChats(resChats.data);
    } catch (e) {
      console.error("Failed to refresh chats:", e);
    }
  }, [setChats]);

  // Improved sendMessage function that properly preserves reply data

  const sendMessage = useCallback(async () => {
  if (!newMessage.trim() || !activeChat) return;

  const messageText = newMessage.trim();
  const tempId = `temp-${Date.now()}`;
  
  // Store the current reply state BEFORE clearing it
  const currentReplyTo = replyingTo;

  // Create optimistic message with proper typing
  const optimisticMessage: Message = {
    id: tempId,
    chat_id: activeChat.id,
    sender_id: myId,
    message: messageText,
    timestamp: new Date().toISOString(),
    message_type: "text",
    status: "sent", // Use specific string literal type
    reply_to: currentReplyTo ?? undefined, // Fix: ensure correct type (ReplyTo | undefined)
  };
  setMessages(prev => [...prev, optimisticMessage].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  ));

    // Update last message
    const currentUserName = currentUser?.first_name || currentUser?.username || 'You';
    const previewText = activeChat.type === 'group' ? `${currentUserName}: ${messageText}` : messageText;
    setLastMessages(prev => ({ ...prev, [activeChat.id]: previewText }));
    setLastMessageTimestamps(prev => ({ ...prev, [activeChat.id]: optimisticMessage.timestamp }));

    // IMPORTANT: Clear input and reply state AFTER creating the optimistic message
    setNewMessage("");
    setReplyingTo(null);

    // Stop typing indicator
    setIsTyping(false);
    if (isConnected) {
      sendWSMessage({ type: "typing", chat_id: activeChat.id, is_typing: false });
    }

    // Send via WebSocket
    if (isConnected) {
      sendWSMessage({
        type: "message",
        chat_id: activeChat.id,
        message: messageText,
        message_type: "text",
        timestamp: optimisticMessage.timestamp,
        temp_id: tempId,
        reply_to: currentReplyTo  // Use the stored value here too
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
    }

    // Only include reply_to if it exists
    if (currentReplyTo) {
      payload.reply_to = currentReplyTo;
    }

    api.post("/messages/send", payload)
      .then((response) => {
        const sentMessage = response.data;
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempId);
          return [...filtered, sentMessage].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        // Last message status is handled by WebSocket
      })
      .catch((error: unknown) => {
        console.error("Error sending message:", error);
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? { ...msg, status: 'error' as const } : msg
        ));

        const apiError = error as ApiError;
        if (apiError?.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
          localStorage.clear();
          setTimeout(() => { window.location.href = "/login"; }, 2000);
        } else {
          const detail = apiError?.response?.data?.detail || "Failed to send message";
          setError(detail);
        }
      });
  }, [newMessage, activeChat, myId, currentUser, replyingTo, isConnected, sendWSMessage, setMessages, setLastMessages, setLastMessageTimestamps, setError]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSidebar(false);
    }

    if (!isTyping && activeChat && isConnected) {
      setIsTyping(true);
      sendWSMessage({ type: "typing", chat_id: activeChat.id, is_typing: true });
    }

    if (window.typingTimeout) {
      clearTimeout(window.typingTimeout);
    }

    window.typingTimeout = setTimeout(() => {
      if (isConnected && activeChat) {
        sendWSMessage({ type: "typing", chat_id: activeChat.id, is_typing: false });
      }
      setIsTyping(false);
    }, 1000);
  }, [isTyping, activeChat, isConnected, sendWSMessage]);

  const handleFileUpload = useCallback(async (fileData: FileUploadData) => {
    // Don't close file upload immediately - allow multiple files
    // setShowFileUpload(false);

    if (activeChat) {
      // Determine message type based on file type
      const messageType = fileData.file_type === 'image' ? 'image' : 'file';
      const messageText = fileData.file_type === 'image' 
        ? '📷 Image' 
        : `📎 ${fileData.filename}`;

      const messageData: {
        chat_id: string;
        message: string;
        message_type: string;
        attachment: FileUploadData;
        reply_to?: ReplyTo;
      } = {
        chat_id: activeChat.id,
        message: messageText,
        message_type: messageType,
        attachment: fileData
      };

      if (replyingTo) {
        messageData.reply_to = replyingTo;
      }

      try {
        // Send message via API
        const response = await api.post('/messages/send', messageData);
        const createdMessage = response.data;

        // Add message to local state immediately
        setMessages(prev => [...prev, createdMessage].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));

        // Update last message preview
        setLastMessages(prev => ({ ...prev, [activeChat.id]: messageText }));
        setLastMessageTimestamps(prev => ({ ...prev, [activeChat.id]: createdMessage.timestamp }));

        // Note: WebSocket message is already sent by the backend when API is called
        // No need to send separately via WebSocket

        // Clear reply if any
        if (replyingTo) {
          setReplyingTo(null);
        }
      } catch (error: unknown) {
        const apiError = error as ApiError;
        const errorMessage = apiError?.response?.data?.detail || 'Failed to send message';
        setError(errorMessage);
        console.error('Failed to send file message:', error);
      }
    }
  }, [activeChat, replyingTo, setMessages, setLastMessages, setLastMessageTimestamps, setError, setReplyingTo]);

  const handleVoiceNoteUpload = useCallback(async (audioBlob: Blob) => {
    if (!activeChat) return;

    try {
      // Convert audio blob to file
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
      
      // Upload audio file
      const formData = new FormData();
      formData.append('file', audioFile);

      const uploadResponse = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileData = uploadResponse.data;

      // Send as message with attachment
      const messageData: {
        chat_id: string;
        message: string;
        message_type: string;
        attachment: FileUploadData;
        reply_to?: ReplyTo;
      } = {
        chat_id: activeChat.id,
        message: '🎤 Voice note',
        message_type: 'file',
        attachment: {
          ...fileData,
          file_type: 'document' // Voice notes are treated as documents
        }
      };

      if (replyingTo) {
        messageData.reply_to = replyingTo;
      }

      const response = await api.post('/messages/send', messageData);
      const createdMessage = response.data;

      setMessages(prev => [...prev, createdMessage].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));

      setLastMessages(prev => ({ ...prev, [activeChat.id]: '🎤 Voice note' }));
      setLastMessageTimestamps(prev => ({ ...prev, [activeChat.id]: createdMessage.timestamp }));

      if (replyingTo) {
        setReplyingTo(null);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.detail || 'Failed to send voice note';
      setError(errorMessage);
      console.error('Failed to send voice note:', error);
    }
  }, [activeChat, replyingTo, setMessages, setLastMessages, setLastMessageTimestamps, setError, setReplyingTo]);

  const stopVoiceRecording = useCallback((cancel = false) => {
    discardRecordingRef.current = cancel;
    pointerActiveRef.current = false;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
    }
    setRecordingTime(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (error) {
        console.error('Failed to stop MediaRecorder:', error);
      }
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, [isRecordingVoice]);

  const startVoiceRecording = useCallback(async () => {
    if (isRecordingVoice) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert('Microphone access is not supported in this environment.');
      return;
    }

    if (typeof window !== 'undefined' && typeof MediaRecorder === 'undefined') {
      alert('Voice notes are not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      discardRecordingRef.current = false;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const activeStream = mediaStreamRef.current;
        mediaStreamRef.current = null;

        if (activeStream) {
          activeStream.getTracks().forEach(track => track.stop());
        }

        mediaRecorderRef.current = null;

        const shouldDiscard = discardRecordingRef.current;
        discardRecordingRef.current = false;

        if (shouldDiscard) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        if (audioBlob.size > 0) {
          await handleVoiceNoteUpload(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      if (!pointerActiveRef.current) {
        stopVoiceRecording(discardRecordingRef.current);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please allow microphone access to record voice notes.');
      stopVoiceRecording(true);
    }
  }, [handleVoiceNoteUpload, isRecordingVoice, stopVoiceRecording]);

      // Unified sorted chat list (groups + users) sorted by most recent messages
      const sortedChats = useMemo(() => {
        // Get all group chats
        const groupChats = chats.filter(chat => chat.type === "group");
        
        // Get all direct chats with their corresponding users
        const directChatsWithUsers = users
          .filter(user => user._id !== myId)
          .map(user => {
            const userChat = chats.find(chat =>
              chat.type === "direct" &&
              chat.participants.includes(user._id) &&
              chat.participants.includes(myId)
            );
            return { user, chat: userChat };
          });

        // Combine all chats into a unified list
        const allChats: Array<{
          type: 'group' | 'direct';
          chat: Chat | null;
          user?: User;
        }> = [];

        // Add group chats
        groupChats.forEach(chat => {
          if (!searchQuery.trim()) {
            allChats.push({ type: 'group', chat });
          } else {
            const searchLower = searchQuery.toLowerCase();
            const groupName = (chat.group_name || '').toLowerCase();
            const groupDescription = (chat.group_description || '').toLowerCase();
            if (groupName.includes(searchLower) || groupDescription.includes(searchLower)) {
              allChats.push({ type: 'group', chat });
            }
          }
        });

        // Add direct chats with users
        directChatsWithUsers.forEach(({ user, chat }) => {
          if (!chat) {
            // No chat exists yet, but include if search matches
            if (searchQuery.trim()) {
              const searchLower = searchQuery.toLowerCase();
              const userName = getDisplayName(user).toLowerCase();
              const userEmail = (user.email || '').toLowerCase();
              const userRole = (user.role || '').toLowerCase();
              if (userName.includes(searchLower) || userEmail.includes(searchLower) || userRole.includes(searchLower)) {
                allChats.push({ type: 'direct', chat: null, user });
              }
            } else {
              allChats.push({ type: 'direct', chat: null, user });
            }
          } else {
            if (!searchQuery.trim()) {
              allChats.push({ type: 'direct', chat, user });
            } else {
              const searchLower = searchQuery.toLowerCase();
              const userName = getDisplayName(user).toLowerCase();
              const userEmail = (user.email || '').toLowerCase();
              const userRole = (user.role || '').toLowerCase();
              if (userName.includes(searchLower) || userEmail.includes(searchLower) || userRole.includes(searchLower)) {
                allChats.push({ type: 'direct', chat, user });
              }
            }
          }
        });

        // Sort by last message timestamp (most recent first)
        return allChats.sort((a, b) => {
          const aChatId = a.chat?.id;
          const bChatId = b.chat?.id;
          
          const aLastTimestamp = aChatId ? lastMessageTimestamps[aChatId] : null;
          const bLastTimestamp = bChatId ? lastMessageTimestamps[bChatId] : null;

          // If both have timestamps, sort by most recent
          if (aLastTimestamp && bLastTimestamp) {
            return new Date(bLastTimestamp).getTime() - new Date(aLastTimestamp).getTime();
          }

          // If only one has timestamp, prioritize it
          if (aLastTimestamp && !bLastTimestamp) return -1;
          if (!aLastTimestamp && bLastTimestamp) return 1;

          // If neither has timestamp, use created_at for groups, or put direct chats without chats at end
            if (!aLastTimestamp && !bLastTimestamp) {
            if (a.type === 'group' && b.type === 'group') {
              const aCreated = a.chat?.created_at ? new Date(a.chat.created_at).getTime() : 0;
              const bCreated = b.chat?.created_at ? new Date(b.chat.created_at).getTime() : 0;
              return bCreated - aCreated;
            }
            // Direct chats without existing chats go to the end
            if (!a.chat && b.chat) return 1;
            if (a.chat && !b.chat) return -1;
            return 0;
          }

          return 0;
        });
      }, [chats, users, myId, searchQuery, lastMessageTimestamps]);

      const canCreateGroup = users.length >= 3;

      // Don't block UI with loading screen - show sidebar immediately
      // Data will load in background and populate as it arrives
      if (error && !users.length && !chats.length) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      return (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }
          
          /* Responsive Design */
          @media (max-width: 640px) {
            .sidebar { width: 100vw; max-width: 100vw; }
            .chat-header, .message-input { padding: 0.75rem 1rem; position: sticky; z-index: 50; background: var(--secondary); }
            .user-list-item { padding: 0.75rem 1rem; }
            .popup-notification { top: 1rem; right: 1rem; left: 1rem; max-width: none; }
          }
          
          @media (min-width: 641px) and (max-width: 768px) {
            .sidebar { width: 85vw; max-width: 400px; }
            .popup-notification { right: 1rem; left: auto; max-width: 20rem; }
          }
          
          @media (min-width: 769px) and (max-width: 1024px) {
            .sidebar { width: 20rem; max-width: 20rem; }
            .chat-area { flex: 1; min-width: 0; }
          }
          
          @media (min-width: 1025px) {
            .sidebar { width: 20rem; max-width: 20rem; position: relative; transform: none !important; }
            .main-layout { flex-direction: row; }
          }
          
          /* Sidebar transitions */
          @media (max-width: 1024px) {
            .sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s ease-in-out;
              position: fixed;
              z-index: 50;
              height: 100vh;
              top: 0;
              left: 0;
            }
            .sidebar.show { transform: translateX(0); }
            .sidebar.hidden { transform: translateX(-100%); }
            
            .chat-header, .chat-input-container {
              position: fixed !important;
              left: 0 !important;
              right: 0 !important;
              z-index: 60 !important;
              background: var(--secondary) !important;
              width: 100% !important;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .chat-header { top: 0 !important; }
            .chat-input-container { bottom: 0 !important; box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1); }
            
            .messages-container {
              padding-top: 70px !important;
              padding-bottom: 90px !important;
              min-height: calc(100vh - 160px);
            }
            
            body { overflow: hidden; }
            .main-layout { position: relative; height: 100vh; height: 100dvh; overflow: hidden; }
          }
          
          /* Reply preview styles */
          .reply-preview {
            background: var(--secondary-hover);
            border-left: 3px solid var(--accent);
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 0.375rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .reply-message {
            background: var(--secondary-hover);
            border-left: 3px solid var(--accent);
            padding: 0.5rem;
            margin-bottom: 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            cursor: pointer;
          }
          
          .reply-message:hover {
            background: var(--border);
          }
          
          /* Prevent zoom on input focus on iOS */
          input[type="text"], input[type="email"], input[type="password"], textarea {
            font-size: 16px;
          }
          
          /* Scrollbar styling */
          .scrollbar-thin {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }
          
          .scrollbar-thin::-webkit-scrollbar { width: 4px; }
          .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, 0.5);
            border-radius: 2px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.7);
          }
        `}} />

          <div className="h-screen bg-[var(--background)] flex flex-col lg:flex-row overflow-hidden relative main-layout">
            {/* Popup Notification */}
            {showPopupNotification && popupMessage && (
              <div className="fixed top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-[var(--secondary)] rounded-xl shadow-lg border border-[var(--border)] p-4 sm:p-6 max-w-sm animate-in slide-in-from-right-5 duration-300 popup-notification">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-inverse)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-1">
                      {popupMessage.sender}
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {popupMessage.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPopupNotification(false)}
                    className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-200 p-1 rounded-lg hover:bg-[var(--secondary-hover)]"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Overlay */}
            {showSidebar && !activeChat && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
                onClick={() => setShowSidebar(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`${showSidebar && !activeChat ? 'translate-x-0' : activeChat ? '-translate-x-full' : 'translate-x-0'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto w-full lg:w-80 bg-[var(--chat-sidebar)] border-r border-[var(--border)] flex flex-col transition-transform duration-300 ease-in-out lg:shadow-lg shadow-2xl`}>
              {/* Header */}
              <div className="bg-[var(--secondary)] px-3 sm:px-4 py-2.5 sm:py-3 flex-shrink-0 border-b border-[var(--border)] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {currentUser && (
                      <div 
                        className="relative cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowDocumentsModal(true)}
                        title="View shared documents"
                      >
                        {currentUser.profile_picture ? (
                          <Image
                            src={getFileUrl(currentUser.profile_picture)}
                            alt="Profile"
                            width={48}
                            height={48}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-[var(--accent)]/30 shadow-md"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-[var(--text-inverse)] font-semibold border-2 border-[var(--accent)]/30 text-xs sm:text-sm shadow-md">
                            {getInitials(currentUser)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="ml-1 sm:ml-2">
                      <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">Messages</h1>
                      <p className="text-[var(--text-muted)] text-[11px] sm:text-xs font-medium">
                        {currentUser?.first_name ? `Hi, ${currentUser.first_name}` : 'Team Chat'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/settings'}
                    className="p-2 sm:p-2.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--secondary-hover)] rounded-lg transition-all duration-200"
                    title="Settings"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--secondary)] border-b border-[var(--border)] flex-shrink-0 shadow-sm backdrop-blur-sm bg-opacity-95">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users and groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 border border-[var(--border)] rounded-lg text-xs placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] transition-all duration-200 shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-200 p-1 rounded-lg hover:bg-[var(--secondary-hover)]"
                    >
                      <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Create Group Button */}
              {canCreateGroup && (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-b border-[var(--border)]">
                  <button
                    onClick={() => window.location.href = '/create-group'}
                    className="w-full px-3 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] flex items-center justify-center text-xs font-semibold transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Group
                  </button>
                </div>
              )}

              {/* Chat List - Unified (Groups + Users sorted by recent messages) */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {sortedChats.map((item) => {
                  if (item.type === 'group') {
                    const chat = item.chat;
                    if (!chat) return null; // Skip if chat is null (shouldn't happen for groups)
                    return (
                  <div
                    key={chat.id}
                    onClick={() => openGroupChat(chat)}
                        className={`flex items-center px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer border-b border-[var(--border)] transition-all duration-200 group hover:bg-[var(--secondary-hover)] ${activeChat?.id === chat.id ? 'bg-[var(--accent)]/5 border-l-4 border-l-[var(--accent)] shadow-sm' : ''
                      }`}
                  >
                    <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-[var(--text-inverse)] font-bold shadow-md">
                            <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                        <div className="ml-2.5 sm:ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                          {chat.group_name}
                        </p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap flex-shrink-0">
                              {lastMessageTimestamps[chat.id] ? formatTimestamp(lastMessageTimestamps[chat.id]) : "—"}
                        </p>
                      </div>
                          <div className="flex items-center justify-between mt-0.5 gap-2">
                            <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {lastMessages[chat.id] || `${chat.participants.length} members`}
                        </p>
                        {unreadCounts[chat.id] > 0 && !hiddenUnreadBadge[chat.id] && (
                              <div className="bg-[var(--accent)] text-[var(--text-inverse)] text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1.5 flex-shrink-0">
                            {unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    );
                  } else {
                    // Direct chat
                    const user = item.user!;
                    const userChat = item.chat;
                  return (
                    <div
                      key={user._id}
                        className={`flex items-center px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[var(--border)] group transition-all duration-200 user-list-item hover:bg-[var(--secondary-hover)] ${activeChat?.id === userChat?.id ? 'bg-[var(--accent)]/5 border-l-4 border-l-[var(--accent)] shadow-sm' : ''
                        }`}
                    >
                      <div className="relative flex-shrink-0">
                        {user.profile_picture ? (
                            <Image
                            src={getFileUrl(user.profile_picture)}
                            alt={getDisplayName(user)}
                              width={48}
                              height={48}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-[var(--accent)]/30 shadow-sm"
                              unoptimized
                          />
                        ) : (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[var(--text-inverse)] text-xs font-bold bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] shadow-md">
                            {getInitials(user)}
                          </div>
                        )}
                      </div>
                      <div
                          className="ml-2.5 sm:ml-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => openDirectChat(user._id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                              {getDisplayName(user)}
                            </p>
                            {user.role === 'admin' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent)] text-[var(--text-inverse)] flex-shrink-0">
                                Admin
                              </span>
                            )}
                          </div>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap flex-shrink-0">
                              {userChat && lastMessageTimestamps[userChat.id] ? formatTimestamp(lastMessageTimestamps[userChat.id]) : userChat ? "—" : ""}
                          </p>
                        </div>
                          <div className="flex items-center justify-between mt-0.5 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                              {user.is_typing ? (
                                <span className="text-[var(--accent)] italic">typing...</span>
                              ) : (
                                <span className="text-[var(--text-secondary)]">
                                  {userChat ? (lastMessages[userChat.id] || "Hey there! I am using ChatApp.") : "Start chatting"}
                                </span>
                              )}
                            </p>

                            {/* Unread count badge */}
                            {userChat && unreadCounts[userChat.id] > 0 && !hiddenUnreadBadge[userChat.id] && (
                                <div className="bg-[var(--accent)] text-[var(--text-inverse)] text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1.5 flex-shrink-0">
                                {unreadCounts[userChat.id] > 99 ? '99+' : unreadCounts[userChat.id]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  }
                })}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-[var(--chat-bg)] min-h-0 h-screen w-full lg:relative absolute inset-0 overflow-hidden transition-transform duration-300 chat-area ${activeChat ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
              {activeChat ? (
                <>
                  {/* Chat Header */}
                  <div className="bg-[var(--secondary)] px-3 sm:px-3.5 py-2 sm:py-2.5 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0 shadow-sm chat-header backdrop-blur-sm bg-opacity-95">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <button
                        className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveChat(null);
                          setShowSidebar(true);
                        }}
                        title="Back to chat list"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <div 
                        className="relative cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowMediaManager(true)}
                        title="View media & documents"
                      >
                        {activeChat.type === "group" ? (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] rounded-xl flex items-center justify-center shadow-md">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        ) : (
                          (() => {
                            const otherUser = users.find(u => activeChat.participants.includes(u._id) && u._id !== myId);
                            return otherUser?.profile_picture ? (
                              <Image
                                src={getFileUrl(otherUser.profile_picture)}
                                alt={getDisplayName(otherUser)}
                                width={40}
                                height={40}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-[var(--accent)]/30 shadow-md"
                                unoptimized
                              />
                            ) : (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] rounded-xl flex items-center justify-center text-[var(--text-inverse)] font-bold text-xs sm:text-sm shadow-md">
                                {getInitials(otherUser || {} as User)}
                              </div>
                            );
                          })()
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <h2 className="font-semibold text-[var(--text-primary)] text-sm sm:text-base tracking-tight">
                            {activeChat.type === "group"
                              ? activeChat.group_name
                              : getDisplayName(users.find(u => activeChat.participants.includes(u._id) && u._id !== myId) || {} as User)
                            }
                          </h2>
                        </div>
                        <p className="text-[11px] sm:text-xs text-[var(--text-muted)] font-medium mt-0.5" key={lastSeenUpdateTime}>
                          {activeChat.type === "group"
                            ? `${activeChat.participants.length} members`
                            : (() => {
                              const otherUser = users.find(u => activeChat.participants.includes(u._id) && u._id !== myId);
                              // lastSeenUpdateTime forces re-render to update timing display
                              return formatLastSeen(otherUser);
                            })()
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {activeChat.type === "group" && (
                        <button
                          onClick={() => setShowGroupManagement(true)}
                          className="text-gray-600 hover:text-gray-800 p-1 sm:p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                          title="Group Info"
                        >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete this chat?`)) {
                            handleChatDelete(activeChat.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2 rounded-full transition-all"
                        title="Delete Chat"
                      >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div
                    className="flex-1 overflow-y-auto bg-[var(--chat-bg)] px-1.5 sm:px-2 py-1.5 sm:py-2 scrollbar-thin messages-container relative"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundRepeat: 'repeat'
                    }}
                  >
                    {/* Scroll to Bottom Button */}
                    {showScrollToBottom && (
                      <button
                        onClick={() => scrollToBottom(true)}
                        className="absolute bottom-4 right-4 z-40 p-3 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full shadow-xl hover:bg-[var(--accent-hover)] transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-2"
                        title="Scroll to bottom"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>
                    )}
                    {messages.map((message, index) => {
                      const previousMessage = index > 0 ? messages[index - 1] : null;
                      const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && (
                            <div className="flex items-center justify-center my-5">
                              <div className="bg-[var(--secondary)] border border-[var(--border)] text-[var(--text-muted)] px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                                {formatMessageDate(message.timestamp)}
                              </div>
                            </div>
                          )}
                          <div id={`message-${message.id}`}>
                            <MessageBubble
                              message={message}
                              isSelf={message.sender_id === myId}
                              onCopy={handleMessageCopy}
                              onDelete={handleMessageDelete}
                              onReply={handleMessageReply}
                              onEdit={handleMessageEdit}
                              senderName={(() => {
                                if (activeChat?.type === 'group' && message.sender_id !== myId) {
                                  const sender = users.find(user => user._id === message.sender_id);
                                  if (sender) {
                                    return getDisplayName(sender);
                                  }
                                }
                                return undefined;
                              })()}
                              isGroupChat={activeChat?.type === 'group'}
                              currentUserId={myId}
                              users={users}
                              onReplyPreviewClick={(replyToId: string) => scrollToMessage(replyToId)}
                              onReact={handleMessageReact}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {otherUserTyping && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span>typing...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="bg-[var(--secondary)] px-3 sm:px-3.5 py-2 sm:py-2.5 border-t border-[var(--border)] flex-shrink-0 shadow-lg chat-input-container message-input backdrop-blur-sm bg-opacity-95">
                    {showFileUpload && (
                      <div className="mb-3 sm:mb-4 rounded-lg border border-[var(--border)] bg-[var(--secondary-hover)] p-2 sm:p-3 shadow-sm">
                        <FileUpload
                          onFileUploaded={handleFileUpload}
                          onAllFilesUploaded={() => setShowFileUpload(false)}
                          disabled={false}
                          autoOpen
                        />
                      </div>
                    )}

                    {/* Reply Preview */}
                    {replyingTo && (
                      <div className="reply-preview mb-2 bg-[var(--accent)]/10 border-l-4 border-[var(--accent)] pl-3 pr-2 py-2 rounded-r-md flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--accent)] mb-0.5">
                            Replying to {replyingTo.sender_name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {replyingTo.message_text || 'Media'}
                          </p>
                        </div>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-[var(--text-muted)] hover:text-[var(--accent)] p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1 flex-shrink-0 ml-2"
                          aria-label="Cancel reply"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 sm:space-x-3 px-1 sm:px-2">
                      <button
                        onClick={() => setShowFileUpload(prev => !prev)}
                        className="p-2 sm:p-3 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg flex-shrink-0 hover:bg-[var(--secondary-hover)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1"
                        title="Attach File"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>

                      {/* Voice Note Button */}
                      <button
                        type="button"
                        onPointerDown={(event) => {
                          if (event.pointerType === 'mouse' && event.button !== 0) {
                            return;
                          }
                          event.preventDefault();
                          pointerActiveRef.current = true;
                          void startVoiceRecording();
                        }}
                        onPointerUp={() => {
                          pointerActiveRef.current = false;
                          stopVoiceRecording(false);
                        }}
                        onPointerLeave={() => {
                          pointerActiveRef.current = false;
                          stopVoiceRecording(true);
                        }}
                        onPointerCancel={() => {
                          pointerActiveRef.current = false;
                          stopVoiceRecording(true);
                        }}
                        className={`p-2 sm:p-3 rounded-lg flex-shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1 ${
                          isRecordingVoice
                            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                            : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--secondary-hover)]'
                        }`}
                        title={isRecordingVoice ? `Recording... ${recordingTime}s` : "Hold to record voice note"}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>

                      <div className="flex-1 relative min-w-0">
                        <input
                          ref={messageInputRef}
                          type="text"
                          value={newMessage}
                          onChange={handleTyping}
                          onKeyPress={handleKeyPress}
                          onFocus={() => {
                            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                              setShowSidebar(false);
                            }
                          }}
                          placeholder="Type a message..."
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] text-xs sm:text-sm bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-200 shadow-sm"
                        />
                      </div>

                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2.5 sm:p-3.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-xl hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-[var(--chat-bg)]">
                  <div className="text-center max-w-lg mx-auto p-6 sm:p-12">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-[var(--accent)] shadow-lg">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--text-inverse)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                      </svg>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3 sm:mb-4">Welcome</h2>
                    <p className="text-[var(--text-secondary)] text-base sm:text-lg mb-4 sm:mb-6 font-medium">Connect with your team members</p>
                    <p className="text-[var(--text-secondary)] text-sm sm:text-base">Select a team member from the sidebar to start chatting</p>
                  </div>
                </div>
              )}
            </div>

            {/* Group Management Modal */}
            {activeChat && activeChat.type === "group" && (
              <GroupManagementModal
                isOpen={showGroupManagement}
                onClose={() => setShowGroupManagement(false)}
                chat={activeChat}
                users={users}
                currentUserId={myId}
                onGroupUpdated={handleGroupUpdated}
              />
            )}

            {/* Documents Modal */}
            {currentUser && (
              <DocumentsModal
                isOpen={showDocumentsModal}
                onClose={() => setShowDocumentsModal(false)}
                currentUserId={currentUser._id || myId}
                chats={chats}
                users={users}
              />
            )}

            {/* Media Manager Modal */}
            {activeChat && (
              <MediaManagerModal
                isOpen={showMediaManager}
                onClose={() => setShowMediaManager(false)}
                chat={activeChat}
                users={users}
                currentUserId={myId}
              />
            )}
          </div>
        </>
      );
    }


