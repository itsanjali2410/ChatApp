"use client";

export const dynamic = 'force-dynamic';
import React, { useEffect, useState, useRef } from "react";
import api, { getFileUrl, markMessagesAsRead, markMessagesAsDelivered } from "../../utils/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { notificationService } from "../../utils/notificationService";
import FileUpload from "../../components/FileUpload";
import MessageBubble from "../../components/MessageBubble";
import OnlineUsers from "../../components/OnlineUsers";
import SettingsModal from "../../components/SettingsModal";
import GroupCreationModal from "../../components/GroupCreationModal";
import GroupManagementModal from "../../components/GroupManagementModal";
import ThemeToggle from "../../components/ThemeToggle";

// Extend the Window interface to include typingTimeout
declare global {
  interface Window {
    typingTimeout?: NodeJS.Timeout;
  }
}

type User = { 
  _id: string; 
  username?: string; 
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  is_online?: boolean;
  is_typing?: boolean;
  current_chat_id?: string;
  role?: string;
};
type Chat = { 
  id: string; 
  type: string; 
  participants: string[]; 
  organization_id: string;
  group_name?: string;
  group_description?: string;
  group_avatar?: string;
  created_by?: string;
  admins?: string[];
};
type FileAttachment = {
  file_id: string;
  filename: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  size: number;
};
type Message = { 
  id: string; 
  chat_id: string; 
  sender_id: string; 
  message: string; 
  message_type: string;
  attachment?: FileAttachment;
  timestamp: string; 
  status?: 'sent' | 'delivered' | 'read';
  seen_at?: string;
  seen_by?: string;
};

