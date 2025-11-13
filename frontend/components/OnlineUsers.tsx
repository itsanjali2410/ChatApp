"use client";
import React, { useState, useEffect } from 'react';
import api, { getFileUrl } from '../utils/api';

interface OnlineUser {
  _id: string;
  username: string;
  email: string;
  profile_picture?: string;
  first_name?: string;
  last_name?: string;
  is_online: boolean;
  last_seen?: string;
  is_typing?: boolean;
  current_chat_id?: string;
}

interface OnlineUsersProps {
  currentChatId?: string;
  onUserClick?: (user: OnlineUser) => void;
  websocketUrl?: string; // Optional WebSocket URL for real-time updates
}

export default function OnlineUsers({ currentChatId, onUserClick, websocketUrl }: OnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Fetch initial online users
  useEffect(() => {
    fetchOnlineUsers();
  }, []);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!websocketUrl) return;

    const ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
      console.log('OnlineUsers: WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different WebSocket event types
        if (data.type === 'user_status') {
          // Update user online/offline status
          setOnlineUsers(prev => {
            const userIndex = prev.findIndex(u => u._id === data.user_id);
            
            if (data.is_online) {
              // User came online
              if (userIndex === -1) {
                // Add new online user
                return [...prev, {
                  _id: data.user_id,
                  username: data.username || '',
                  email: data.email || '',
                  first_name: data.first_name,
                  last_name: data.last_name,
                  profile_picture: data.profile_picture,
                  is_online: true,
                  last_seen: new Date().toISOString(),
                  is_typing: false
                }];
              } else {
                // Update existing user
                const updated = [...prev];
                updated[userIndex] = {
                  ...updated[userIndex],
                  is_online: true,
                  last_seen: new Date().toISOString()
                };
                return updated;
              }
            } else {
              // User went offline
              if (userIndex !== -1) {
                const updated = [...prev];
                updated[userIndex] = {
                  ...updated[userIndex],
                  is_online: false,
                  last_seen: data.last_seen || new Date().toISOString(),
                  is_typing: false
                };
                return updated;
              }
            }
            return prev;
          });
        } else if (data.type === 'typing') {
          // Update typing status
          setOnlineUsers(prev => {
            const userIndex = prev.findIndex(u => u._id === data.user_id);
            if (userIndex !== -1) {
              const updated = [...prev];
              updated[userIndex] = {
                ...updated[userIndex],
                is_typing: data.is_typing,
                current_chat_id: data.chat_id
              };
              return updated;
            }
            return prev;
          });
        } else if (data.type === 'online_users_list') {
          // Full list of online users (periodic update from server)
          setOnlineUsers(data.users || []);
        }
      } catch (error) {
        console.error('OnlineUsers: Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('OnlineUsers: WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('OnlineUsers: WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (websocketUrl) {
          console.log('OnlineUsers: Attempting to reconnect...');
          // This will trigger the effect again
        }
      }, 5000);
    };

    setWsConnection(ws);

    return () => {
      ws.close();
    };
  }, [websocketUrl]);

  const fetchOnlineUsers = async () => {
    try {
      const response = await api.get('/users/online');
      setOnlineUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (user: OnlineUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email;
  };

  const getInitials = (user: OnlineUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user.username || user.email).substring(0, 2).toUpperCase();
  };

  const formatLastSeen = (lastSeen: string) => {
    try {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch (error) {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Online Users</h3>
            <p className="text-sm text-gray-600">{onlineUsers.length} users online</p>
          </div>
          {/* Connection status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${wsConnection?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-500">
              {wsConnection?.readyState === WebSocket.OPEN ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {onlineUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No users online</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {onlineUsers.map((user) => (
              <div
                key={user._id}
                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  user.current_chat_id === currentChatId ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
                onClick={() => onUserClick?.(user)}
              >
                <div className="flex items-center space-x-3">
                  {/* Profile Picture or Avatar */}
                  <div className="relative">
                    {user.profile_picture ? (
                      <img
                        src={getFileUrl(user.profile_picture)}
                        alt={getDisplayName(user)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(user)}
                      </div>
                    )}
                    
                    {/* Online Status Indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                      user.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getDisplayName(user)}
                      </p>
                      {user.is_typing && user.current_chat_id === currentChatId && (
                        <span className="text-xs text-blue-600 font-medium">typing...</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                    {!user.is_online && user.last_seen && (
                      <p className="text-xs text-gray-400">
                        Last seen {formatLastSeen(user.last_seen)}
                      </p>
                    )}
                    {user.is_online && (
                      <p className="text-xs text-green-600 font-medium">
                        Online
                      </p>
                    )}
                  </div>

                  {/* Status Indicators */}
                  <div className="flex flex-col items-end space-y-1">
                    {user.is_typing && user.current_chat_id && user.current_chat_id !== currentChatId && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-600">typing</span>
                      </div>
                    )}
                    {user.current_chat_id && user.current_chat_id !== currentChatId && !user.is_typing && (
                      <span className="text-xs text-gray-500">in chat</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}