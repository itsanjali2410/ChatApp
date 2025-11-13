// Seen By Modal Component

import React from 'react';
import type { SeenByUser } from '../../types/chat';
import { formatSeenTime } from '../../utils/formatUtils';

interface SeenByModalProps {
  isOpen: boolean;
  seenBy: SeenByUser[];
  onClose: () => void;
}

export const SeenByModal: React.FC<SeenByModalProps> = ({
  isOpen,
  seenBy,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--secondary)] rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Seen By</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {seenBy.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-center py-4">No one has seen this message yet</p>
          ) : (
            seenBy.map((user) => {
              const username = user.username || 'User';
              const initial = username.charAt(0).toUpperCase();
              return (
                <div key={user.user_id} className="flex items-center justify-between p-3 bg-[var(--secondary-hover)] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-semibold">
                      {initial}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{username}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {user.seen_at ? formatSeenTime(user.seen_at) : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

