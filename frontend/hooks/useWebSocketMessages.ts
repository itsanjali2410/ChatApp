// Custom hook for handling WebSocket messages

import React, { useCallback } from 'react';
import type { Message, Chat, User, SeenByUser } from '../types/chat';
import type { WebSocketSendMessage } from '../types/websocket';
import { markMessagesAsDelivered } from '../utils/api';
import { notificationService } from '../utils/notificationService';
import { getDisplayName } from '../utils/userUtils';

export const useWebSocketMessages = (
  myId: string,
  activeChatRef: React.MutableRefObject<Chat | null>,
  usersRef: React.MutableRefObject<User[]>,
  chatsRef: React.MutableRefObject<Chat[]>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setLastMessages: React.Dispatch<React.SetStateAction<{ [chatId: string]: string }>>,
  setLastMessageTimestamps: React.Dispatch<React.SetStateAction<{ [chatId: string]: string }>>,
  setUnreadCounts: React.Dispatch<React.SetStateAction<{ [chatId: string]: number }>>,
  setHiddenUnreadBadge: React.Dispatch<React.SetStateAction<{ [chatId: string]: boolean }>>,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setPopupMessage: React.Dispatch<React.SetStateAction<{ sender: string; message: string } | null>>,
  setShowPopupNotification: React.Dispatch<React.SetStateAction<boolean>>,
  sendWSMessageRef: React.MutableRefObject<WebSocketSendMessage | null>,
  setLastMessageStatus?: React.Dispatch<React.SetStateAction<{ [chatId: string]: { status: string; seen_at?: string } }>>
) => {
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    const data = JSON.parse(event.data);

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
        seenBy: data.seenBy,
        reply_to: data.reply_to
      };

      // Update messages if this chat is currently active
      if (activeChatRef.current?.id === data.chat_id) {
        setMessages(prev => {
          const exists = prev.some(msg =>
            msg.id === newMessage.id ||
            (msg.sender_id === newMessage.sender_id &&
              msg.timestamp === newMessage.timestamp &&
              msg.message === newMessage.message)
          );
          if (exists) return prev;

          return [...prev, newMessage].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      }

      // Update last message preview for ALL chats
      const sender = usersRef.current.find(u => u._id === data.sender_id);
      const senderName = sender ? getDisplayName(sender) : '';
      const chat = chatsRef.current.find(c => c.id === data.chat_id);
      const isGroupChat = chat && chat.type === 'group';
      const messagePreview = isGroupChat && senderName
        ? `${senderName}: ${data.message}`
        : data.message;

      setLastMessages(prev => ({ ...prev, [data.chat_id]: messagePreview }));
      setLastMessageTimestamps(prev => ({ ...prev, [data.chat_id]: data.timestamp || new Date().toISOString() }));

      // Update unread count for chats that aren't active
      if (data.sender_id !== myId && activeChatRef.current?.id !== data.chat_id) {
        setUnreadCounts(prev => ({ ...prev, [data.chat_id]: (prev[data.chat_id] || 0) + 1 }));
        setHiddenUnreadBadge(prev => ({ ...prev, [data.chat_id]: false }));
      }

      // Show notification for messages from others
      if (data.sender_id !== myId) {
        const chatName = isGroupChat ? (chat?.group_name || 'Group Chat') : senderName;

        await markMessagesAsDelivered(data.chat_id).catch(() => { });
        if (sendWSMessageRef.current) {
          sendWSMessageRef.current({ type: "mark_delivered", chat_id: data.chat_id });
        }

        notificationService.playNotificationSound();
        notificationService.vibrate();

        setPopupMessage({
          sender: chatName,
          message: data.message_type === 'file' ? `📎 ${data.message}` : data.message
        });
        setShowPopupNotification(true);
        setTimeout(() => {
          setShowPopupNotification(false);
          setPopupMessage(null);
        }, 3000);

        if (data.message_type === 'file') {
          notificationService.showFileNotification(chatName, data.message, data.chat_id).catch(() => { });
        } else {
          notificationService.showMessageNotification(chatName, data.message, data.chat_id).catch(() => { });
        }
      }

      setUsers(prev => [...prev]);
    } else if (data.type === "typing") {
      // Typing indicator handled separately
    } else if (data.type === "messages_delivered") {
      setMessages(prev => prev.map(msg =>
        msg.chat_id === data.chat_id && msg.sender_id !== myId && msg.status === "sent"
          ? { ...msg, status: "delivered" }
          : msg
      ));
      setLastMessageStatus?.(prev => {
        if (prev[data.chat_id]) {
          return { ...prev, [data.chat_id]: { ...prev[data.chat_id], status: 'delivered' } };
        }
        return prev;
      });
    } else if (data.type === "messages_read") {
      setMessages(prev => prev.map(msg => {
        const shouldUpdate =
          msg.chat_id === data.chat_id &&
          msg.sender_id === myId &&
          (msg.status === "sent" || msg.status === "delivered" || msg.status === "read");
        if (!shouldUpdate) return msg;

        const seenByRaw = msg.seenBy as unknown;
        const existingEntries: Array<SeenByUser | string> = Array.isArray(seenByRaw)
          ? [...(seenByRaw as SeenByUser[])]
          : typeof seenByRaw === 'string'
            ? [seenByRaw]
            : [];

        const normalizedExisting: SeenByUser[] = existingEntries.map((entry) => {
          if (typeof entry === 'string') {
            return {
              user_id: entry,
              username: entry,
              seen_at: data.seen_at,
            };
          }
          return {
            user_id: entry.user_id,
            username: entry.username,
            seen_at: entry.seen_at ?? data.seen_at,
          };
        });

        const userId = typeof data.user_id === 'string' ? data.user_id : '';
        if (!userId) {
          return msg;
        }

        const already = normalizedExisting.some(entry => entry.user_id === userId);
        const updatedSeenBy = already
          ? normalizedExisting
          : [
              ...normalizedExisting,
              {
                user_id: userId,
                username: data.username || 'User',
                seen_at: data.seen_at,
              },
            ];

        return {
          ...msg,
          status: "read",
          seen_at: data.seen_at,
          seenBy: updatedSeenBy
        };
      }));
      setLastMessageStatus?.(prev => {
        if (prev[data.chat_id]) {
          return { ...prev, [data.chat_id]: { status: 'read', seen_at: data.seen_at } };
        }
        return prev;
      });
    } else if (data.type === "message_status") {
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id ? { ...msg, status: data.status } : msg
      ));
    } else if (data.type === "reaction") {
      setMessages(prev => prev.map(msg => {
        if (msg.id !== data.message_id) return msg;
        const current = msg.reactions as Array<{ emoji: string; users: string[] }> | undefined;
        const userId = data.user_id || 'unknown';
        if (!current) {
          return { ...msg, reactions: [{ emoji: data.emoji, users: [userId] }] } as Message;
        }
        const existing = current.find(r => r.emoji === data.emoji);
        if (existing) {
          const has = existing.users.includes(userId);
          existing.users = has ? existing.users.filter(u => u !== userId) : [...existing.users, userId];
          const cleaned = current.filter(r => r.users.length > 0);
          return { ...msg, reactions: cleaned } as Message;
        }
        return { ...msg, reactions: [...current, { emoji: data.emoji, users: [userId] }] } as Message;
      }));
    } else if (data.type === "user_status") {
      setUsers(prev => prev.map(user => {
        if (user._id !== data.user_id) return user;
        const updated: User & { last_seen?: string } = { ...user, is_online: data.is_online };
        if (data.last_seen) {
          updated.last_seen = data.last_seen;
        }
        return updated;
      }));
      // Trigger last seen display update when user status changes
      // This is handled by the useEffect in chat/page.tsx that watches users
    }
  }, [
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
  ]);

  return handleWebSocketMessage;
};

