"use client";
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import api from '../utils/api';

interface FileUploadProps {
  onFileUploaded: (fileData: any) => void;
  onAllFilesUploaded?: () => void;
  disabled?: boolean;
  autoOpen?: boolean;
}

export default function FileUpload({
  onFileUploaded,
  onAllFilesUploaded,
  disabled = false,
  autoOpen = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<Array<{ file: File; preview: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const pendingFilesRef = useRef<File[]>([]);
  const processingUploadsRef = useRef(false);
  const selectedFilesRef = useRef<File[]>([]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    if (!autoOpen || disabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 10);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoOpen, disabled]);

  const uploadSingleFile = async (file: File) => {
    setCurrentUploadingFile(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onFileUploaded(response.data);

      setSelectedFiles(prev => prev.filter(f => f !== file));
      setPreviews(prev => prev.filter(p => p.file !== file));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadError(null);
    } catch (error: any) {
      console.error('File upload failed:', error);
      const errorMessage = error?.response?.data?.detail || 'File upload failed. Please try again.';
      setUploadError(errorMessage);
    } finally {
      if (pendingFilesRef.current.length === 0) {
        setCurrentUploadingFile(null);
      }
    }
  };

  const processPendingUploads = async () => {
    if (processingUploadsRef.current || disabled) {
      return;
    }

    if (pendingFilesRef.current.length === 0) {
      return;
    }

    processingUploadsRef.current = true;
    setUploading(true);

    let processedAny = false;

    try {
      while (pendingFilesRef.current.length > 0) {
        const nextFile = pendingFilesRef.current.shift();
        if (!nextFile) {
          continue;
        }
        processedAny = true;
        await uploadSingleFile(nextFile);
      }
    } finally {
      processingUploadsRef.current = false;
      setUploading(false);
      if (pendingFilesRef.current.length === 0 && processedAny && selectedFilesRef.current.length === 0) {
        onAllFilesUploaded?.();
      }
    }
  };

  const handleFileSelectWithAutoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadError(null);
    setSelectedFiles(prev => [...prev, ...fileArray]);

    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, { file, preview: reader.result as string }]);
        };
        reader.readAsDataURL(file);
      });
    }

    pendingFilesRef.current = [...pendingFilesRef.current, ...fileArray];

    void processPendingUploads();
  };

  const handleCancel = () => {
    pendingFilesRef.current = [];
    setPreviews([]);
    setSelectedFiles([]);
    setCurrentUploadingFile(null);
    setUploadError(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(f => f !== fileToRemove));
    setPreviews(prev => prev.filter(p => p.file !== fileToRemove));
    pendingFilesRef.current = pendingFilesRef.current.filter(f => f !== fileToRemove);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) {
      void handleFileSelectWithAutoUpload(e.dataTransfer.files);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const nonImageFiles = selectedFiles.filter(file => !file.type.startsWith('image/'));
  const queuedCount = previews.length + nonImageFiles.length;
  const hasQueuedFiles = queuedCount > 0;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.rtf,.zip,.csv,.json,.xml"
        multiple
        onChange={(e) => {
          void handleFileSelectWithAutoUpload(e.target.files);
          e.target.value = '';
        }}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
        }}
      />

      {hasQueuedFiles && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-[var(--secondary-hover)] px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            <span>
              {uploading && currentUploadingFile
                ? `Sending ${currentUploadingFile}...`
                : `Ready to send ${queuedCount} file${queuedCount === 1 ? '' : 's'}`}
            </span>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
          {previews.map((item, index) => (
            <div key={`${item.file.name}-${index}`} className="relative flex-shrink-0">
              <Image
                src={item.preview}
                alt={item.file.name}
                width={96}
                height={96}
                className="h-16 w-16 rounded-md border border-[var(--border)] bg-[var(--secondary)] object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeFile(item.file)}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                title="Remove image"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                {(item.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          ))}
        </div>
      )}

      {nonImageFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {nonImageFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex min-w-[160px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 shadow-sm"
            >
              <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">{file.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file)}
                className="p-1 text-[var(--text-muted)] hover:text-red-500"
                title="Remove file"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-100/70 px-3 py-2 text-xs text-red-600">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.293 6.293l7.071-7.071a1 1 0 011.414 0l7.071 7.071a1 1 0 01.293.707V17a2 2 0 01-2 2H6a2 2 0 01-2-2V7a1 1 0 01.293-.707z" />
          </svg>
          <span className="truncate">{uploadError}</span>
        </div>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`flex items-center gap-3 rounded-lg border border-dashed px-3 py-3 sm:px-4 sm:py-4 transition-colors ${
          dragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
            : disabled
            ? 'border-[var(--border)] bg-[var(--secondary-hover)] cursor-not-allowed opacity-70'
            : 'border-[var(--border)] bg-[var(--secondary)] hover:border-[var(--accent)]/60 hover:bg-[var(--secondary-hover)] cursor-pointer'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4l4 4" />
          </svg>
        </div>
        <div className="flex flex-1 flex-col text-left">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {disabled ? 'File upload disabled' : 'Attach files'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {uploading && currentUploadingFile
              ? `Sending ${currentUploadingFile}`
              : 'Images, documents, archives'}
          </span>
        </div>
        {uploading && (
          <div className="ml-auto flex items-center gap-2 text-[var(--accent)]">
            <span className="text-xs font-medium">Sending</span>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-b-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
