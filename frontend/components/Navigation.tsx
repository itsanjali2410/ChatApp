"use client";
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getFileUrl } from '../utils/api';

interface NavigationProps {
  currentUser?: {
    username?: string;
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
  } | null;
}

export default function Navigation({ currentUser }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const getDisplayName = () => {
    if (currentUser?.first_name && currentUser?.last_name) {
      return `${currentUser.first_name} ${currentUser.last_name}`;
    }
    return currentUser?.username || 'User';
  };

  const getInitials = () => {
    if (currentUser?.first_name && currentUser?.last_name) {
      return `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase();
    }
    return (currentUser?.username || 'U').substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('org_id');
    router.push('/login');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/chat" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold text-gradient">ChatApp</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/chat"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/chat')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              💬 Chat
            </Link>
            <Link
              href="/profile"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/profile')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              👤 Profile
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {currentUser.profile_picture ? (
                    <img
                      src={getFileUrl(currentUser.profile_picture)}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {getDisplayName()}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link
            href="/chat"
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/chat')
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            💬 Chat
          </Link>
          <Link
            href="/profile"
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/profile')
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            👤 Profile
          </Link>
        </div>
      </div>
    </nav>
  );
}
