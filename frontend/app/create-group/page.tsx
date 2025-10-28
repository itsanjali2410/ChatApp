"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import api, { getFileUrl } from "../../utils/api";

type User = {
  _id: string;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
};

export default function CreateGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get("/users/by_org");
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to load users:", err);
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

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedUsers.length < 1) {
      setError("Select at least one member for the group");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/chats/create-group", {
        group_name: groupName.trim(),
        group_description: groupDescription.trim(),
        participant_ids: selectedUsers,
      });

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedUsers([]);
      
      // Navigate back to chat
      router.push('/chat');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Failed to create group";
      setError(detail);
    } finally {
      setLoading(false);
    }
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

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    const name = getDisplayName(user).toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/chat')}
            className="mr-4 text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Group</h1>
        </div>

        <div className="bg-[var(--secondary)] rounded-lg border border-[var(--border)] p-6 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Group Name *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--background)] text-[var(--text-primary)]"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--background)] text-[var(--text-primary)] resize-none"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
              />
            </div>

            {/* Member Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Add Members *
              </label>
              
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--background)] text-[var(--text-primary)]"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Selected Count */}
              {selectedUsers.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* User List */}
              <div className="max-h-96 overflow-y-auto border border-[var(--border)] rounded-lg bg-[var(--background)]">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-[var(--text-secondary)]">
                    No users found
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUsers.includes(user._id);
                    return (
                      <div
                        key={user._id}
                        onClick={() => handleUserToggle(user._id)}
                        className={`flex items-center p-3 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--secondary-hover)] transition-colors ${
                          isSelected ? 'bg-[var(--accent-light)]' : ''
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          {user.profile_picture ? (
                            <img
                              src={getFileUrl(user.profile_picture)}
                              alt={getDisplayName(user)}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-semibold">
                              {getInitials(user)}
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {getDisplayName(user)}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {isSelected && (
                            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/chat')}
                className="flex-1 px-4 py-3 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--secondary-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={loading || !groupName.trim() || selectedUsers.length === 0}
                className="flex-1 px-4 py-3 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--text-inverse)] mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Group"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

