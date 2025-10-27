"use client";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getFileUrl } from '../utils/api';

interface FileAttachment {
  file_id: string;
  filename: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  size: number;
}

interface MessageBubbleProps {
  message: {
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
  isSelf: boolean;
  isTemp?: boolean;
  onDelete?: (messageId: string) => void;
  onCopy?: (messageText: string) => void;
  senderName?: string;
  isGroupChat?: boolean;
}

export default function MessageBubble({ message, isSelf, isTemp = false, onDelete, onCopy, senderName, isGroupChat = false }: MessageBubbleProps) {
  const router = useRouter();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSeenTime = (seenAt: string) => {
    try {
      const seenDate = new Date(seenAt);
      if (isNaN(seenDate.getTime())) return null;
      
      const now = new Date();
      const diffMs = now.getTime() - seenDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'Seen just now';
      if (diffMins < 60) return `Seen ${diffMins}m ago`;
      if (diffHours < 24) return `Seen ${diffHours}h ago`;
      if (diffDays < 7) return `Seen ${diffDays}d ago`;
      
      return `Seen ${seenDate.toLocaleDateString()}`;
    } catch (error) {
      return null;
    }
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.message);
    } else {
      navigator.clipboard.writeText(message.message).then(() => {
        // Show a brief success indicator
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
  };

  const handleLongPress = () => {
    setShowContextMenu(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsLongPressing(true);
    
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
      setIsLongPressing(false);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setShowContextMenu(false);
    }
  };

  React.useEffect(() => {
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu]);

  const handleMenuClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setShowThreeDotMenu(false);
    }
  };

