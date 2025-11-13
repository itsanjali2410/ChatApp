// Edit Message Modal Component

import React from 'react';

interface EditMessageModalProps {
  isOpen: boolean;
  editedText: string;
  onTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  canSave: boolean;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  isOpen,
  editedText,
  onTextChange,
  onSave,
  onCancel,
  canSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--secondary)] rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Message</h3>
        <textarea
          value={editedText}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] text-[var(--text-primary)] min-h-24 resize-none"
          placeholder="Edit your message..."
          autoFocus
        />
        <div className="flex space-x-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-[var(--text-primary)] bg-[var(--secondary-hover)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex-1 px-4 py-2 text-[var(--text-inverse)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

