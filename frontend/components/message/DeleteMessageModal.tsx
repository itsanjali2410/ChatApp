// Delete Message Modal Component

import React from 'react';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--secondary)] rounded-lg p-6 max-w-sm mx-4 shadow-lg">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Delete Message</h3>
        <p className="text-[var(--text-secondary)] mb-4">
          Are you sure you want to delete this message? This action cannot be undone.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-[var(--text-primary)] bg-[var(--secondary-hover)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-[var(--text-inverse)] bg-[var(--error)] rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

