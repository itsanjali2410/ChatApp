"use client";
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import ThemeToggle from "./ThemeToggle";

type User = {
  _id: string;
  username?: string;
  email: string;
  role?: string;
  organization_id?: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
};

type Organization = {
  _id: string;
  org_name: string;
  description?: string;
  address?: string;
  website?: string;
  admin_id: string;
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export default function SettingsModal({ isOpen, onClose, currentUser }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'admin'>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: ''
  });
  
  // Admin form states
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", password: "" });
  const [inviteToken, setInviteToken] = useState<string>("");

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user profile
      try {
        const userRes = await api.get("/users/profile/me");
        setUser(userRes.data);
        setProfileForm({
          username: userRes.data.username || '',
          first_name: userRes.data.first_name || '',
          last_name: userRes.data.last_name || '',
          email: userRes.data.email || ''
        });
      } catch (profileError) {
        // If user profile fails, try admin profile
        try {
          const adminRes = await api.get("/admin/profile");
          setUser(adminRes.data);
          setProfileForm({
            username: adminRes.data.username || '',
            first_name: adminRes.data.first_name || '',
            last_name: adminRes.data.last_name || '',
            email: adminRes.data.email || ''
          });
        } catch (adminError) {
          console.error("Failed to load both user and admin profiles:", profileError, adminError);
          setError("Failed to load user profile");
        }
      }

      // Load organization data
      const orgId = localStorage.getItem("org_id");
      if (orgId) {
        try {
          const orgRes = await api.get("/organization/");
          const orgs = orgRes.data;
          const userOrg = orgs.find((org: any) => org._id === orgId);
          if (userOrg) setOrganization(userOrg);
        } catch (e) {
          console.log("Could not load organization details");
        }
      }

      // Load users for admin
      if (isAdmin) {
        try {
          const usersRes = await api.get(`/users/admin/by_org?org_id=${orgId}`);
          setUsers(usersRes.data);
        } catch (e) {
          console.error("Failed to load users:", e);
        }
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Failed to load data";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const updates: any = {};
      if (profileForm.username) updates.username = profileForm.username;
      if (profileForm.first_name) updates.first_name = profileForm.first_name;
      if (profileForm.last_name) updates.last_name = profileForm.last_name;
      
      await api.put("/users/profile/me", updates);
      setSuccess("Profile updated successfully");
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    const orgId = localStorage.getItem("org_id");
    const res = await api.post(`/organization/invite?org_id=${orgId}`);
    setInviteToken(res.data.invite_token);
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/users/admin/create`, newUser);
      setNewUser({ username: "", email: "", password: "" });
      setSuccess("User created successfully");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setEditForm({ username: user.username || "", email: user.email, password: "" });
  };

  const updateUser = async () => {
    if (!editingUser) return;
    if (!editForm.username || !editForm.email) {
      setError("Username and email are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updates: any = { username: editForm.username };
      if (editForm.password) {
        updates.password = editForm.password;
      }
      await api.put(`/users/admin/${editingUser.email}`, updates);
      setEditingUser(null);
      setEditForm({ username: "", email: "", password: "" });
      setSuccess("User updated successfully");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (email: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/users/admin/${email}`);
      setSuccess("User deleted successfully");
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent-light)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--secondary-hover)]'
            }`}
          >
            Profile
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent-light)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--secondary-hover)]'
              }`}
            >
              Admin Panel
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg text-green-400">
              {success}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && !loading && (
            <div className="space-y-6">
              {/* User Profile */}
              <div className="bg-[var(--secondary-hover)] border border-[var(--border)] rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                    {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {user?.username || "User"}
                    </h3>
                    <p className="text-[var(--text-secondary)]">{user?.email}</p>
                    <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded ${
                      user?.role === "admin"
                        ? "bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm"
                        : "bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm"
                    }`}>
                      {user?.role === "admin" ? "Administrator" : "User"}
                    </span>
                  </div>
                </div>
                {user?.created_at && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Joined{" "}
                    {new Date(user.created_at).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </p>
                )}
              </div>

              {/* Profile Form */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Edit Profile</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Username</label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      value={profileForm.email}
                      disabled
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">First Name</label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Last Name</label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  onClick={updateProfile}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Update Profile
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="pt-6 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Appearance</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Switch between light and dark theme</p>
                  </div>
                  <ThemeToggle variant="button" size="md" />
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-6 border-t border-[var(--border)]">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}


          {/* Admin Tab */}
          {activeTab === 'admin' && isAdmin && !loading && (
            <div className="space-y-6">
              {/* Organization Invites */}
              <div className="bg-[var(--secondary-hover)] border border-[var(--border)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Organization Invites</h3>
                <p className="text-[var(--text-secondary)] mb-4">Generate invite links for new users to join your organization.</p>
                <button 
                  onClick={handleGenerateInvite} 
                  className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Generate Invite Link
                </button>
                {inviteToken && (
                  <div className="mt-4 p-4 bg-[var(--secondary)] border border-[var(--border)] rounded-lg">
                    <div className="text-sm font-medium text-[var(--text-primary)] mb-2">Invite Token:</div>
                    <code className="block text-xs text-[var(--text-secondary)] break-all mb-3">{inviteToken}</code>
                    <div className="text-sm font-medium text-[var(--text-primary)] mb-2">Share this signup link:</div>
                    <code className="block text-xs text-[var(--accent)] break-all">
                      {`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?org=${localStorage.getItem("org_id")}&token=${inviteToken}`}
                    </code>
                  </div>
                )}
              </div>

              {/* Add User */}
              <div className="bg-[var(--secondary-hover)] border border-[var(--border)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add New User</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Username</label>
                    <input 
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]" 
                      placeholder="Enter username" 
                      value={newUser.username} 
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
                    <input 
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]" 
                      placeholder="Enter email" 
                      value={newUser.email} 
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Password</label>
                    <input 
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]" 
                      placeholder="Enter password" 
                      type="password" 
                      value={newUser.password} 
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                    />
                  </div>
                  <button 
                    className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md" 
                    onClick={addUser}
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-[var(--secondary-hover)] border border-[var(--border)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Organization Users ({users.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">User</th>
                        <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Role</th>
                        <th className="text-right py-3 px-4 font-medium text-[var(--text-primary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} className="border-b border-[var(--border)]/20 hover:bg-[var(--secondary)]">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center text-[var(--text-inverse)] text-sm font-medium shadow-sm">
                                {(user.username || user.email).charAt(0).toUpperCase()}
                              </div>
                              <span className="ml-3 font-medium text-[var(--text-primary)]">
                                {user.username || user.first_name || user.email || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[var(--text-secondary)]">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.role === 'admin' 
                                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm' 
                                : 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                            }`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => editUser(user)}
                                className="text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteUser(user.email)}
                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Theme Toggle in Admin Tab */}
              <div className="pt-6 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Appearance</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Switch between light and dark theme</p>
                  </div>
                  <ThemeToggle variant="button" size="md" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit User</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Username</label>
                  <input
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
                  <input
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    disabled
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">New Password (optional)</label>
                  <input
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-[var(--border)]">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-[var(--text-secondary)] bg-[var(--secondary-hover)] border border-[var(--border)] rounded-lg hover:bg-[#3b82f6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateUser}
                  disabled={loading}
                  className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {loading ? "Updating..." : "Update User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
