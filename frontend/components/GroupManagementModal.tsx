"use client";
import React, { useState } from "react";
import api from "../utils/api";

interface User {
  _id: string;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  last_seen?: string;
  profile_picture?: string;
}

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: any;
  users: User[];
  currentUserId: string;
  onGroupUpdated: () => void;
}

export default function GroupManagementModal({
  isOpen,
  onClose,
  chat,
  users,
  currentUserId,
  onGroupUpdated,
}: GroupManagementModalProps) {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get group members
  const groupMembers = users.filter(user => 
    chat.participants.includes(user._id)
  );

  // Get available users to add (not already in group)
  const availableUsers = users.filter(user => 
    !chat.participants.includes(user._id) && user._id !== currentUserId
  );

  // Check if current user is admin
  const isAdmin = chat.admins?.includes(currentUserId) || chat.created_by === currentUserId;

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      setError("Select at least one member to add");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/chats/${chat.id}/add-members`, {
        member_ids: selectedUsers,
      });

      setSuccess("Members added successfully");
      setSelectedUsers([]);
      setShowAddMembers(false);
      onGroupUpdated();
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Failed to add members";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the group?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/chats/${chat.id}/remove-members`, {
        member_ids: [userId],
      });

      setSuccess("Member removed successfully");
      onGroupUpdated();
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Failed to remove member";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email;
  };

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user.username || user.email).substring(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{chat.group_name}</h2>
            <p className="text-sm text-gray-500">{groupMembers.length} members</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
              {success}
            </div>
          )}

          {/* Group Description */}
          {chat.group_description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {chat.group_description}
              </p>
            </div>
          )}

          {/* Add Members Button */}
          {isAdmin && availableUsers.length > 0 && (
            <div>
              <button
                onClick={() => setShowAddMembers(!showAddMembers)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Members
              </button>
            </div>
          )}

          {/* Add Members Section */}
          {showAddMembers && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Select Members to Add</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                {availableUsers.map((user) => (
                  <div
                    key={user._id}
                    className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedUsers.includes(user._id)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => handleUserToggle(user._id)}
                  >
                    <div className="flex-shrink-0 mr-3">
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={getDisplayName(user)}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-xs">
                          {getInitials(user)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getDisplayName(user)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedUsers.includes(user._id) ? (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setShowAddMembers(false);
                    setSelectedUsers([]);
                  }}
                  className="flex-1 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={loading || selectedUsers.length === 0}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Adding..." : "Add Members"}
                </button>
              </div>
            </div>
          )}

          {/* Group Members */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Group Members</h3>
            <div className="space-y-2">
              {groupMembers.map((user) => {
                const isUserAdmin = chat.admins?.includes(user._id) || chat.created_by === user._id;
                const isCurrentUser = user._id === currentUserId;
                
                return (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        {user.profile_picture ? (
                          <img
                            src={user.profile_picture}
                            alt={getDisplayName(user)}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-sm">
                            {getInitials(user)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getDisplayName(user)}
                          {isCurrentUser && " (You)"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isUserAdmin && (
                        <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                          Admin
                        </span>
                      )}
                      {isAdmin && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(user._id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
