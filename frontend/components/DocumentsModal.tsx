// Documents Modal Component - Shows all shared documents

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../utils/api';
import { getFileUrl } from '../utils/api';
import type { Message, Chat, User } from '../types/chat';
import { formatFileSize, formatTimestamp } from '../utils/formatUtils';
import { getDisplayName } from '../utils/userUtils';

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  chats: Chat[];
  users: User[];
}

interface DocumentItem {
  message: Message;
  chat: Chat;
  sender: User | null;
}

export const DocumentsModal: React.FC<DocumentsModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  chats,
  users,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'images' | 'documents'>('all');
  const [selectedChat, setSelectedChat] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, chats, currentUserId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const allDocuments: DocumentItem[] = [];

      // Fetch messages from all chats
      for (const chat of chats) {
        try {
          const response = await api.get(`/messages/chat/${chat.id}`);
          const messages: Message[] = response.data;

          // Filter messages with attachments
          const messagesWithAttachments = messages.filter(
            (msg) => msg.attachment && (msg.attachment.file_type === 'image' || msg.attachment.file_type === 'document')
          );

          for (const msg of messagesWithAttachments) {
            const sender = users.find((u) => u._id === msg.sender_id) || null;
            allDocuments.push({
              message: msg,
              chat,
              sender,
            });
          }
        } catch (error) {
          console.error(`Failed to load messages for chat ${chat.id}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      allDocuments.sort((a, b) => 
        new Date(b.message.timestamp).getTime() - new Date(a.message.timestamp).getTime()
      );

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (filter === 'images' && doc.message.attachment?.file_type !== 'image') return false;
    if (filter === 'documents' && doc.message.attachment?.file_type !== 'document') return false;
    if (selectedChat !== 'all' && doc.chat.id !== selectedChat) return false;
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
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Shared Documents</h3>
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
        <div className="flex gap-3 mb-4 flex-shrink-0">
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'bg-[var(--secondary-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('images')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'images'
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'bg-[var(--secondary-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setFilter('documents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'documents'
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                  : 'bg-[var(--secondary-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              Documents
            </button>
          </div>
          <select
            value={selectedChat}
            onChange={(e) => setSelectedChat(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--secondary-hover)] text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          >
            <option value="all">All Chats</option>
            {chats.map((chat) => (
              <option key={chat.id} value={chat.id}>
                {chat.type === 'group' ? chat.group_name : 'Direct Chat'}
              </option>
            ))}
          </select>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <p className="text-sm">No documents found</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const { message, chat, sender } = doc;
              const attachment = message.attachment!;
              const isImage = attachment.file_type === 'image';

              return (
                <div
                  key={message.id}
                  className="bg-[var(--secondary-hover)] rounded-lg p-3 border border-[var(--border)] hover:shadow-md transition-all"
                >
                  <div className="flex items-start space-x-3">
                    {isImage ? (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)]">
                        <Image
                          src={getFileUrl(attachment.file_url)}
                          alt={attachment.filename}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-20 h-20 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center border border-[var(--border)]">
                        <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {attachment.filename}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                            <span>{formatFileSize(attachment.size)}</span>
                            <span>•</span>
                            <span>{formatTimestamp(message.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                            <span>
                              From: {sender ? getDisplayName(sender) : 'Unknown'}
                            </span>
                            <span>•</span>
                            <span>
                              {chat.type === 'group' ? chat.group_name : 'Direct Chat'}
                            </span>
                          </div>
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
            })
          )}
        </div>
      </div>
    </div>
  );
};

