// app/admin/page.tsx
"use client";
import { useEffect, useState } from "react";
import axios from "../../utils/api";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", password: "" });
  const [inviteToken, setInviteToken] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      console.log("Fetching users for org_id:", orgId);
      const res = await axios.get(`/users/admin/by_org?org_id=${orgId}`);
      console.log("Users response:", res.data);
      setUsers(res.data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users: " + (err?.response?.data?.detail || err.message));
    }
  };

  useEffect(() => {
    const localOrgId = localStorage.getItem("org_id") || "";
    console.log("Setting org_id:", localOrgId);
    setOrgId(localOrgId);
    if (localOrgId) {
      fetchUsers();
    }
  }, []);

  // Refetch users when orgId changes
  useEffect(() => {
    if (orgId) {
      fetchUsers();
    }
  }, [orgId]);

  const handleGenerateInvite = async () => {
    const res = await axios.post(`/organization/invite?org_id=${orgId}`);
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
      await axios.post(`/users/admin/create`, newUser);
      setNewUser({ username: "", email: "", password: "" });
      setSuccess("User created successfully");
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const editUser = (user: any) => {
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
      await axios.put(`/users/admin/${editingUser.email}`, updates);
      setEditingUser(null);
      setEditForm({ username: "", email: "", password: "" });
      setSuccess("User updated successfully");
      await fetchUsers();
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
      await axios.delete(`/users/admin/${email}`);
      setSuccess("User deleted successfully");
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0D0D0D] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#EAEAEA]">Organization Management</h1>
            <p className="text-[#C0C0C0] mt-1">Manage users and organization settings</p>
          </div>
          <button
            onClick={() => router.push("/chat")}
            className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] rounded-lg hover:from-[#FFD700] hover:to-[#FFA500] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Go to Chat
          </button>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Organization Invites */}
          <div className="bg-[#121212] border border-[#D4AF37] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#EAEAEA] mb-4">Organization Invites</h2>
            <p className="text-[#C0C0C0] mb-4">Generate invite links for new users to join your organization.</p>
            <button 
              onClick={handleGenerateInvite} 
              className="w-full px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] rounded-lg hover:from-[#FFD700] hover:to-[#FFA500] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Generate Invite Link
            </button>
            {inviteToken && (
              <div className="mt-4 p-4 bg-[#1A1A1A] border border-[#D4AF37] rounded-lg">
                <div className="text-sm font-medium text-[#EAEAEA] mb-2">Invite Token:</div>
                <code className="block text-xs text-[#C0C0C0] break-all mb-3">{inviteToken}</code>
                <div className="text-sm font-medium text-[#EAEAEA] mb-2">Share this signup link:</div>
                <code className="block text-xs text-[#D4AF37] break-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?org=${orgId}&token=${inviteToken}`}
                </code>
              </div>
            )}
          </div>

          {/* Add User */}
          <div className="bg-[#121212] border border-[#D4AF37] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#EAEAEA] mb-4">Add New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-1">Username</label>
                <input 
                  className="w-full px-3 py-2 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]" 
                  placeholder="Enter username" 
                  value={newUser.username} 
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-1">Email</label>
                <input 
                  className="w-full px-3 py-2 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]" 
                  placeholder="Enter email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-1">Password</label>
                <input 
                  className="w-full px-3 py-2 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]" 
                  placeholder="Enter password" 
                  type="password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                />
              </div>
              <button 
                className="w-full px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] rounded-lg hover:from-[#FFD700] hover:to-[#FFA500] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl" 
                onClick={addUser}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="mt-8 bg-[#121212] border border-[#D4AF37] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[#EAEAEA] mb-6">Organization Users ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#D4AF37]">
                  <th className="text-left py-3 px-4 font-medium text-[#EAEAEA]">User</th>
                  <th className="text-left py-3 px-4 font-medium text-[#EAEAEA]">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-[#EAEAEA]">Role</th>
                  {/* <th className="text-left py-3 px-4 font-medium text-[#EAEAEA]">Status</th> */}
                  <th className="text-right py-3 px-4 font-medium text-[#EAEAEA]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-[#D4AF37]/20 hover:bg-[#1A1A1A]">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-full flex items-center justify-center text-[#0D0D0D] text-sm font-medium shadow-sm">
                          {(user.username || user.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="ml-3 font-medium text-[#EAEAEA]">
                          {user.username || user.name || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#C0C0C0]">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] shadow-sm' 
                          : 'bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] shadow-sm'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    {/* <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_online 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td> */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => editUser(user)}
                          className="text-[#D4AF37] hover:text-[#FFD700] text-sm font-medium transition-colors"
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

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#121212] border border-[#D4AF37] rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-[#D4AF37]">
                <h3 className="text-lg font-semibold text-[#EAEAEA]">Edit User</h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-[#C0C0C0] hover:text-[#D4AF37]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#EAEAEA] mb-1">Username</label>
                  <input
                    className="w-full px-3 py-2 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#EAEAEA] mb-1">Email</label>
                  <input
                    className="w-full px-3 py-2 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    disabled
                  />
                  <p className="text-xs text-[#C0C0C0] mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#EAEAEA] mb-1">New Password (optional)</label>
                  <input
                    className="w-full px-3 py-2 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-[#D4AF37]">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-[#C0C0C0] bg-[#1A1A1A] border border-[#D4AF37] rounded-lg hover:bg-[#2A2A2A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateUser}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] rounded-lg hover:from-[#FFD700] hover:to-[#FFA500] disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
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
