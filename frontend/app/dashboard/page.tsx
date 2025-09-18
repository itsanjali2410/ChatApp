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

        const userEmail = localStorage.getItem("email");
        if (!userEmail) throw new Error("No user email found");

        const userRes = await api.get(`/users/${userEmail}`);
        setUser(userRes.data);

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
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-14">
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* User Profile */}
        <div className="bg-white shadow-sm border rounded-lg p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
              {(user?.username || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.username || "User"}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
              <span
                className={`mt-1 inline-block px-2 py-0.5 text-xs rounded ${
                  user?.role === "admin"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {user?.role === "admin" ? "Administrator" : "User"}
              </span>
            </div>
          </div>
          {user?.created_at && (
            <p className="mt-3 text-sm text-gray-500">
              Joined{" "}
              {new Date(user.created_at).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </p>
          )}
        </div>

        {/* Organization */}
        {organization && (
          <div className="bg-white shadow-sm border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {organization.org_name}
            </h3>
            {organization.description && (
              <p className="text-gray-600 mb-2">{organization.description}</p>
            )}
            <div className="text-sm text-gray-600 space-y-1">
              {organization.address && <p>📍 {organization.address}</p>}
              {organization.website && (
                <p>
                  🌐{" "}
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {organization.website}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/chat">
            <div className="bg-white shadow-sm border rounded-lg p-6 hover:shadow-md transition">
              <h3 className="font-medium text-gray-900">💬 Start Chatting</h3>
              <p className="text-sm text-gray-600">Connect with your team</p>
            </div>
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin">
              <div className="bg-white shadow-sm border rounded-lg p-6 hover:shadow-md transition">
                <h3 className="font-medium text-gray-900">⚙️ Admin Panel</h3>
                <p className="text-sm text-gray-600">Manage organization</p>
              </div>
            </Link>
          )}
          <Link href="/profile">
            <div className="bg-white shadow-sm border rounded-lg p-6 hover:shadow-md transition">
              <h3 className="font-medium text-gray-900">👤 Profile</h3>
              <p className="text-sm text-gray-600">Manage your account</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
