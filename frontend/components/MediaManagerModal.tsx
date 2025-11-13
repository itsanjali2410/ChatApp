// Media Manager Modal Component - Shows all media (images and documents) for a specific chat

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../utils/api';
import { getFileUrl } from '../utils/api';
import type { Message, Chat, User } from '../types/chat';
import { formatFileSize, formatTimestamp } from '../utils/formatUtils';
import { getDisplayName } from '../utils/userUtils';

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  users: User[];
  currentUserId: string;
}

interface MediaItem {
  message: Message;
  sender: User | null;
}

export const MediaManagerModal: React.FC<MediaManagerModalProps> = ({
  isOpen,
  onClose,
  chat,
  users,
  currentUserId,
}) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'images' | 'documents'>('all');

  useEffect(() => {
    if (isOpen && chat) {
      loadMedia();
    }
  }, [isOpen, chat]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/messages/chat/${chat.id}`);
      const messages: Message[] = response.data;

      // Filter messages with attachments
      const messagesWithAttachments = messages.filter(
        (msg) => msg.attachment && (msg.attachment.file_type === 'image' || msg.attachment.file_type === 'document')
      );

      const media: MediaItem[] = messagesWithAttachments.map((msg) => {
        const sender = users.find((u) => u._id === msg.sender_id) || null;
        return { message: msg, sender };
      });

      // Sort by timestamp (newest first)
      media.sort((a, b) => 
        new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime()
      );

      setMediaItems(media);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedia = mediaItems.filter((item) => {
    if (filter === 'images' && item.message.attachment?.file_type !== 'image') return false;
    if (filter === 'documents' && item.message.attachment?.file_type !== 'document') return false;
    return true;
  });

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      const url = getFileUrl(fileUrl);
      const response = await fetch(url);
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
      window.open(getFileUrl(fileUrl), '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--secondary)] rounded-xl p-6 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Media & Documents</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {chat.type === 'group' ? chat.group_name : getDisplayName(users.find(u => chat.participants.includes(u._id) && u._id !== currentUserId) || {} as User)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--secondary-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            All ({mediaItems.length})
          </button>
          <button
            onClick={() => setFilter('images')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'images'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--secondary-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            Images ({mediaItems.filter(m => m.message.attachment?.file_type === 'image').length})
          </button>
          <button
            onClick={() => setFilter('documents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'documents'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                : 'bg-[var(--secondary-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            Documents ({mediaItems.filter(m => m.message.attachment?.file_type === 'document').length})
          </button>
        </div>

        {/* Media Grid/List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <p className="text-sm">No media found</p>
            </div>
          ) : filter === 'images' ? (
            // Image Grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredMedia.map((item) => {
                const attachment = item.message.attachment!;
                return (
                  <div
                    key={item.message.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--border)] hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.open(getFileUrl(attachment.file_url), '_blank')}
                  >
                    <Image
                      src={getFileUrl(attachment.file_url)}
                      alt="Media"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(getFileUrl(attachment.file_url), '_blank');
                        }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                        title="Open"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(attachment.file_url, attachment.filename);
                        }}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                        title="Download"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Document List
            <div className="space-y-3">
              {filteredMedia.map((item) => {
                const attachment = item.message.attachment!;
                return (
                  <div
                    key={item.message.id}
                    className="bg-[var(--secondary-hover)] rounded-lg p-3 border border-[var(--border)] hover:shadow-md transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-16 h-16 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center border border-[var(--border)]">
                        <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--text-secondary)] mb-1">
                              {formatFileSize(attachment.size)} • {formatTimestamp(item.message.timestamp)}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              From: {item.sender ? getDisplayName(item.sender) : 'Unknown'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => window.open(getFileUrl(attachment.file_url), '_blank')}
                              className="p-2 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-colors"
                              title="Open"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDownload(attachment.file_url, attachment.filename)}
                              className="p-2 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] transition-colors"
                              title="Download"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



