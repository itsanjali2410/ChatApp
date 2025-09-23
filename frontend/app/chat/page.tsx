"use client";
import React, { useEffect, useState, useRef } from "react";
import api, { getFileUrl } from "../../utils/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { notificationService } from "../../utils/notificationService";
import FileUpload from "../../components/FileUpload";
import MessageBubble from "../../components/MessageBubble";
import OnlineUsers from "../../components/OnlineUsers";
import ProfileManager from "../../components/ProfileManager";

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
};
type Chat = { id: string; type: string; participants: string[]; organization_id: string };
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
  const [showProfile, setShowProfile] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastMessages, setLastMessages] = useState<{[chatId: string]: string}>({});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showPopupNotification, setShowPopupNotification] = useState(false);
  const [popupMessage, setPopupMessage] = useState<{sender: string, message: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";
  const orgId = typeof window !== "undefined" ? localStorage.getItem("org_id") || "" : "";

  // WebSocket connection
  const { isConnected, sendMessage: sendWSMessage } = useWebSocket({
    url: `/ws/${myId}`,
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      
      if (data.type === "new_message") {
        const newMessage: Message = {
          id: `ws-${Date.now()}`,
          chat_id: data.chat_id,
          sender_id: data.sender_id,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          message_type: data.message_type || "text"
        };
        setMessages(prev => {
          const updatedMessages = [...prev, newMessage];
          // Sort messages by timestamp to maintain correct order
          return updatedMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
        
        // Update last message for this chat
        setLastMessages(prev => ({
          ...prev,
          [data.chat_id]: data.message
        }));

        // Show notification if message is not from current user
        if (data.sender_id !== myId) {
          const sender = users.find(u => u._id === data.sender_id);
          const senderName = sender ? getDisplayName(sender) : 'Unknown User';
          
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
      } else if (data.type === "message_status") {
        console.log("Message status update:", data);
      }
    },
    onOpen: () => {
      console.log("WebSocket connected");
      // Set user as online when WebSocket connects
      api.post("/users/status/online").catch(console.error);
    },
    onClose: () => {
      console.log("WebSocket disconnected");
      // Set user as offline when WebSocket disconnects
      api.post("/users/status/offline").catch(console.error);
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
      try {
        const resUsers = await api.get("/users/by_org");
        setUsers(resUsers.data);
        
        // Load current user profile
        const resProfile = await api.get("/users/profile/me");
        setCurrentUser(resProfile.data);
        
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
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isNearBottom = () => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    return scrollHeight - scrollTop - clientHeight < 100; // Within 100px of bottom
  };

  useEffect(() => {
    // Only auto-scroll if user is near the bottom (hasn't scrolled up to read old messages)
    if (isNearBottom()) {
    scrollToBottom();
    }
  }, [messages]);

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
        const sortedMessages = msgs.data.sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
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
        scrollToBottom();
      }, 100);
    }
  }, [activeChat]);

  const openDirectChat = async (otherUserId: string) => {
    console.log("Opening chat with:", otherUserId);
    console.log("My ID:", myId);
    console.log("Org ID:", orgId);
    
    try {
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
      
      // Join the chat via WebSocket
      if (isConnected) {
        sendWSMessage(JSON.stringify({
          type: "join_chat",
          chat_id: newChat.id
        }));
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Failed to create chat";
      setError(detail);
      console.error("Error creating chat:", e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    const messageData = {
      chat_id: activeChat.id,
      message: newMessage.trim(),
      message_type: "text"
    };

    try {
      const response = await api.post("/messages/send", messageData);
      const sentMessage = response.data;
      
      // Add to local messages immediately and sort
      setMessages(prev => {
        const updatedMessages = [...prev, sentMessage];
        return updatedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
      
      // Update last message for this chat
      setLastMessages(prev => ({
        ...prev,
        [activeChat.id]: newMessage.trim()
      }));
      
      // Send via WebSocket for real-time delivery
      if (isConnected) {
        sendWSMessage(JSON.stringify({
          type: "message",
          chat_id: activeChat.id,
          message: newMessage.trim(),
          timestamp: sentMessage.timestamp
        }));
      }
      
      setNewMessage("");
      
      // Stop typing indicator
      if (isConnected) {
        sendWSMessage(JSON.stringify({
          type: "typing",
          chat_id: activeChat.id,
          is_typing: false
        }));
      }
      setIsTyping(false);
      
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Failed to send message";
      setError(detail);
      console.error("Error sending message:", e);
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
    
    if (!isTyping && activeChat && isConnected) {
      setIsTyping(true);
      sendWSMessage(JSON.stringify({
        type: "typing",
        chat_id: activeChat.id,
        is_typing: true
      }));
    }
    
    // Clear existing timeout
    if (window.typingTimeout) {
      clearTimeout(window.typingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    window.typingTimeout = setTimeout(() => {
      if (isConnected && activeChat) {
        sendWSMessage(JSON.stringify({
          type: "typing",
      chat_id: activeChat.id,
          is_typing: false
        }));
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
             return updatedMessages.sort((a, b) => 
               new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
             );
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

  if (showProfile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowProfile(false)}
            className="mb-4 btn-secondary"
          >
            ← Back to Chat
          </button>
          <ProfileManager onProfileUpdate={setCurrentUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Popup Notification */}
      {showPopupNotification && popupMessage && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm animate-slide-in">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {popupMessage.sender}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {popupMessage.message}
              </p>
            </div>
            <button
              onClick={() => setShowPopupNotification(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* WhatsApp Sidebar */}
      <div className="w-96 bg-white border-r border-gray-300 flex flex-col h-screen lg:flex">
        {/* WhatsApp Header - Sticky */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
          {currentUser && (
                <div className="relative">
              {currentUser.profile_picture ? (
                <img
                      src={getFileUrl(currentUser.profile_picture)}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-sm">
                  {getInitials(currentUser)}
                </div>
              )}
                </div>
              )}
              <h1 className="text-lg font-semibold text-gray-800">ChatApp</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-800">
                
              </button>
              
              
              <button 
                onClick={() => setShowProfile(true)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              </div>
            </div>
        </div>

        {/* Search Bar - Sticky */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 sticky top-16 z-10">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search or start new chat"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Chat List - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {users
              .filter(user => user._id !== myId)
              .map(user => (
                <div
                  key={user._id}
                  onClick={() => openDirectChat(user._id)}
                className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors duration-150 ${
                  activeChat?.participants.includes(user._id) ? 'bg-gray-50' : ''
                }`}
                >
                <div className="relative flex-shrink-0">
                  {user.profile_picture ? (
                    <img
                      src={getFileUrl(user.profile_picture)}
                      alt={getDisplayName(user)}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                      {getInitials(user)}
                    </div>
                  )}
                  {user.is_online && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getDisplayName(user)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        // Find the chat for this user
                        const userChat = chats.find(chat => 
                          chat.participants.includes(user._id) && chat.participants.includes(myId)
                        );
                        if (userChat) {
                          // Find the most recent message for this chat
                          const chatMessages = messages.filter(m => m.chat_id === userChat.id);
                          if (chatMessages.length > 0) {
                            const lastMessage = chatMessages[chatMessages.length - 1];
                            if (lastMessage && lastMessage.timestamp) {
                              return new Date(lastMessage.timestamp).toLocaleTimeString('en-IN', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata'
                              });
                            }
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
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate">
                      {user.is_typing ? (
                        <span className="text-green-600 italic">typing...</span>
                      ) : (
                        <span className="text-gray-500">
                          {(() => {
                            // Find the chat with this user
                            const userChat = chats.find(chat => 
                              chat.participants.includes(user._id) && 
                              chat.participants.includes(myId)
                            );
                            if (userChat && lastMessages[userChat.id]) {
                              return lastMessages[userChat.id];
                            }
                            return "Hey there! I am using ChatApp.";
                          })()}
                        </span>
                      )}
                    </p>
                    {!user.is_typing && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* WhatsApp Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-100 h-screen w-full">
          {activeChat ? (
          <>
            {/* WhatsApp Chat Header - Sticky */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-300 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                {/* Mobile Menu Button */}
                <button className="lg:hidden text-gray-600 hover:text-gray-800">
                  {/* <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg> */}
                </button>
                <button className="text-gray-600 hover:text-gray-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">
                    {users.find(u => activeChat.participants.includes(u._id) && u._id !== myId)?.first_name || 'Chat'}
                  </h2>
                  <p className="text-sm text-gray-500">last seen recently</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Voice Call - Commented out as not enabled */}
                  {/* <button className="text-gray-600 hover:text-gray-800" title="Voice Call">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button> */}
                  
                  {/* Video Call - Commented out as not enabled */}
                  {/* <button className="text-gray-600 hover:text-gray-800" title="Video Call">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button> */}
                  
                  <button className="text-gray-600 hover:text-gray-800" title="More Options">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
            </div>
            
            {/* WhatsApp Messages Area - Scrollable */}
            <div 
              className="flex-1 overflow-y-auto bg-gray-100 p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}
            >
              {messages.map((message) => (
                      <MessageBubble
                  key={message.id}
                  message={message}
                  isSelf={message.sender_id === myId}
                />
              ))}
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
            
            {/* WhatsApp Message Input - Sticky */}
            <div className="bg-white px-4 py-3 border-t border-gray-300 flex-shrink-0 sticky bottom-0 z-10">
              {showFileUpload && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileUpload
                    onFileUploaded={handleFileUpload}
                    disabled={false}
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-100"
                  title="Attach File"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                <div className="flex-1 relative">
                  <input 
                  type="text"
                    value={newMessage} 
                  onChange={handleTyping}
                  onKeyPress={handleKeyPress}
                    placeholder="Type a message"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                  </button>
                </div>
                
                    <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
        </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-100">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">ChatApp</h2>
                <p className="text-gray-600 mb-8 text-lg">Send and receive messages in real-time with your team.</p>
                <p className="text-gray-500 text-sm">A modern internal communication platform for seamless collaboration.</p>
            </div>
        </div>
        )}
      </div>
    </div>
  );
}