"use client";
import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import Link from "next/link";

type User = {
  _id: string;
  username?: string;
  email: string;
  role?: string;
  organization_id?: string;
  created_at?: string;
};

type Organization = {
  _id: string;
  org_name: string;
  description?: string;
  address?: string;
  website?: string;
  admin_id: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user details
        const userEmail = localStorage.getItem("email");
        if (!userEmail) {
          throw new Error("No user email found");
        }
        
        const userRes = await api.get(`/users/${userEmail}`);
        setUser(userRes.data);
        
        // Get organization details if user has org_id
        const orgId = localStorage.getItem("org_id");
        if (orgId) {
          try {
            const orgRes = await api.get("/organization/");
            const orgs = orgRes.data;
            const userOrg = orgs.find((org: any) => org._id === orgId);
            if (userOrg) {
              setOrganization(userOrg);
            }
          } catch (e) {
            console.log("Could not load organization details");
          }
        }
      } catch (e: any) {
        const detail = e?.response?.data?.detail || "Failed to load user data";
        setError(detail);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ChatApp</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Welcome, {user?.username || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600 text-lg">
            Ready to start chatting with your team?
          </p>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-20 h-20 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-xl font-bold">
              {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {user?.username || "User"}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">{user?.email}</p>
              <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user?.role === "admin" 
                    ? "bg-purple-100 text-purple-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {user?.role === "admin" ? "Administrator" : "User"}
                </span>
                {user?.created_at && (
                  <span className="text-xs sm:text-sm text-gray-500">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Organization Card */}
        {organization && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">{organization.org_name}</h4>
                {organization.description && (
                  <p className="text-gray-600 text-sm mt-1">{organization.description}</p>
                )}
              </div>
              <div className="space-y-2">
                {organization.address && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📍</span>
                    {organization.address}
                  </div>
                )}
                {organization.website && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🌐</span>
                    <a 
                      href={organization.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {organization.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Chat */}
          <Link href="/chat" className="group">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-shadow">
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="w-16 h-16 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 text-lg sm:text-base">Start Chatting</h3>
                  <p className="text-sm text-gray-600">Connect with your team</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Admin Panel */}
          {user?.role === "admin" && (
            <Link href="/admin" className="group">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-shadow">
                <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="w-16 h-16 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="font-bold text-gray-900 group-hover:text-purple-600 text-lg sm:text-base">Admin Panel</h3>
                    <p className="text-sm text-gray-600">Manage organization</p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Profile Settings */}
          <Link href="/profile" className="group">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl transition-shadow">
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="w-16 h-16 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-bold text-gray-900 group-hover:text-gray-600 text-lg sm:text-base">Profile</h3>
                  <p className="text-sm text-gray-600">Manage your account</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organization ? "Multiple" : "1"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Active Chats</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Messages Sent</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}