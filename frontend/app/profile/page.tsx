"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileManager from '../../components/ProfileManager';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[var(--secondary)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--secondary-hover)] rounded-lg transition-colors"
                title="Go Back"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile Settings</h1>
            </div>
            <button
              onClick={() => router.push('/chat')}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Go to Chat
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ProfileManager />
      </div>
    </div>
  );
}
