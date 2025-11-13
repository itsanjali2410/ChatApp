"use client";
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { getFileUrl } from '../utils/api';
import type { Message } from '../types/chat';
import { formatFileSize, formatExactTime, formatSeenFull } from '../utils/formatUtils';
import { EditMessageModal } from './message/EditMessageModal';
import { DeleteMessageModal } from './message/DeleteMessageModal';
import { SeenByModal } from './message/SeenByModal';
import { useLongPress } from '../hooks/useLongPress';
import { useDoubleTap } from '../hooks/useDoubleTap';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  isTemp?: boolean;
  senderName?: string;
  isGroupChat?: boolean;
  currentUserId?: string;
  users?: Array<{ _id: string; username?: string; first_name?: string; last_name?: string; email?: string }>;
  onCopy?: (messageText: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onReplyPreviewClick?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export default function MessageBubble({ 
  message, 
  isSelf, 
  isTemp = false, 
  senderName, 
  isGroupChat = false,
  currentUserId,
  users = [],
  onCopy,
  onDelete,
  onReply,
  onEdit,
  onReplyPreviewClick,
  onReact
}: MessageBubbleProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedText, setEditedText] = useState(message.message || "");
  const [showSeenByModal, setShowSeenByModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const quickReactionsRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Character limit for message preview
  const TEXT_PREVIEW_LIMIT = 280;
  const isLongText = message.message && message.message.length > TEXT_PREVIEW_LIMIT;
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // After render, check if text needs truncation
  useEffect(() => {
    // If textRef has a scrollHeight greater than clientHeight, it's overflowing
    if (textRef.current && !isTextExpanded) {
      const { scrollHeight, clientHeight } = textRef.current;
      if (scrollHeight > clientHeight + 20) { // +20px buffer
        setIsTextExpanded(false);
      }
    }
  }, [message.message, isTextExpanded]);


  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    setShowContextMenu(false);
    setShowThreeDotMenu(false);
    setShowQuickReactions(false);
  };

  const handleEdit = () => {
    setShowEditModal(true);
    setEditedText(message.message || "");
    setShowContextMenu(false);
    setShowThreeDotMenu(false);
  };

  const handleSaveEdit = () => {
    if (onEdit && editedText.trim() !== message.message) {
      onEdit(message.id, editedText.trim());
    }
    setShowEditModal(false);
  };

  const handleShowReadTime = () => {
    const hasGroupSeenInfo = isGroupChat && Array.isArray(message.seenBy) && message.seenBy.length > 0;

    if (hasGroupSeenInfo) {
      setShowSeenByModal(true);
      setShowThreeDotMenu(false);
      return;
    }

    const primarySeenAt =
      message.seen_at ||
      (Array.isArray(message.seenBy) && message.seenBy.length > 0 ? message.seenBy[0]?.seen_at : undefined);

    const formatted = primarySeenAt
      ? formatSeenFull(primarySeenAt) || formatExactTime(primarySeenAt) || 'recently'
      : 'recently';

    setShowThreeDotMenu(false);
    if (typeof window !== 'undefined') {
      window.alert(`Seen ${formatted}`);
    }
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.message);
    } else {
      navigator.clipboard.writeText(message.message || "").then(() => {
        console.log('Message copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy message:', err);
      });
    }
    setShowContextMenu(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowContextMenu(false);
    setShowDeleteConfirm(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
    // Close any other menus
    setShowQuickReactions(false);
    setShowThreeDotMenu(false);
  };


  // Long press hook
  const { onTouchStart, onTouchEnd, onTouchMove, isLongPressing: isLongPressingState } = useLongPress(() => {
    setShowQuickReactions(true);
    setShowContextMenu(false);
    setShowThreeDotMenu(false);
  }, 500);

  // Double tap hook
  const handleDoubleTap = useDoubleTap(() => {
    if (onReact) {
      onReact(message.id, '👍');
    }
  }, 300);

  const handleClickOutside = (e: MouseEvent) => {
    if (
      (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) &&
      (quickReactionsRef.current && !quickReactionsRef.current.contains(e.target as Node))
    ) {
      setShowContextMenu(false);
      setShowQuickReactions(false);
    }
  };

  useEffect(() => {
    if (showContextMenu || showQuickReactions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu, showQuickReactions]);

  const handleMenuClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setShowThreeDotMenu(false);
    }
  };

  useEffect(() => {
    if (showThreeDotMenu) {
      document.addEventListener('mousedown', handleMenuClickOutside);
      return () => document.removeEventListener('mousedown', handleMenuClickOutside);
    }
  }, [showThreeDotMenu]);


  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return (
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13.5L8.5 17l10.5-10.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'delivered':
        return (
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 13.5l3.5 3.5L15 9.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 13.5l3.5 3.5L21 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'read':
        return (
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 13.5l3.5 3.5L15 9.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 13.5l3.5 3.5L21 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      default:
        return null;
    }
  };


  const getFileIcon = (fileType: string, filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();

    if (fileType === 'image') {
      return (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
      case 'xls':
      case 'xlsx':
        return (
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
      case 'ppt':
      case 'pptx':
        return (
          <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
      case 'txt':
        return (
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        );
    }
  };

  const renderRepliedMessage = () => {
    if (!message.reply_to) return null;

    const { sender_name, message_text, message_id } = message.reply_to;

    return (
      <div
        className={`mb-2 pl-3 border-l-4 ${isSelf ? 'border-white/40 bg-white/10' : 'border-[var(--accent)]/60 bg-[var(--accent)]/5'} py-1.5 pr-2 rounded-r-md ${onReplyPreviewClick && message_id ? 'hover:bg-opacity-20 cursor-pointer transition-colors' : ''}`}
        onClick={() => {
          if (onReplyPreviewClick && message_id) {
            onReplyPreviewClick(message_id);
          }
        }}
      >
        {sender_name ? (
          <div className={`text-xs font-semibold mb-0.5 ${isSelf ? 'text-white/90' : 'text-[var(--accent)]'}`}>{sender_name}</div>
        ) : null}
        <div className={`text-xs truncate flex items-center justify-between ${isSelf ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
          <span className="truncate flex-1">{message_text || 'Media'}</span>
          {onReplyPreviewClick && message_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReplyPreviewClick(message_id);
              }}
              className={`ml-2 p-1 rounded hover:opacity-80 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${isSelf ? 'focus:ring-white/50' : 'focus:ring-[var(--accent)]/50'}`}
              title="Jump to message"
            >
              <svg className={`w-3.5 h-3.5 ${isSelf ? 'text-white/90' : 'text-[var(--accent)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderReactionsSummary = () => {
    if (!message.reactions || message.reactions.length === 0) return null;
    
    return (
      <div className="mt-1 -mb-1 flex flex-wrap gap-1">
        {message.reactions.map((r) => (
          <button 
            key={r.emoji}
            onClick={() => onReact && onReact(message.id, r.emoji)} 
            className={`text-xs inline-flex items-center px-1.5 py-0.5 rounded-full 
              ${r.users.includes(currentUserId || '') 
                ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]' 
                : 'bg-gray-100 border-gray-200 text-gray-700'} 
              border hover:bg-[var(--accent)]/20 transition-colors`}
          >
            <span>{r.emoji}</span>
            <span className="ml-0.5 text-[10px]">{r.users.length}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderAttachment = () => {
    if (!message.attachment) return null;

    const { file_type, filename, file_url, size } = message.attachment;

    if (file_type === 'image') {
      return (
        <div className="mt-2">
          <div className="relative group">
            <div 
              className="relative bg-[var(--secondary-hover)] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-[var(--border)]"
              onClick={() => window.open(getFileUrl(file_url), '_blank')}
            >
              <Image
                src={getFileUrl(file_url)}
                alt={filename}
                width={420}
                height={420}
                className="w-full max-w-[360px] md:max-w-[420px] max-h-[420px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                unoptimized
                onError={() => {
                  console.error('Image load error:', filename, getFileUrl(file_url));
                }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              
              {/* Download button overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const fileUrl = getFileUrl(file_url);
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = filename;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors"
                  title="Download image"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Document file
      const handleDownload = async () => {
        try {
          const fileUrl = getFileUrl(file_url);
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
          console.error('Download failed:', error);
          // Fallback to opening in new tab
          window.open(getFileUrl(file_url), '_blank');
        }
      };

      return (
        <div className={`mt-2 p-3 ${isSelf ? 'bg-white/10' : 'bg-[var(--secondary-hover)]'} rounded-xl border ${isSelf ? 'border-white/20' : 'border-[var(--border)]'} hover:shadow-md transition-all duration-200`}>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getFileIcon(file_type, filename)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${isSelf ? 'text-white/70' : 'text-[var(--text-secondary)]'}`}>{formatFileSize(size)}</p>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => window.open(getFileUrl(file_url), '_blank')}
                className={`p-2 rounded-lg ${isSelf ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)]'} transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1`}
                title="Open"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button
                onClick={handleDownload}
                className={`p-2 rounded-lg ${isSelf ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)]'} transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1`}
                title="Download"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderSeenByInfo = () => {
    if (!isGroupChat || !isSelf || !message.seenBy) return null;

    // Handle both array and non-array cases
    // Backend might send seenBy as a string (user_id) or as an array of objects
    let seenByArray: Array<{ user_id?: string; username?: string; seen_at?: string }> = [];
    
    if (Array.isArray(message.seenBy)) {
      seenByArray = message.seenBy;
    } else if (typeof message.seenBy === 'string') {
      // If it's a string (user_id), we can't display it without user lookup
      // For now, just return null or show a simple "Seen" indicator
      return null;
    }

    if (seenByArray.length === 0) return null;

    const seenCount = seenByArray.length;
    
    // Enrich seenBy array with usernames from users list if missing
    const enrichedSeenBy = seenByArray.map(seenUser => {
      if (seenUser.username && seenUser.username.trim() && seenUser.username !== 'User') {
        return seenUser;
      }
      // Try to find user in users list
      if (seenUser.user_id && users.length > 0) {
        const user = users.find((u: { _id: string; username?: string; first_name?: string; email?: string }) => u._id === seenUser.user_id);
        if (user) {
          const displayName = user.username || user.first_name || user.email || 'User';
          return { ...seenUser, username: displayName };
        }
      }
      return seenUser;
    });
    
    // Get valid usernames
    const validUsers = enrichedSeenBy.filter(u => u.username && u.username.trim() && u.username !== 'User');
    
    // If we have valid usernames, use them; otherwise show count
    let seenNames = '';
    if (validUsers.length > 0) {
      seenNames = validUsers
        .slice(0, 2)
        .map(u => u.username)
        .join(', ');
    } else {
      // Fallback: show count if no valid usernames
      seenNames = `${seenCount} ${seenCount === 1 ? 'person' : 'people'}`;
    }

    return (
      <button
        onClick={() => setShowSeenByModal(true)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] hover:underline mt-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1 rounded px-1 transition-colors"
      >
        {seenCount > 0 && (
          <>
            Seen by {seenNames}
            {validUsers.length > 2 && ` and ${seenCount - 2} other${seenCount - 2 > 1 ? 's' : ''}`}
          </>
        )}
      </button>
    );
  };

  const isImageMessage = message.attachment && message.attachment.file_type === 'image';
  
  // Utility function to detect and render URLs
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Handle long text display with "show more/less" toggle
  const renderMessageText = () => {
    if (!message.message) return null;
    
    if (isLongText && !isTextExpanded) {
      return (
        <div>
          <div 
            ref={textRef}
            className="text-sm leading-relaxed font-medium max-h-32 overflow-hidden break-words"
          >
            {renderTextWithLinks(message.message.slice(0, TEXT_PREVIEW_LIMIT))}
            {message.message.length > TEXT_PREVIEW_LIMIT && '...'}
          </div>
          <button 
            onClick={() => setIsTextExpanded(true)}
            className="text-xs font-medium text-[var(--accent)] hover:underline mt-1"
          >
            Show more
          </button>
        </div>
      );
    } else if (isLongText && isTextExpanded) {
      return (
        <div>
          <button 
            onClick={() => setIsTextExpanded(false)}
            className="text-xs font-medium text-[var(--accent)] hover:underline mt-1"
          >
            Show less
          </button>
        </div>
      );
    } else {
      return (
        <div className="text-sm leading-relaxed font-medium break-words">
          {renderTextWithLinks(message.message)}
        </div>
      );
    }
  };

  return (
    <>
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-1.5 sm:mb-2 relative`}>
        <div className={`${isSelf ? 'items-end' : 'items-start'} flex flex-col max-w-[76%]`}>
          {/* Sender name for group chats */}
          {isGroupChat && !isSelf && senderName && (
            <div className="mb-1 ml-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {senderName}
              </span>
            </div>
          )}
          
          <div
            ref={messageRef}
            className={`${isImageMessage ? 'max-w-sm lg:max-w-lg p-1.5' : 'max-w-xs lg:max-w-md px-2.5 py-1.5'} rounded-2xl ${isSelf
                ? 'bg-[var(--message-sent)] text-[var(--message-text-sent)] shadow-md'
                : 'bg-[var(--message-received)] text-[var(--message-text-received)] border border-[var(--border)] shadow-sm'
              } ${isTemp ? 'opacity-70' : ''} relative group ${isLongPressingState ? 'scale-105' : ''} transition-all duration-200`}
            style={{
              borderRadius: isSelf
                ? '20px 20px 6px 20px'
                : '20px 20px 20px 6px'
            }}
            onContextMenu={handleContextMenu}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchMove}
            onClick={handleDoubleTap}
          >
            {/* Three-dot menu button - Enhanced for mobile visibility */}
            <div className={`absolute ${isSelf ? 'top-1 right-1' : 'top-1 right-1 md:right-2'} 
  ${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'} 
  transition-opacity duration-200`}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setShowThreeDotMenu(!showThreeDotMenu);
      setShowQuickReactions(false);
    }}
    className="p-1.5 bg-opacity-90 rounded-full bg-white/30 backdrop-blur-sm shadow-sm hover:bg-white/50 transition-all"
    title="More options"
    aria-label="Message options"
  >
    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  </button>
  
  {/* Three-dot menu dropdown - With improved positioning for received messages */}
  {showThreeDotMenu && (
    <div
      ref={menuRef}
      className={`absolute ${isSelf ? 'right-0' : '-right-20 md:-right-24 lg:-right-28'} bottom-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-40 z-50`}
    >
      
      {onReply && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReply();
          }}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Reply</span>
        </button>
      )}
      {isSelf && onEdit && !message.attachment && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEdit();
          }}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Edit</span>
        </button>
      )}
      {message.message && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
            setShowThreeDotMenu(false);
          }}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </button>
      )}
      {isSelf && message.status === 'read' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShowReadTime();
          }}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>View read time</span>
        </button>
      )}
      {isSelf && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
            setShowThreeDotMenu(false);
          }}
          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete</span>
        </button>
      )}
    </div>
  )}
