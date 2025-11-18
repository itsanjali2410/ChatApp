"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import api, { getFileUrl } from "../../utils/api";
import ThemeToggle from "../../components/ThemeToggle";

type User = {
  _id: string;
  username?: string;
  email: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  created_at?: string;
  bio?: string;
  phone?: string;
  department?: string;
  position?: string;
};

type ProfileFormState = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  phone: string;
  department: string;
  position: string;
};

type ProfileUpdatePayload = Partial<Pick<ProfileFormState, 'username' | 'first_name' | 'last_name' | 'bio' | 'phone' | 'department' | 'position'>>;

type AdminUserUpdatePayload = {
  username: string;
  email: string;
  password?: string;
};

type ApiErrorResponse = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as ApiErrorResponse;
    const detail = maybeError.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
  }
  return fallback;
};

export default function SettingsPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<'main' | 'profile' | 'admin'>('main');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [inviteToken, setInviteToken] = useState<string>("");
  
  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    phone: '',
    department: '',
    position: ''
  });
  
  // Profile picture upload state
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [removingProfilePicture, setRemovingProfilePicture] = useState(false);
  
  // Admin form states
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", password: "" });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const notificationsBlocked = notificationPermission === 'denied';
  const notificationsGranted = notificationPermission === 'granted';

  useEffect(() => {
    if (!profilePicture) {
      setProfilePicturePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(profilePicture);
    setProfilePicturePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profilePicture]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    let fetchedUser: User | null = null;

    try {
      try {
        const userRes = await api.get("/users/profile/me");
        fetchedUser = userRes.data;
      } catch (profileError) {
        try {
          const adminRes = await api.get("/admin/profile");
          fetchedUser = adminRes.data;
        } catch (adminError) {
          console.error("Failed to load profiles:", profileError, adminError);
          setError("Failed to load user profile");
          return;
        }
      }

      if (fetchedUser) {
        setUser(fetchedUser);
        setProfileForm({
          username: fetchedUser.username || '',
          first_name: fetchedUser.first_name || '',
          last_name: fetchedUser.last_name || '',
          email: fetchedUser.email || '',
          bio: fetchedUser.bio || '',
          phone: fetchedUser.phone || '',
          department: fetchedUser.department || '',
          position: fetchedUser.position || ''
        });
        setProfilePicture(null);
      }

      if (fetchedUser?.role === 'admin') {
        const orgId = localStorage.getItem("org_id");
        if (orgId) {
          try {
            const usersRes = await api.get(`/users/admin/by_org?org_id=${orgId}`);
            setOrgUsers(usersRes.data);
          } catch (orgError) {
            console.error("Failed to load users:", orgError);
          }
        }
      }
    } catch (error) {
      const detail = getApiErrorMessage(error, "Failed to load data");
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [loadData]);

  const handleProfilePictureUpload = async () => {
    if (!profilePicture) return;
    
    setUploadingProfilePicture(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', profilePicture);
      
      await api.post('/files/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Profile picture updated successfully!');
      await loadData();
    } catch (error: unknown) {
      const detail = getApiErrorMessage(error, "Failed to upload profile picture");
      setError(detail);
    } finally {
      setUploadingProfilePicture(false);
      setProfilePicture(null);
    }
  };

  const handleRemoveProfilePicture = async () => {
    setRemovingProfilePicture(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete('/files/profile-picture');
      setProfilePicture(null);
      setProfilePicturePreview(null);
      setSuccess('Profile picture removed successfully!');
      await loadData();
    } catch (error: unknown) {
      const detail = getApiErrorMessage(error, "Failed to remove profile picture");
      setError(detail);
    } finally {
      setRemovingProfilePicture(false);
    }
  };
  
  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      setProfilePicture(file);
      setError(null);
    }
  };
  
  const updateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isAdmin = user?.role === 'admin';
      const endpoint = isAdmin ? '/admin/profile' : '/users/profile/me';
      
      const updates: ProfileUpdatePayload = {};
      if (profileForm.first_name) updates.first_name = profileForm.first_name;
      if (profileForm.last_name) updates.last_name = profileForm.last_name;
      if (profileForm.bio) updates.bio = profileForm.bio;
      if (profileForm.phone) updates.phone = profileForm.phone;
      if (profileForm.department) updates.department = profileForm.department;
      if (profileForm.position) updates.position = profileForm.position;
      
      if (isAdmin && profileForm.username) {
        updates.username = profileForm.username;
      }
      
      if (Object.keys(updates).length === 0) {
        setError("No changes to update");
        return;
      }
      
      await api.put(endpoint, updates);
      setSuccess("Profile updated successfully");
      await loadData();
    } catch (error: unknown) {
      const errorMsg = getApiErrorMessage(error, "Failed to update profile");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;
    
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleGenerateInvite = async () => {
    const orgId = localStorage.getItem("org_id");
    try {
      const res = await api.post(`/organization/invite?org_id=${orgId}`);
      setInviteToken(res.data.invite_token);
    } catch (err) {
      console.error("Failed to generate invite:", err);
    }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post("/users/admin/create", newUser);
      setSuccess("User created successfully");
      setNewUser({ username: "", email: "", password: "" });
      await loadData();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to create user"));
    } finally {
      setLoading(false);
    }
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setEditForm({ username: user.username || "", email: user.email, password: "" });
  };

  const updateUser = async () => {
    if (!editingUser || !editForm.username || !editForm.email) {
      setError("Username and email are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updateData: AdminUserUpdatePayload = { username: editForm.username, email: editForm.email };
      if (editForm.password) updateData.password = editForm.password;
      
      await api.put(`/users/admin/${editingUser.email}`, updateData);
      setSuccess("User updated successfully");
      setEditingUser(null);
      setEditForm({ username: "", email: "", password: "" });
      await loadData();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to update user"));
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
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to delete user"));
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return (user.username || user.email).substring(0, 2).toUpperCase();
  };

  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email;
  };

  const isAdmin = user?.role === 'admin';

  // Main Settings List View
  if (currentSection === 'main') {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <div className="bg-[var(--secondary)] border-b border-[var(--border)] px-4 py-3 flex items-center">
          <button
            onClick={() => router.push('/chat')}
            className="mr-3 text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Settings</h1>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-[var(--border)]">
          {/* Profile Section */}
          <div onClick={() => setCurrentSection('profile')} className="px-4 py-4 bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] cursor-pointer transition-colors flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full flex items-center justify-center font-semibold">
                {user?.first_name?.[0] || user?.username?.[0] || user?.email?.[0] || 'U'}
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">Profile</p>
                {/* <p className="text-sm text-[var(--text-secondary)]">Personal information and settings</p> */}
              </div>
            </div>
           
          </div>

          {/* Admin Panel Section (Only for Admins) */}
          {isAdmin && (
            <div onClick={() => setCurrentSection('admin')} className="px-4 py-4 bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] cursor-pointer transition-colors flex items-center justify-between">
              <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full flex items-center justify-center font-semibold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Admin Panel</p>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    );
  }

  // Profile Settings Section
  if (currentSection === 'profile') {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <div className="bg-[var(--secondary)] border-b border-[var(--border)] px-4 py-3 flex items-center">
          <button
            onClick={() => setCurrentSection('main')}
            className="mr-3 text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Profile</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-900/20 border border-green-500 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            {/* Profile Picture */}
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {user?.profile_picture ? (
                    <Image
                      src={getFileUrl(user.profile_picture)}
                      alt="Profile"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[var(--accent)]"
                      unoptimized
                    />
                  ) : (
                    <div className="w-16 h-16 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full flex items-center justify-center text-xl font-bold">
                    {user ? getInitials(user) : (profileForm.email || 'NA').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  
                  <label className="absolute bottom-0 right-0 bg-[var(--accent)] text-[var(--text-inverse)] rounded-full p-2 cursor-pointer hover:bg-[var(--accent-hover)] transition-colors shadow-md">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureSelect}
                    />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text-primary)]">{user ? getDisplayName(user) : profileForm.email || 'User'}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{user?.email || profileForm.email}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  {user?.profile_picture ? 'Current photo is active across apps.' : 'No profile photo uploaded yet.'}
                </p>
                {user?.profile_picture && (
                  <button
                    onClick={handleRemoveProfilePicture}
                    disabled={removingProfilePicture}
                    className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                  >
                    {removingProfilePicture ? 'Removing...' : 'Remove Photo'}
                  </button>
                )}
              </div>

              {profilePicture && (
                <div className="mt-4 p-3 bg-[var(--accent-light)] border border-[var(--accent)] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {profilePicturePreview ? (
                        <Image
                          src={profilePicturePreview}
                          alt="Preview"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--secondary-hover)]" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{profilePicture.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{(profilePicture.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleProfilePictureUpload}
                        disabled={uploadingProfilePicture}
                        className="px-3 py-1.5 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {uploadingProfilePicture ? 'Uploading...' : 'Upload'}
                      </button>
                      <button
                        onClick={() => setProfilePicture(null)}
                        className="p-1.5 text-[var(--text-secondary)] rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Form */}
            <div className="bg-[var(--secondary)] rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-[var(--text-primary)]">Edit Profile</h4>
              
              <div>
                <label className="block text-sm text-[var(--text-primary)] mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-primary)] mb-1">Department</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-primary)] mb-1">Bio</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)] resize-none"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                />
              </div>
              
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-sm text-[var(--text-primary)] mb-1">Username</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-muted)]"
                      value={profileForm.email}
                      disabled
                    />
                  </div>
                </>
              )}
              
              <button
                onClick={updateProfile}
                className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200"
              >
                Update Profile
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Appearance</p>
                  <p className="text-sm text-[var(--text-secondary)]">Switch between light and dark theme</p>
                </div>
                <ThemeToggle variant="button" size="md" />
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Notifications</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {notificationsGranted && 'Notifications are enabled on this device.'}
                    {notificationsBlocked && 'Notifications are blocked. Enable them to receive alerts.'}
                    {notificationPermission === 'default' && 'Notifications start enabled by default. We will only prompt when needed.'}
                  </p>
                  {notificationPermission !== 'denied' && (
                    <div className="mt-2 inline-flex items-center text-xs font-semibold text-green-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-1">Default: Enabled</span>
                    </div>
                  )}
                </div>
                {!notificationsGranted && (
                  <button
                    onClick={requestNotificationPermission}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] text-sm font-medium"
                  >
                    {notificationsBlocked ? 'Enable' : 'Enable now'}
                  </button>
                )}
              </div>
            </div>

            {/* Logout */}
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <button
                onClick={handleLogout}
                className="w-full text-left text-red-600 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin Panel Section
  if (currentSection === 'admin') {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header */}
        <div className="bg-[var(--secondary)] border-b border-[var(--border)] px-4 py-3 flex items-center">
          <button
            onClick={() => setCurrentSection('main')}
            className="mr-3 text-[var(--text-secondary)] hover:text-[var(--accent)] p-2 rounded-lg hover:bg-[var(--secondary-hover)] transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Admin Panel</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-900/20 border border-green-500 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            {/* Generate Invite */}
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text-primary)] mb-2">Organization Invites</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">Generate invite links for new users</p>
              <button 
                onClick={handleGenerateInvite} 
                className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200"
              >
                Generate Invite Link
              </button>
              {inviteToken && (
                <div className="mt-3 p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg">
                  <code className="text-xs text-[var(--text-secondary)] break-all block mb-2">{inviteToken}</code>
                  <code className="text-xs text-[var(--accent)] break-all block">
                    {window.location.origin}/signup?org={localStorage.getItem("org_id")}&token={inviteToken}
                  </code>
                </div>
              )}
            </div>

            {/* Add User */}
            <div className="bg-[var(--secondary)] rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)]">Add New User</h3>
              
              <div>
                <label className="block text-sm text-[var(--text-primary)] mb-1">Username</label>
                <input 
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]" 
                  placeholder="Enter username" 
                  value={newUser.username} 
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} 
                  autoComplete="off"
                  name="new-user-username"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-primary)] mb-1">Email</label>
                <input 
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]" 
                  placeholder="Enter email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} 
                  autoComplete="off"
                  name="new-user-email"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[var(--text-primary)] mb-1">Password</label>
                <div className="relative">
                  <input 
                    className="w-full px-3 pr-10 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]" 
                    placeholder="Enter password" 
                    type={showNewUserPassword ? "text" : "password"}
                    value={newUser.password} 
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} 
                    autoComplete="new-password"
                    name="new-user-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)] hover:text-[var(--accent)]"
                  >
                    {showNewUserPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878L21 21M9.878 9.878L3 3" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <button 
                className="w-full px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all duration-200" 
                onClick={addUser}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>

            {/* Users List */}
            <div className="bg-[var(--secondary)] rounded-lg p-4">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Organization Users ({orgUsers.length})</h3>
              
              {orgUsers.length === 0 ? (
                <p className="text-center py-4 text-[var(--text-secondary)]">No users found</p>
              ) : (
                <div className="space-y-2">
                  {orgUsers.map((orgUser) => (
                    <div key={orgUser._id} className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg hover:bg-[var(--secondary-hover)] transition-colors">
                      <div className="flex items-center space-x-3 flex-1">
                            {orgUser.profile_picture ? (
                              <Image
                                src={getFileUrl(orgUser.profile_picture)}
                                alt={getDisplayName(orgUser)}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                                unoptimized
                              />
                            ) : (
                          <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {getInitials(orgUser)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{getDisplayName(orgUser)}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{orgUser.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => editUser(orgUser)}
                          className="p-2 text-[var(--accent)] hover:bg-[var(--secondary-hover)] rounded-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteUser(orgUser.email)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--secondary)] rounded-lg border border-[var(--border)] w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Username</label>
                  <input 
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]" 
                    value={editForm.username} 
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
                  <input 
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-muted)]" 
                    value={editForm.email} 
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">New Password (optional)</label>
                  <div className="relative">
                    <input 
                      className="w-full px-3 pr-10 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 bg-[var(--background)] text-[var(--text-primary)]" 
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Leave blank to keep current password"
                      value={editForm.password} 
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)] hover:text-[var(--accent)]"
                    >
                      {showEditPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878L21 21M9.878 9.878L3 3" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--secondary-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateUser}
                    className="flex-1 px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)]"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