export default function ChatPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastMessages, setLastMessages] = useState<{[chatId: string]: string}>({});
  const [unreadCounts, setUnreadCounts] = useState<{[chatId: string]: number}>({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState<{[chatId: string]: string}>({});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showPopupNotification, setShowPopupNotification] = useState(false);
  const [popupMessage, setPopupMessage] = useState<{sender: string, message: string} | null>(null);
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);

  // Show sidebar by default on web, hide on mobile initially
  useEffect(() => {
    const updateSidebarForViewport = () => {
      if (typeof window === 'undefined') return;
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      setShowSidebar(isMobile ? false : true);
    };

    updateSidebarForViewport();
    window.addEventListener('resize', updateSidebarForViewport);
    return () => window.removeEventListener('resize', updateSidebarForViewport);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const orgId = typeof window !== "undefined" ? localStorage.getItem("org_id") || "" : "";
  
  // Debug logging
  console.log("My ID from localStorage:", myId);
  console.log("Users loaded:", users.length);
  console.log("Users data:", users);
  console.log("Filtered users (excluding self):", users.filter(user => user._id !== myId));
  console.log("Admin users:", users.filter(user => user.role === 'admin'));
  console.log("Regular users:", users.filter(user => user.role === 'user' || !user.role));

  // WebSocket connection
  const { isConnected, sendMessage: sendWSMessage } = useWebSocket({
    url: `/ws/${myId}`,
    onMessage: async (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      
      if (data.type === "new_message") {
        const newMessage: Message = {
          id: data.id || `ws-${Date.now()}`,
          chat_id: data.chat_id,
          sender_id: data.sender_id,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          message_type: data.message_type || "text",
          attachment: data.attachment,
          status: data.status || "sent",
          seen_at: data.seen_at,
          seen_by: data.seen_by
        };
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) return prev;
          
          const updatedMessages = [...prev, newMessage];
          // Sort messages by timestamp to maintain correct order
          return updatedMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
          });
        });
        
        // Update last message for this chat
        setLastMessages(prev => ({
          ...prev,
          [data.chat_id]: data.message
        }));

        // Update unread count if message is not from current user and chat is not active
        if (data.sender_id !== myId && activeChat?.id !== data.chat_id) {
          setUnreadCounts(prev => ({
            ...prev,
            [data.chat_id]: (prev[data.chat_id] || 0) + 1
          }));
        }

        // Update users list to move sender to top (real-time sorting)
        if (data.sender_id !== myId) {
          setUsers(prev => {
            const senderIndex = prev.findIndex(u => u._id === data.sender_id);
            if (senderIndex > 0) {
              const sender = prev[senderIndex];
              const updatedUsers = [...prev];
              updatedUsers.splice(senderIndex, 1);
              updatedUsers.unshift(sender);
              return updatedUsers;
            }
            return prev;
          });
        }

        // Also update chats list to move the chat to top
        setChats(prev => {
          const chatIndex = prev.findIndex(c => c.id === data.chat_id);
          if (chatIndex > 0) {
            const chat = prev[chatIndex];
            const updatedChats = [...prev];
            updatedChats.splice(chatIndex, 1);
            updatedChats.unshift(chat);
            return updatedChats;
          }
          return prev;
        });

        // Show notification if message is not from current user
        if (data.sender_id !== myId) {
          const sender = users.find(u => u._id === data.sender_id);
          const senderName = sender ? getDisplayName(sender) : 'Unknown User';
          
          // Mark messages as delivered when received
          try {
            await markMessagesAsDelivered(data.chat_id);
            sendWSMessage({
              type: "mark_delivered",
              chat_id: data.chat_id
            });
          } catch (error) {
            console.error("Error marking messages as delivered:", error);
          }
          
          // Play notification sound
          notificationService.playNotificationSound();
          
          // Vibrate if supported
          notificationService.vibrate();
          
          // Show popup notification
          setPopupMessage({
            sender: senderName,
            message: data.message_type === 'file' ? `📎 ${data.message}` : data.message
          });
          setShowPopupNotification(true);
          
          // Auto-hide popup after 3 seconds
          setTimeout(() => {
            setShowPopupNotification(false);
            setPopupMessage(null);
          }, 3000);
          
          // Show browser notification
          if (data.message_type === 'file') {
            notificationService.showFileNotification(senderName, data.message, data.chat_id);
          } else {
            notificationService.showMessageNotification(senderName, data.message, data.chat_id);
          }
        }
      } else if (data.type === "typing") {
        setOtherUserTyping(data.is_typing);
      } else if (data.type === "messages_delivered") {
        // Handle messages marked as delivered
        console.log("Messages delivered:", data);
        if (data.chat_id === activeChat?.id) {
          setMessages(prev => prev.map(msg => 
            msg.chat_id === data.chat_id && msg.sender_id !== myId && msg.status === "sent"
              ? { ...msg, status: "delivered" }
              : msg
          ));
        }
      } else if (data.type === "messages_read") {
        // Handle messages marked as read
        console.log("Messages read:", data);
        if (data.chat_id === activeChat?.id) {
          setMessages(prev => prev.map(msg => 
            msg.chat_id === data.chat_id && msg.sender_id !== myId && (msg.status === "sent" || msg.status === "delivered")
              ? { ...msg, status: "read", seen_at: data.seen_at, seen_by: data.user_id }
              : msg
          ));
        }
      } else if (data.type === "message_status") {
        // Handle individual message status update
        console.log("Message status update:", data);
        setMessages(prev => prev.map(msg => 
          msg.id === data.message_id
            ? { ...msg, status: data.status }
            : msg
        ));
      } else if (data.type === "user_status") {
        // Handle user online/offline status updates
        console.log("User status update:", data);
        setUsers(prev => prev.map(user => 
          user._id === data.user_id
            ? { ...user, is_online: data.is_online }
            : user
        ));
      }
    },
    onOpen: () => {
      console.log("WebSocket connected successfully");
      console.log("WebSocket URL:", `/ws/${myId}`);
      // Set user as online when WebSocket connects
      // Only attempt if we have a valid token
      const token = localStorage.getItem("token");
      if (token) {
        api.post("/users/status/online").catch((error) => {
          console.error("Failed to set user online:", error);
          // If it's a 401 error, the response interceptor will handle redirect
        });
      }
    },
    onClose: () => {
      console.log("WebSocket disconnected");
      // Set user as offline when WebSocket disconnects
      // Only attempt if we have a valid token
      const token = localStorage.getItem("token");
      if (token) {
        api.post("/users/status/offline").catch((error) => {
          console.error("Failed to set user offline:", error);
          // If it's a 401 error, the response interceptor will handle redirect
        });
      }
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
  });

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        // Show a test notification
        notificationService.showNotification('Notifications enabled!', {
          body: 'You will now receive notifications for new messages.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setError(null);
      
      // Check if user is authenticated
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to access the chat");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }
      
      try {
        const resUsers = await api.get("/users/by_org");
        setUsers(resUsers.data);
        
        // Load current user profile (handle both users and admins)
        try {
        const resProfile = await api.get("/users/profile/me");
        setCurrentUser(resProfile.data);
        } catch (profileError) {
          // If user profile fails, try admin profile
          try {
            const resAdminProfile = await api.get("/admin/profile");
            setCurrentUser(resAdminProfile.data);
          } catch (adminError) {
            console.error("Failed to load both user and admin profiles:", profileError, adminError);
            setError("Failed to load user profile");
          }
        }
        
        // Load existing chats
        const resChats = await api.get("/chats/my-chats");
        setChats(resChats.data);
        
        // Load last messages for all chats
        const lastMessagesData: {[chatId: string]: string} = {};
        for (const chat of resChats.data) {
          try {
            const msgs = await api.get(`/messages/chat/${chat.id}`);
            if (msgs.data && msgs.data.length > 0) {
              const lastMsg = msgs.data[msgs.data.length - 1];
              lastMessagesData[chat.id] = lastMsg.message || "📎 File";
            }
          } catch (e) {
            console.error(`Failed to load messages for chat ${chat.id}:`, e);
          }
        }
        setLastMessages(lastMessagesData);
      } catch (e: any) {
        const detail = e?.response?.data?.detail || "Failed to load users";
        setError(detail);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-scroll to bottom when messages change (only if user is near bottom)
  const scrollToBottom = (force = false) => {
    if (force || isNearBottom()) {
      // Use different timing for mobile vs desktop
      const delay = window.innerWidth < 768 ? 150 : 100;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      }, delay);
    }
  };

  const isNearBottom = () => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const threshold = window.innerWidth < 768 ? 200 : 150; // Larger threshold on mobile
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  useEffect(() => {
    // Only auto-scroll if user is near the bottom (hasn't scrolled up to read old messages)
    scrollToBottom();
  }, [messages.length]); // Only trigger when message count changes, not content

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.typingTimeout) {
        clearTimeout(window.typingTimeout);
      }
    };
  }, []);

  // Real-time polling for messages
  useEffect(() => {
    if (!activeChat) return;
    
    const pollMessages = async () => {
      try {
        const msgs = await api.get(`/messages/chat/${activeChat.id}`);
        console.log("Polled messages:", msgs.data);
        console.log("First message timestamp:", msgs.data[0]?.timestamp);
        
        // Sort messages by timestamp to ensure correct order
        const sortedMessages = msgs.data.sort((a: any, b: any) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
        
        setMessages(sortedMessages);
        
        // Update last message for this chat
        if (sortedMessages && sortedMessages.length > 0) {
          const lastMsg = sortedMessages[sortedMessages.length - 1];
          setLastMessages(prev => ({
            ...prev,
            [activeChat.id]: lastMsg.message || "📎 File"
          }));
        }
      } catch (e) {
        console.error("Failed to poll messages:", e);
      }
    };
    
    pollMessages();
    const interval = setInterval(pollMessages, 2000);
    return () => clearInterval(interval);
  }, [activeChat]);

  // Scroll to bottom when a new chat is opened
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      // Small delay to ensure messages are rendered
      setTimeout(() => {
        scrollToBottom(true); // Force scroll when opening chat
      }, 100);
    }
  }, [activeChat]);

  // Helper functions
  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email;
  };

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user.username || user.email).substring(0, 2).toUpperCase();
  };

  const formatLastSeen = (user: User | undefined) => {
    if (!user) return "last seen recently";
    
    if (user.is_online) {
      return "online";
    }
    
    if (!(user as any).last_seen) {
      return "last seen recently";
    }
    
    try {
      const lastSeenDate = new Date((user as any).last_seen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return "last seen just now";
      if (diffMins < 60) return `last seen ${diffMins}m ago`;
      if (diffHours < 24) return `last seen ${diffHours}h ago`;
      if (diffDays < 7) return `last seen ${diffDays}d ago`;
      
      return `last seen ${lastSeenDate.toLocaleDateString()}`;
    } catch (error) {
      return "last seen recently";
    }
  };

  // Filter users (sorting will be handled by backend)
  const filteredUsers = users.filter(user => {
    // Exclude current user
    if (user._id === myId) return false;
    
    // If no search query, show all users
    if (!searchQuery.trim()) return true;
    
    // Search in user name, email, and role
    const searchLower = searchQuery.toLowerCase();
    const userName = getDisplayName(user).toLowerCase();
    const userEmail = (user.email || '').toLowerCase();
    const userRole = (user.role || '').toLowerCase();
    
    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) || 
           userRole.includes(searchLower);
  });

  // Mark messages as read when chat is opened
  const markChatAsRead = async (chatId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [chatId]: 0
    }));
    setLastReadTimestamps(prev => ({
      ...prev,
      [chatId]: new Date().toISOString()
    }));
    
    // Mark messages as read via API
    try {
      await markMessagesAsRead(chatId);
      // Also send via WebSocket for real-time updates
      sendWSMessage({
        type: "mark_read",
        chat_id: chatId
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const openDirectChat = async (otherUserId: string) => {
    console.log("Opening chat with:", otherUserId);
    console.log("My ID:", myId);
    console.log("Org ID:", orgId);
    console.log("Token exists:", !!localStorage.getItem("token"));
    
    // Find the user we're trying to chat with
    const targetUser = users.find(user => user._id === otherUserId);
    console.log("Target user:", targetUser);
    console.log("Target user role:", targetUser?.role);
    
    if (!myId) {
      console.error("No user ID found in localStorage");
      setError("User not authenticated. Please log in again.");
      return;
    }
    
    try {
      console.log("Creating direct chat...");
      const response = await api.post("/chats/create-direct", {
        other_user_id: otherUserId
      });
      
      const newChat = response.data;
      console.log("Created/found chat:", newChat);
      
      // Add to chats if not already present
      setChats(prev => {
        const exists = prev.some(chat => chat.id === newChat.id);
        if (!exists) {
          return [...prev, newChat];
        }
        return prev;
      });
      
      setActiveChat(newChat);
      console.log("Set active chat to:", newChat);
      
      // Mark chat as read
      markChatAsRead(newChat.id);
      
      // Hide sidebar on mobile when chat is opened
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setShowSidebar(false);
      }
      
      // Join the chat via WebSocket
      if (isConnected) {
        console.log("Joining chat via WebSocket...");
         sendWSMessage({
          type: "join_chat",
          chat_id: newChat.id
         });
      } else {
        console.log("WebSocket not connected, cannot join chat");
      }
    } catch (e: any) {
      console.error("Error creating chat:", e);
      
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.clear();
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
      const detail = e?.response?.data?.detail || "Failed to create chat";
      setError(detail);
      }
    }
  };

  const openGroupChat = async (chat: Chat) => {
    console.log("Opening group chat:", chat);
    setActiveChat(chat);
    
    // Mark chat as read
    markChatAsRead(chat.id);
    
    // Hide sidebar on mobile when chat is opened
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSidebar(false);
    }
    
    // Join the chat via WebSocket
    if (isConnected) {
       sendWSMessage({
        type: "join_chat",
        chat_id: chat.id
       });
    }
  };

  const handleGroupCreated = (newGroup: any) => {
    console.log("Group created:", newGroup);
    
    // Add to chats if not already present
    setChats(prev => {
      const exists = prev.some(chat => chat.id === newGroup.id);
      if (!exists) {
        return [...prev, newGroup];
      }
      return prev;
    });
    
    setActiveChat(newGroup);
    
    // Join the chat via WebSocket
    if (isConnected) {
       sendWSMessage({
        type: "join_chat",
        chat_id: newGroup.id
       });
    }
  };

  const handleGroupUpdated = () => {
    // Refresh chats to get updated group info
    const loadChats = async () => {
      try {
        const resChats = await api.get("/chats/my-chats");
        setChats(resChats.data);
      } catch (e) {
        console.error("Failed to refresh chats:", e);
      }
    };
    loadChats();
  };

  const handleMessageCopy = (messageText: string) => {
    navigator.clipboard.writeText(messageText).then(() => {
      // Show a brief success notification
      setPopupMessage({
        sender: "System",
        message: "Message copied to clipboard"
      });
      setShowPopupNotification(true);
      setTimeout(() => setShowPopupNotification(false), 2000);
    }).catch(err => {
      console.error('Failed to copy message:', err);
    });
  };

  const handleMessageDelete = async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Update last message if this was the last message
      if (activeChat) {
        const remainingMessages = messages.filter(msg => msg.id !== messageId);
        const lastMessage = remainingMessages[remainingMessages.length - 1];
        setLastMessages(prev => ({
          ...prev,
          [activeChat.id]: lastMessage ? lastMessage.message : "No messages yet"
        }));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      setError('Failed to delete message');
    }
  };

  const handleChatDelete = async (chatId: string) => {
    try {
      await api.delete(`/chats/${chatId}`);
      // Remove chat from local state
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // If this was the active chat, clear it
      if (activeChat && activeChat.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
      
      // Remove from last messages
      setLastMessages(prev => {
        const updated = { ...prev };
        delete updated[chatId];
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setError('Failed to delete chat');
    }
  };

  // Check if organization has 3+ users (minimum for group creation)
  const canCreateGroup = users.length >= 3;

  const sendMessage = async () => {
    console.log("sendMessage called");
    console.log("newMessage:", newMessage);
    console.log("activeChat:", activeChat);
    console.log("isConnected:", isConnected);
    
    if (!newMessage.trim() || !activeChat) {
      console.log("Cannot send message - missing newMessage or activeChat");
      return;
    }

    const messageData = {
      chat_id: activeChat.id,
      message: newMessage.trim(),
      message_type: "text"
    };

    console.log("Sending message data:", messageData);

    try {
      const response = await api.post("/messages/send", messageData);
      const sentMessage = response.data;
      
      // Add to local messages immediately and sort
      setMessages(prev => {
        const updatedMessages = [...prev, sentMessage];
        return updatedMessages.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      });
      
      // Update last message for this chat
      setLastMessages(prev => ({
        ...prev,
        [activeChat.id]: newMessage.trim()
      }));
      
      // Send via WebSocket for real-time delivery
      if (isConnected) {
         sendWSMessage({
          type: "message",
          chat_id: activeChat.id,
          message: newMessage.trim(),
          timestamp: sentMessage.timestamp
         });
      }
      
      setNewMessage("");
      
      // Stop typing indicator
      if (isConnected) {
         sendWSMessage({
          type: "typing",
          chat_id: activeChat.id,
          is_typing: false
         });
      }
      setIsTyping(false);
      
    } catch (e: any) {
      console.error("Error sending message:", e);
      
      if (e?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
        // Clear localStorage and redirect to login
        localStorage.clear();
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
      const detail = e?.response?.data?.detail || "Failed to send message";
      setError(detail);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Ensure sidebar is hidden when typing on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSidebar(false);
    }
    
    if (!isTyping && activeChat && isConnected) {
      setIsTyping(true);
       sendWSMessage({
        type: "typing",
        chat_id: activeChat.id,
        is_typing: true
       });
    }
    
    // Clear existing timeout
    if (window.typingTimeout) {
      clearTimeout(window.typingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    window.typingTimeout = setTimeout(() => {
      if (isConnected && activeChat) {
         sendWSMessage({
          type: "typing",
      chat_id: activeChat.id,
          is_typing: false
         });
      }
      setIsTyping(false);
    }, 1000);
  };

  const handleFileUpload = (fileData: any) => {
    console.log("File uploaded:", fileData);
    setShowFileUpload(false);
    
    if (activeChat) {
      // Send file as message
      const messageData = {
        chat_id: activeChat.id,
        message: `📎 ${fileData.filename}`,
        message_type: "file",
        attachment: fileData
      };
      
      console.log("Sending message with file data:", messageData);
      
       api.post("/messages/send", messageData)
         .then(response => {
           console.log("Message sent successfully:", response.data);
           setMessages(prev => {
             const updatedMessages = [...prev, response.data];
            return updatedMessages.sort((a, b) => {
              const timeA = new Date(a.timestamp).getTime();
              const timeB = new Date(b.timestamp).getTime();
              return timeA - timeB;
            });
           });
          
          // Update last message for this chat
          setLastMessages(prev => ({
            ...prev,
            [activeChat.id]: `📎 ${fileData.filename}`
          }));
        })
        .catch(e => {
          console.error("Error sending file message:", e);
          setError("Failed to send file");
        });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        // Try parsing as UTC if failed
        const utcDate = new Date(timestamp + 'Z');
        if (isNaN(utcDate.getTime())) {
          return "Invalid time";
        }
        return utcDate.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Timestamp formatting error:', error);
      return "Invalid time";
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        const utcDate = new Date(timestamp + 'Z');
        if (isNaN(utcDate.getTime())) {
          return "Invalid time";
        }
        return utcDate.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Message time formatting error:', error);
      return "Invalid time";
    }
  };

  const formatMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        const utcDate = new Date(timestamp + 'Z');
        if (isNaN(utcDate.getTime())) {
          return "Invalid date";
        }
        return utcDate.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Message date formatting error:', error);
      return "Invalid date";
    }
  };

  const formatShortDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        const utcDate = new Date(timestamp + 'Z');
        if (isNaN(utcDate.getTime())) {
          return "Invalid date";
        }
        return utcDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      }
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Short date formatting error:', error);
      return "Invalid date";
    }
  };

  const shouldShowDateSeparator = (currentMessage: any, previousMessage: any) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        /* Mobile-first responsive design */
        @media (max-width: 640px) {
          /* Small mobile devices */
          .sidebar {
            width: 100vw;
            max-width: 100vw;
          }
          
          .chat-header {
            padding: 0.75rem 1rem;
          }
          
          .message-input {
            padding: 0.75rem 1rem;
          }
          
          .user-list-item {
            padding: 0.75rem 1rem;
          }
          
          .popup-notification {
            top: 1rem;
            right: 1rem;
            left: 1rem;
            max-width: none;
          }
        }
        
        @media (min-width: 641px) and (max-width: 768px) {
          /* Large mobile devices */
          .sidebar {
            width: 85vw;
            max-width: 400px;
          }
          
          .popup-notification {
            right: 1rem;
            left: auto;
            max-width: 20rem;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Tablets */
          .sidebar {
            width: 20rem;
            max-width: 20rem;
          }
          
          .chat-area {
            flex: 1;
            min-width: 0;
          }
        }
        
        @media (min-width: 1025px) {
          /* Desktop */
          .sidebar {
            width: 20rem;
            max-width: 20rem;
            position: relative;
            transform: none !important;
          }
          
          .main-layout {
            flex-direction: row;
          }
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
          .sidebar.show {
            transform: translateX(0);
          }
          .sidebar.hidden {
            transform: translateX(-100%);
          }
        }
        
        /* Mobile input area improvements */
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
        
        /* Prevent zoom on input focus on iOS */
        input[type="text"], input[type="email"], input[type="password"], textarea {
          font-size: 16px;
        }
        
        /* Ensure input area stays visible when keyboard appears */
        .chat-input-container {
          position: sticky;
          bottom: 0;
          z-index: 10;
        }
        
        /* Responsive text sizes */
        @media (max-width: 640px) {
          .text-responsive-lg {
            font-size: 1rem;
            line-height: 1.5rem;
          }
          
          .text-responsive-xl {
            font-size: 1.125rem;
            line-height: 1.75rem;
          }
          
          .text-responsive-2xl {
            font-size: 1.25rem;
            line-height: 1.75rem;
          }
        }
        
        @media (min-width: 641px) {
          .text-responsive-lg {
            font-size: 1.125rem;
            line-height: 1.75rem;
          }
          
          .text-responsive-xl {
            font-size: 1.25rem;
            line-height: 1.75rem;
          }
          
          .text-responsive-2xl {
            font-size: 1.5rem;
            line-height: 2rem;
          }
        }
        
        /* Responsive spacing */
        @media (max-width: 640px) {
          .space-responsive-x-2 > * + * {
            margin-left: 0.25rem;
          }
          
          .space-responsive-x-3 > * + * {
            margin-left: 0.5rem;
          }
          
          .space-responsive-x-4 > * + * {
            margin-left: 0.75rem;
          }
        }
        
        @media (min-width: 641px) {
          .space-responsive-x-2 > * + * {
            margin-left: 0.5rem;
          }
          
          .space-responsive-x-3 > * + * {
            margin-left: 0.75rem;
          }
          
          .space-responsive-x-4 > * + * {
            margin-left: 1rem;
          }
        }
        
        /* Scrollbar styling for better mobile experience */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 2px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
      `}} />
      <div className="h-screen bg-[var(--background)] flex flex-col lg:flex-row overflow-hidden relative main-layout">
      {/* Mobile Header - Only visible on mobile when sidebar is closed or when in chat */}
      <div className={`lg:hidden bg-[var(--secondary)] border-b border-[var(--border)] px-3 sm:px-4 py-3 flex items-center justify-between shadow-sm transition-opacity duration-300 ${showSidebar ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="w-8 sm:w-10"></div> {/* Responsive spacer for centering */}
      </div>

      {/* Popup Notification */}
      {showPopupNotification && popupMessage && (
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 left-4 sm:left-auto z-50 bg-[var(--secondary)] rounded-xl shadow-lg border border-[var(--border)] p-4 sm:p-6 max-w-sm sm:max-w-sm animate-in slide-in-from-right-5 duration-300 popup-notification">
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
      {/* Mobile Overlay - Only show when sidebar is open on mobile */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${showSidebar ? 'sidebar show translate-x-0' : 'sidebar hidden -translate-x-full'} lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto w-full sm:w-85vw sm:max-w-sm lg:w-80 bg-[var(--chat-sidebar)] border-r border-[var(--border)] flex flex-col transition-transform duration-300 ease-in-out shadow-lg`}>
        {/* Header */}
        <div className="bg-[var(--secondary)] px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Mobile menu button */}
              <button 
                className="lg:hidden text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--secondary-hover)] p-1.5 sm:p-2 rounded-lg transition-all duration-200"
                onClick={() => setShowSidebar(false)}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
          {currentUser && (
                <div className="relative">
              {currentUser.profile_picture ? (
                <img
                      src={getFileUrl(currentUser.profile_picture)}
                  alt="Profile"
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border-2 border-[var(--accent)]"
                />
              ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--text-inverse)] font-semibold border-2 border-[var(--accent)] text-xs sm:text-sm">
                  {getInitials(currentUser)}
                </div>
              )}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-[var(--success)] rounded-full border-2 border-[var(--secondary)]"></div>
                </div>
              )}
              <div className="ml-1 sm:ml-2">
                <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">Messages</h1>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium">
                  {currentUser?.first_name ? `Hi, ${currentUser.first_name}` : 'Team Chat'}
                </p>
            </div>
            </div>
              <button 
                onClick={() => setShowSettings(true)}
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-[var(--secondary)] border-b border-[var(--border)] flex-shrink-0">
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
              className="block w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3.5 border border-[var(--border)] rounded-lg text-xs sm:text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] transition-all duration-200"
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
          <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-[var(--border)]">
            <button
              onClick={() => setShowGroupCreation(true)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Group
            </button>
          </div>
        )}

        {/* Chat List - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Group Chats */}
          {(() => {
            const filteredGroupChats = chats.filter(chat => {
              if (chat.type !== "group") return false;
              
              // If no search query, show all group chats
              if (!searchQuery.trim()) return true;
              
              // Search in group name and description
              const searchLower = searchQuery.toLowerCase();
              const groupName = (chat.group_name || '').toLowerCase();
              const groupDescription = (chat.group_description || '').toLowerCase();
              
              return groupName.includes(searchLower) || 
                     groupDescription.includes(searchLower);
            });

            // Sort group chats by last message timestamp
            const sortedGroupChats = filteredGroupChats.sort((a, b) => {
              const aLastMessage = lastMessages[a.id];
              const bLastMessage = lastMessages[b.id];
              
              if (!aLastMessage && !bLastMessage) return 0;
              if (!aLastMessage) return 1;
              if (!bLastMessage) return -1;
              
              // For now, we'll sort by chat creation time as a fallback
              // In a real implementation, you'd want to track actual last message timestamps
              return new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
            });
            
            return sortedGroupChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => openGroupChat(chat)}
                className={`flex items-center px-6 py-4 hover:bg-[var(--secondary-hover)] cursor-pointer border-b border-[var(--border)] transition-all duration-200 group ${
                  activeChat?.id === chat.id ? 'bg-[var(--accent-light)] border-l-4 border-l-[var(--accent)]' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--text-inverse)] font-bold">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-[var(--text-primary)] truncate">
                      {chat.group_name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      {(() => {
                        // Find the most recent message for this chat
                        const chatMessages = messages.filter(m => m.chat_id === chat.id);
                        if (chatMessages.length > 0) {
                          const lastMessage = chatMessages[chatMessages.length - 1];
                          if (lastMessage && lastMessage.timestamp) {
                          return formatTimestamp(lastMessage.timestamp);
                          }
                        }
                        return new Date().toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata'
                        });
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-[var(--text-secondary)] truncate font-medium">
                      {lastMessages[chat.id] || `${chat.participants.length} members`}
                    </p>
                    <div className="flex items-center space-x-2">
                      {unreadCounts[chat.id] > 0 && (
                        <div className="bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2">
                          {unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}
                    </div>
                      )}
                      <div className="w-2.5 h-2.5 bg-[var(--success)] rounded-full"></div>
                  </div>
                </div>
              </div>
              </div>
            ));
          })()}

           {/* Team Members */}
          {(() => {
             // Check if we have any search results
             const hasGroupResults = chats.filter(chat => {
               if (chat.type !== "group") return false;
               if (!searchQuery.trim()) return true;
               const searchLower = searchQuery.toLowerCase();
               const groupName = (chat.group_name || '').toLowerCase();
               const groupDescription = (chat.group_description || '').toLowerCase();
               return groupName.includes(searchLower) || groupDescription.includes(searchLower);
             }).length > 0;
             
             const hasUserResults = filteredUsers.length > 0;
             
             // Show no results message if searching and no results found
             if (searchQuery.trim() && !hasGroupResults && !hasUserResults) {
               return (
                 <div className="flex flex-col items-center justify-center py-12 px-6">
                   <div className="w-16 h-16 bg-[var(--secondary-hover)] rounded-lg flex items-center justify-center mb-4 border border-[var(--border)]">
                     <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                   </div>
                   <p className="text-[var(--text-primary)] text-base font-medium text-center mb-2">
                     No users or groups found
                   </p>
                   <p className="text-[var(--text-secondary)] text-sm text-center mb-4">
                     Try searching with different keywords
                   </p>
                   <button
                     onClick={() => setSearchQuery("")}
                     className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors duration-200"
                   >
                     Clear search
                   </button>
                 </div>
               );
             }
             
             // Sort users by last message timestamp
             const sortedUsers = filteredUsers.sort((a, b) => {
               const aChat = chats.find(chat => 
                 chat.type === "direct" && 
                 chat.participants.includes(a._id) && 
                 chat.participants.includes(myId)
               );
               const bChat = chats.find(chat => 
                 chat.type === "direct" && 
                 chat.participants.includes(b._id) && 
                 chat.participants.includes(myId)
               );
               
               const aLastMessage = aChat ? lastMessages[aChat.id] : null;
               const bLastMessage = bChat ? lastMessages[bChat.id] : null;
               
               if (!aLastMessage && !bLastMessage) return 0;
               if (!aLastMessage) return 1;
               if (!bLastMessage) return -1;
               
               // Sort by last seen time as fallback
               const aLastSeen = new Date((a as any).last_seen || 0).getTime();
               const bLastSeen = new Date((b as any).last_seen || 0).getTime();
               return bLastSeen - aLastSeen;
             });
             
             return sortedUsers.map(user => {
              // Find the direct chat with this user
              const userChat = chats.find(chat => 
                chat.type === "direct" && 
                chat.participants.includes(user._id) && 
                chat.participants.includes(myId)
              );

              return (
                <div
                  key={user._id}
                   className={`flex items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-[var(--secondary-hover)] border-b border-[var(--border)] group transition-all duration-200 user-list-item ${
                     activeChat?.id === userChat?.id ? 'bg-[var(--accent-light)] border-l-4 border-l-[var(--accent)]' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {user.profile_picture ? (
                      <img
                        src={getFileUrl(user.profile_picture)}
                        alt={getDisplayName(user)}
                         className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-[var(--accent)]"
                      />
                    ) : (
                       <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-[var(--text-inverse)] text-xs sm:text-sm font-bold ${
                         user.role === 'admin' ? 'bg-[var(--accent)]' : 'bg-[var(--accent)]'
                       }`}>
                        {getInitials(user)}
                      </div>
                    )}
                    {user.is_online && user._id !== myId && (
                       <span className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-[var(--secondary)]"></span>
                    )}
                  </div>
                   <div 
                     className="ml-3 sm:ml-4 flex-1 min-w-0 cursor-pointer"
                     onClick={() => openDirectChat(user._id)}
                   >
                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-1.5 sm:space-x-2">
                         <p className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                        {getDisplayName(user)}
                      </p>
                         {user.role === 'admin' && (
                           <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-semibold bg-[var(--accent)] text-[var(--text-inverse)]">
                             Admin
                           </span>
                         )}
                       </div>
                       <div className="flex items-center space-x-1.5 sm:space-x-2">
                         <p className="text-xs text-[var(--text-secondary)] font-medium">
                          {(() => {
                            if (userChat) {
                              const chatMessages = messages.filter(m => m.chat_id === userChat.id);
                              if (chatMessages.length > 0) {
                                const lastMessage = chatMessages[chatMessages.length - 1];
                                if (lastMessage && lastMessage.timestamp) {
                            return formatTimestamp(lastMessage.timestamp);
                          }
                               }
                             }
                             
                          })()}
                        </p>
                         {userChat && (
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               if (window.confirm(`Are you sure you want to delete this chat with ${getDisplayName(user)}?`)) {
                                 handleChatDelete(userChat.id);
                               }
                             }}
                             className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                             title="Delete chat"
                           >
                             <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                           </button>
                         )}
                       </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                       <p className="text-xs text-[var(--text-secondary)] truncate">
                        {user.is_typing ? (
                           <span className="text-[var(--accent)] italic">typing...</span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">
                             {userChat ? (lastMessages[userChat.id] || "Hey there! I am using ChatApp.") : "Start chatting"}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        {userChat && unreadCounts[userChat.id] > 0 && (
                          <div className="bg-[var(--accent)] text-[var(--text-inverse)] text-xs font-bold rounded-full min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 flex items-center justify-center px-1.5 sm:px-2">
                            {unreadCounts[userChat.id] > 99 ? '99+' : unreadCounts[userChat.id]}
                        </div>
                      )}
                        {!user.is_typing && user.is_online && user._id !== myId && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
             });
           })()}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[var(--chat-bg)] min-h-0 h-screen w-full lg:relative relative overflow-hidden transition-opacity duration-300 chat-area ${showSidebar ? 'lg:opacity-100 opacity-0 lg:pointer-events-auto pointer-events-none' : 'opacity-100'}`}>
          {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-[var(--secondary)] px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0 shadow-sm chat-header">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Mobile Back Button */}
                <button 
                  className="lg:hidden text-[var(--text-muted)] hover:text-[var(--accent)] p-1.5 sm:p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
                  onClick={() => {
                    setShowSidebar(true);
                    setActiveChat(null);
                  }}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Chat Avatar */}
                <div className="relative">
                  {activeChat.type === "group" ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center">
                       <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  ) : (
                     <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                       <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                
                {/* Chat Info */}
                <div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <h2 className="font-semibold text-[var(--text-primary)] text-base sm:text-lg">
                      {activeChat.type === "group" 
                        ? activeChat.group_name 
                        : getDisplayName(users.find(u => activeChat.participants.includes(u._id) && u._id !== myId) || {} as User)
                      }
                    </h2>
                    {activeChat.type === "direct" && (() => {
                      const otherUser = users.find(u => activeChat.participants.includes(u._id) && u._id !== myId);
                      return otherUser?.is_online ? (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {activeChat.type === "group" 
                      ? `${activeChat.participants.length} members`
                      : formatLastSeen(users.find(u => activeChat.participants.includes(u._id) && u._id !== myId))
                    }
                  </p>
                </div>
              </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* Group Management Button */}
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
                  
                  {/* Delete Chat Button */}
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
            
            {/* WhatsApp Messages Area - Scrollable */}
            <div 
              className="flex-1 overflow-y-auto bg-[var(--chat-bg)] px-2 sm:px-4 py-4 sm:py-6 scrollbar-thin scrollbar-thumb-[var(--accent)] scrollbar-track-[var(--border)] min-h-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}
            >
              {(() => {
                console.log("Rendering messages:", messages.length, "messages for chat:", activeChat?.id);
                return messages.map((message, index) => {
                  const previousMessage = index > 0 ? messages[index - 1] : null;
                  const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                  
                  return (
                    <React.Fragment key={message.id}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                            {formatMessageDate(message.timestamp)}
                          </div>
                        </div>
                      )}
                      <MessageBubble
                  message={message}
                  isSelf={message.sender_id === myId}
                        onCopy={handleMessageCopy}
                        onDelete={handleMessageDelete}
                        senderName={(() => {
                          if (activeChat?.type === 'group' && message.sender_id !== myId) {
                            // Find sender in users array
                            const sender = users.find(user => user._id === message.sender_id);
                            if (sender) {
                              return getDisplayName(sender);
                            }
                          }
                          return undefined;
                        })()}
                        isGroupChat={activeChat?.type === 'group'}
                      />
                    </React.Fragment>
                  );
                });
              })()}
              {otherUserTyping && (
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span>typing...</span>
                </div>
              )}
                  <div ref={messagesEndRef} />
            </div>
            
             {/* Message Input */}
             <div className="bg-[var(--secondary)] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-[var(--border)] flex-shrink-0 shadow-lg safe-area-pb chat-input-container message-input">
              {showFileUpload && (
                 <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-[var(--secondary-hover)] rounded-lg border border-[var(--border)] shadow-sm">
                  <FileUpload
                    onFileUploaded={handleFileUpload}
                    disabled={false}
                  />
                </div>
              )}
              
               <div className="flex items-center space-x-2 sm:space-x-3 px-1 sm:px-2">
                <button
                  onClick={() => setShowFileUpload(!showFileUpload)}
                   className="p-2 sm:p-3 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg flex-shrink-0 hover:bg-[var(--secondary-hover)] transition-all duration-200"
                  title="Attach File"
                >
                   <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                 <div className="flex-1 relative min-w-0">
                  <input 
                  type="text"
                    value={newMessage} 
                  onChange={handleTyping}
                  onKeyPress={handleKeyPress}
                  onFocus={() => {
                    // Ensure sidebar is hidden when input is focused on mobile
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setShowSidebar(false);
                    }
                  }}
                     placeholder="Type a message..."
                     className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] text-sm sm:text-base bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-200"
                  />
                </div>
                
                    <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                   className="p-2 sm:p-3 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-all duration-200 shadow-sm"
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
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3 sm:mb-4">Welcome</h2>
              <p className="text-[var(--text-secondary)] text-base sm:text-lg mb-4 sm:mb-6 font-medium">Connect with your team members</p>
              <p className="text-[var(--text-secondary)] text-sm sm:text-base">Select a team member from the sidebar to start chatting</p>
            </div>
        </div>
        )}
      </div>

      {/* Group Creation Modal */}
      <GroupCreationModal
        isOpen={showGroupCreation}
        onClose={() => setShowGroupCreation(false)}
        users={users}
        currentUserId={myId}
        onGroupCreated={handleGroupCreated}
      />

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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentUser={currentUser}
      />
    </div>
    </>
  );
}