</div>
            
            {/* Replied message preview */}
            {renderRepliedMessage()}

            {/* Message text with show more/less functionality */}
            {renderMessageText()}

            {/* File attachment */}
            {renderAttachment()}

            {/* Reactions summary */}
            {renderReactionsSummary()}

            <div className={`text-xs mt-1.5 flex items-center justify-between ${isSelf ? 'text-[var(--message-text-sent)]/90' : 'text-[var(--text-muted)]'}`}>
              <div className="flex items-center space-x-1.5">
                {message.edited && (
                  <span className="text-[10px] italic opacity-80 font-medium">edited</span>
                )}
              </div>
              <span className="flex items-center space-x-1.5 text-[11px] font-medium">
                <span className={`${isSelf ? 'text-[var(--message-text-sent)]/90' : 'text-[var(--text-muted)]'} whitespace-nowrap`} title={(() => {
                  let d = new Date(message.timestamp);
                  if (isNaN(d.getTime())) d = new Date(message.timestamp + 'Z');
                  return isNaN(d.getTime()) ? undefined : d.toLocaleString();
                })() as string | undefined}>{(() => {
                  let timestamp = new Date(message.timestamp);
                  if (isNaN(timestamp.getTime())) {
                    timestamp = new Date(message.timestamp + 'Z');
                  }
                  if (isNaN(timestamp.getTime())) {
                    return "Invalid time";
                  }
                  return timestamp.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                })()}</span>
                {isSelf && !isTemp && getStatusIcon(message.status)}
                {isTemp && (
                  <div className="flex space-x-1 ml-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </span>
            </div>
            
            {/* Seen by info for group chats */}
            {renderSeenByInfo()}
          </div>
        </div>
      </div>

      {/* Edit Message Modal */}
      <EditMessageModal
        isOpen={showEditModal}
        editedText={editedText}
        onTextChange={setEditedText}
        onSave={handleSaveEdit}
        onCancel={() => {
          setShowEditModal(false);
          setEditedText(message.message || "");
        }}
        canSave={!!editedText.trim() && editedText.trim() !== message.message}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMessageModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Seen By Modal */}
      {Array.isArray(message.seenBy) && message.seenBy.length > 0 && (
        <SeenByModal
          isOpen={showSeenByModal}
          seenBy={message.seenBy}
          onClose={() => setShowSeenByModal(false)}
        />
      )}

      {/* Download Prompt Modal */}
      {showDownloadPrompt && message.attachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--primary)] rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Download File</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                File Name
              </label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] text-[var(--text-primary)]"
                placeholder="Enter filename"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDownloadPrompt(false);
                  setCustomFileName('');
                }}
                className="flex-1 px-4 py-2 text-[var(--text-primary)] bg-[var(--secondary-hover)] rounded-lg hover:bg-[var(--border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!message.attachment) return;
                    
                    const { file_url, filename } = message.attachment;
                    const url = getFileUrl(file_url);
                    console.log('Downloading file:', url);
                    
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const blob = await response.blob();
                    const contentType = response.headers.get('content-type') || 'application/octet-stream';
                    const typedBlob = new Blob([blob], { type: contentType });
                    const sanitizedFilename = (customFileName || filename).replace(/[<>:"/\\|?*]/g, '_');
                    
                    const downloadUrl = window.URL.createObjectURL(typedBlob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = sanitizedFilename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => {
                      window.URL.revokeObjectURL(downloadUrl);
                    }, 100);
                    
                    setShowDownloadPrompt(false);
                    setCustomFileName('');
                  } catch (error) {
                    console.error('Download failed:', error);
                    alert('Failed to download file. Please try again.');
                  }
                }}
                className="flex-1 px-4 py-2 text-[var(--text-inverse)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}