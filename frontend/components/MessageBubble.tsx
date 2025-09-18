"use client";
import React from 'react';

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
  };
  isSelf: boolean;
  isTemp?: boolean;
}

export default function MessageBubble({ message, isSelf, isTemp = false }: MessageBubbleProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <img
              src={file_url}
              alt={filename}
              className="max-w-sm max-h-80 rounded-lg cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm object-cover w-full"
              onClick={() => {
                // Create a modal or lightbox for full image view
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                modal.innerHTML = `
                  <div class="relative max-w-4xl max-h-full p-4">
                    <img src="${file_url}" alt="${filename}" class="max-w-full max-h-full rounded-lg" />
                    <button class="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                `;
                modal.onclick = (e) => {
                  if (e.target === modal || (e.target as HTMLElement)?.tagName === 'BUTTON') {
                    document.body.removeChild(modal);
                  }
                };
                document.body.appendChild(modal);
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">{filename}</p>
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
            <div className="flex-shrink-0">
              <button
                onClick={async () => {
                  try {
                    // Fetch the file
                    const response = await fetch(file_url);
                    const blob = await response.blob();
                    
                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Download failed:', error);
                    // Fallback to opening in new tab
                    window.open(file_url, '_blank');
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  const isImageMessage = message.attachment && message.attachment.file_type === 'image';
  
  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-1`}>
      <div 
        className={`${isImageMessage ? 'max-w-sm lg:max-w-lg' : 'max-w-xs lg:max-w-md'} px-3 py-2 rounded-lg ${
          isSelf 
            ? 'bg-green-500 text-white' 
            : 'bg-white shadow-sm'
        } ${isTemp ? 'opacity-70' : ''} ${
          isImageMessage ? 'p-1' : ''
        }`}
        style={{
          borderRadius: isSelf 
            ? '18px 18px 4px 18px' 
            : '18px 18px 18px 4px'
        }}
      >
        {message.message && (
          <div className="text-sm">{message.message}</div>
        )}
        
        {renderAttachment()}
        
        <div className={`text-xs mt-1 flex items-center justify-end ${
          isSelf ? 'text-green-100' : 'text-gray-500'
        }`}>
          <span className="flex items-center space-x-1">
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isSelf && (
              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {isTemp && (
              <div className="flex space-x-1 ml-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
