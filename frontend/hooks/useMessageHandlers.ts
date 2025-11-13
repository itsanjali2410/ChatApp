// Custom hook for message-related handlers

import React, { useCallback } from 'react';
import api from '../utils/api';
import type { Message, ReplyTo, Chat } from '../types/chat';
import { getDisplayName } from '../utils/userUtils';

export const useMessageHandlers = (
  myId: string,
  activeChat: Chat | null,
  messages: Message[],
  users: any[],
  currentUser: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  setLastMessages: React.Dispatch<React.SetStateAction<{ [chatId: string]: string }>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setPopupMessage: React.Dispatch<React.SetStateAction<{ sender: string; message: string } | null>>,
  setShowPopupNotification: React.Dispatch<React.SetStateAction<boolean>>,
  sendWSMessageRef: React.MutableRefObject<((message: any) => void) | null>,
  isConnected: boolean
) => {
  const handleMessageCopy = useCallback((messageText: string) => {
    navigator.clipboard.writeText(messageText).then(() => {
      setPopupMessage({ sender: "System", message: "Message copied to clipboard" });
      setShowPopupNotification(true);
      setTimeout(() => setShowPopupNotification(false), 2000);
    }).catch(err => {
      console.error('Failed to copy message:', err);
    });
  }, [setPopupMessage, setShowPopupNotification]);

  const handleMessageReply = useCallback((message: Message) => {
    const sender = users.find(u => u._id === message.sender_id);
    const senderName = sender ? getDisplayName(sender) : 'Unknown User';

    return {
      message_id: message.id,
      message_text: message.message,
      sender_id: message.sender_id,
      sender_name: senderName
    } as ReplyTo;
  }, [users]);

  const handleMessageEdit = useCallback(async (messageId: string, newText: string) => {
    try {
      await api.put(`/messages/${messageId}`, {
        message: newText
      });

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
              ...msg,
              message: newText,
              edited: true,
              edited_at: new Date().toISOString()
            }
            : msg
        )
      );

      // Update last message if this was the last message
      if (activeChat) {
        const isLastMessage = messages[messages.length - 1]?.id === messageId;
        if (isLastMessage) {
          const currentUserName = currentUser?.first_name || currentUser?.username || 'You';
          const previewText = activeChat.type === 'group' ? `${currentUserName}: ${newText}` : newText;
          setLastMessages(prev => ({ ...prev, [activeChat.id]: previewText }));
        }
      }
    } catch (error) {
      console.error("Failed to edit message:", error);
      setError("Failed to edit message");
    }
  }, [activeChat, messages, currentUser, setMessages, setLastMessages, setError]);

  const handleMessageReact = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      const current = msg.reactions as Array<{ emoji: string; users: string[] }> | undefined;
      if (!current) {
        return { ...msg, reactions: [{ emoji, users: [myId] }] } as Message;
      }
      const existing = current.find(r => r.emoji === emoji);
      if (existing) {
        const has = existing.users.includes(myId);
        existing.users = has ? existing.users.filter(u => u !== myId) : [...existing.users, myId];
        const cleaned = current.filter(r => r.users.length > 0);
        return { ...msg, reactions: cleaned } as Message;
      }
      return { ...msg, reactions: [...current, { emoji, users: [myId] }] } as Message;
    }));

    // Notify others via websocket
    try {
      const target = messages.find(m => m.id === messageId);
      if (target && isConnected && sendWSMessageRef.current) {
        sendWSMessageRef.current({ type: 'reaction', chat_id: target.chat_id, message_id: messageId, emoji });
      }
    } catch { }
  }, [myId, messages, isConnected, sendWSMessageRef, setMessages]);

  const handleMessageDelete = useCallback(async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

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
  }, [activeChat, messages, setMessages, setLastMessages, setError]);

  return {
    handleMessageCopy,
    handleMessageReply,
    handleMessageEdit,
    handleMessageReact,
    handleMessageDelete,
  };
};

