"use client";
import React, { useState, useEffect } from 'react';
import api, { getFileUrl } from '../utils/api';

interface ProfileData {
  _id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  linkedin_url?: string;
  instagram_url?: string;
  phone?: string;
  department?: string;
  position?: string;
  profile_picture?: string;
  selfie?: string;
  is_online?: boolean;
  last_seen?: string;
}

interface ProfileManagerProps {
  onProfileUpdate?: (profile: ProfileData) => void;
}

export default function ProfileManager({ onProfileUpdate }: ProfileManagerProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'pictures'>('profile');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    linkedin_url: '',
    instagram_url: '',
    phone: '',
    department: '',
    position: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile/me');
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        bio: response.data.bio || '',
        linkedin_url: response.data.linkedin_url || '',
        instagram_url: response.data.instagram_url || '',
        phone: response.data.phone || '',
        department: response.data.department || '',
        position: response.data.position || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put('/users/profile/me', formData);
      await fetchProfile();
      onProfileUpdate?.(profile!);
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'profile_picture' | 'selfie') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = type === 'profile_picture' ? '/files/upload-profile-picture' : '/files/upload-selfie';
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await fetchProfile();
      onProfileUpdate?.(profile!);
      alert(`${type === 'profile_picture' ? 'Profile picture' : 'Selfie'} updated successfully!`);
    } catch (error: any) {
      console.error(`Failed to upload ${type}:`, error);
      alert(`Failed to upload ${type === 'profile_picture' ? 'profile picture' : 'selfie'}. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-[var(--secondary)] border border-[var(--border)] rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Profile Management</h2>
        <p className="text-[var(--text-secondary)]">Manage your profile information and photos</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-[var(--secondary-hover)] p-1 rounded-lg border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('pictures')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pictures'
              ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--accent)]'
          }`}
        >
          Photos
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Professional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Engineering, Marketing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Software Engineer, Manager"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your phone number"
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                name="instagram_url"
                value={formData.instagram_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com/yourprofile"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Picture</h3>
            <div className="flex flex-col items-center space-y-4">
              {profile?.profile_picture ? (
                <img
                  src={getFileUrl(profile.profile_picture)}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-2xl">👤</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'profile_picture');
                  }}
                  className="hidden"
                  id="profile-picture-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="profile-picture-upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Profile Picture'}
                </label>
              </div>
            </div>
          </div>

          {/* Selfie */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Selfie</h3>
            <div className="flex flex-col items-center space-y-4">
              {profile?.selfie ? (
                <img
                  src={getFileUrl(profile.selfie)}
                  alt="Selfie"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-2xl">📸</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'selfie');
                  }}
                  className="hidden"
                  id="selfie-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="selfie-upload"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Selfie'}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