  React.useEffect(() => {
    if (showThreeDotMenu) {
      document.addEventListener('mousedown', handleMenuClickOutside);
      return () => document.removeEventListener('mousedown', handleMenuClickOutside);
    }
  }, [showThreeDotMenu]);

  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'delivered':
        return (
          <div className="flex">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-3 h-3 -ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <svg className="w-3 h-3 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <svg className="w-3 h-3 -ml-1 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getFileIcon = (fileType: string, filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();

    // Image files
    if (fileType === 'image') {
      return (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    // Document files
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

  const renderAttachment = () => {
    if (!message.attachment) return null;

    const { file_type, filename, file_url, thumbnail_url, size } = message.attachment;

    // Debug logging
    console.log('File attachment data:', { file_type, filename, file_url, size });

    if (file_type === 'image') {
      return (
        <div className="mt-2">
          <div className="relative group">
            {/* Image container with hover effect */}
            <div className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
              <img
                src={getFileUrl(file_url)}
                alt={filename}
                onError={(e) => {
                  console.error('Image load error:', filename, getFileUrl(file_url));
                  // Fallback to original URL if getFileUrl fails
                  if (!(e.target as HTMLImageElement).src.includes('http')) {
                    (e.target as HTMLImageElement).src = file_url;
                  }
                }}
                className="w-full max-w-[320px] max-h-[400px] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onClick={() => {
                  // Create a modal for full image view
                  const modal = document.createElement('div');
                  modal.className = 'fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4';
                  modal.innerHTML = `
                    <div class="relative max-w-7xl max-h-full flex flex-col">
                      <div class="flex justify-between items-center mb-4">
                        <h3 class="text-white text-lg font-medium truncate max-w-md">${filename}</h3>
                        <div class="flex space-x-2">
                          <button
                            onclick="this.downloadImage('${getFileUrl(file_url)}', '${filename}')"
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-all"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </button>
                          <button
                            onclick="this.closeModal()"
                            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <img src="${getFileUrl(file_url)}" alt="${filename}" class="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
                    </div>
                  `;
                  
                  // Add download functionality
                  (modal as any).downloadImage = async (url: string, filename: string) => {
                    try {
                      console.log('Downloading image from modal:', url);
                      
                      const response = await fetch(url);
                      
                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }
                      
                      const blob = await response.blob();
                      
                      // Get content type from response
                      const contentType = response.headers.get('content-type') || 'image/jpeg';
                      const typedBlob = new Blob([blob], { type: contentType });

                      // Sanitize filename
                      const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
                      
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
                    } catch (error) {
                      console.error('Download failed:', error);
                      window.open(url, '_blank');
                    }
                  };
                  
                  (modal as any).closeModal = () => {
                    document.body.removeChild(modal);
                  };
                  
                  modal.onclick = (e) => {
                    if (e.target === modal) {
                      document.body.removeChild(modal);
                    }
                  };
                  
                  document.body.appendChild(modal);
                }}
              />
              
              {/* Hover overlay with expand icon */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all duration-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getFileIcon(file_type, filename)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
              <p className="text-xs text-gray-500 mt-1">{formatFileSize(size)}</p>
            </div>
          </div>
        </div>
      );
    }
  };

  const isImageMessage = message.attachment && message.attachment.file_type === 'image';

  return (
    <>
      <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-3 relative`}>
        <div className={`${isSelf ? 'items-end' : 'items-start'} flex flex-col max-w-[80%]`}>
          {/* Sender name for group chats */}
          {isGroupChat && !isSelf && senderName && (
            <div className="mb-2 ml-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {senderName}
              </span>
            </div>
          )}
          
          <div
            ref={messageRef}
            className={`${isImageMessage ? 'max-w-sm lg:max-w-lg' : 'max-w-xs lg:max-w-md'} px-4 py-3 rounded-lg ${isSelf
                ? 'bg-[var(--message-sent)] text-[var(--message-text-sent)]'
                : 'bg-[var(--message-received)] text-[var(--message-text-received)] border border-[var(--border)]'
              } ${isTemp ? 'opacity-70' : ''} ${isImageMessage ? 'p-2' : ''
              } relative group ${isLongPressing ? 'scale-105' : ''} transition-all duration-200 shadow-sm`}
            style={{
              borderRadius: isSelf
                ? '20px 20px 6px 20px'
                : '20px 20px 20px 6px'
            }}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
          {/* Three-dot menu button */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowThreeDotMenu(!showThreeDotMenu);
              }}
              className="p-1.5 bg-white bg-opacity-90 rounded-full shadow-sm hover:bg-opacity-100 transition-all"
              title="More options"
            >
              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {/* Three-dot menu dropdown */}
            {showThreeDotMenu && (
              <div
                ref={menuRef}
                className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-32 z-50"
              >
                {message.attachment && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDownloadPrompt(true);
                      setShowThreeDotMenu(false);
                      setCustomFileName(message.attachment?.filename || '');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download</span>
                  </button>
                )}
                {!message.attachment && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                      setShowThreeDotMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </button>
                )}
                {isSelf && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                      setShowThreeDotMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {message.message && (
            <div className="text-sm leading-relaxed font-medium">{message.message}</div>
          )}

          {renderAttachment()}

          <div className={`text-xs mt-2 flex items-center justify-end ${isSelf ? 'text-[var(--message-text-sent)]/70' : 'text-[var(--text-muted)]'
            }`}>
            <span className="flex items-center space-x-1">
              <span>{(() => {
                let timestamp = new Date(message.timestamp);
                if (isNaN(timestamp.getTime())) {
                  // Try parsing as UTC if failed
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
                <div className="flex space-x-1 ml-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </span>
            {/* Seen timestamp for read messages */}
            {isSelf && message.status === 'read' && message.seen_at && (
              <div className="text-xs text-[var(--text-muted)] mt-1 text-right">
                {formatSeenTime(message.seen_at)}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Context Menu */}
        {showContextMenu && (
          <div
            ref={contextMenuRef}
            className="absolute z-50 bg-[var(--secondary)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-32"
            style={{
              top: messageRef.current?.getBoundingClientRect().top || 0,
              left: isSelf ? (messageRef.current?.getBoundingClientRect().left || 0) - 130 : (messageRef.current?.getBoundingClientRect().right || 0),
              // Ensure menu stays within viewport on mobile
              maxWidth: 'calc(100vw - 20px)',
              transform: 'translateX(-50%)'
            }}
          >
            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--secondary-hover)] flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
            {isSelf && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 text-left text-sm text-[var(--error)] hover:bg-[var(--error-light)] flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--secondary)] rounded-lg p-6 max-w-sm mx-4 shadow-lg">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Delete Message</h3>
              <p className="text-[var(--text-secondary)] mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-[var(--text-primary)] bg-[var(--secondary-hover)] rounded-lg hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-[var(--text-inverse)] bg-[var(--error)] rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download Prompt Modal */}
        {showDownloadPrompt && message.attachment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--secondary)] rounded-lg p-6 max-w-sm mx-4 shadow-lg">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Download File</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
                      const fileUrl = getFileUrl(file_url);
                      console.log('Downloading file:', fileUrl);
                      
                      const response = await fetch(fileUrl);
                      
                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }
                      
                      const blob = await response.blob();
                      const contentType = response.headers.get('content-type') || 'application/octet-stream';
                      const typedBlob = new Blob([blob], { type: contentType });
                      const sanitizedFilename = (customFileName || filename).replace(/[<>:"/\\|?*]/g, '_');
                      
                      const url = window.URL.createObjectURL(typedBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = sanitizedFilename;
                      link.style.display = 'none';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      setTimeout(() => {
                        window.URL.revokeObjectURL(url);
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
      </div>
    </>
  );
}
