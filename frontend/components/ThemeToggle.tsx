"use client";

import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}

export default function ThemeToggle({ 
  className = '', 
  size = 'md',
  variant = 'icon' 
}: ThemeToggleProps) {
  const { actualTheme, toggleTheme } = useTheme();
  const isLight = actualTheme === 'light';

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSize = variant === 'button' ? 'px-3 py-2' : sizeClasses[size];

  const icon = isLight ? (
    <svg className={`${iconSizes[size]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ) : (
    <svg className={`${iconSizes[size]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`${buttonSize} rounded-lg text-[var(--text-primary)] hover:bg-[var(--secondary-hover)] transition-all duration-200 flex items-center space-x-2 ${className}`}
        title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        aria-label={`Toggle ${isLight ? 'dark' : 'light'} mode`}
      >
        {icon}
        <span className="text-sm font-medium">{isLight ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${buttonSize} rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--secondary-hover)] transition-all duration-200 ${className}`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      aria-label={`Toggle ${isLight ? 'dark' : 'light'} mode`}
    >
      {icon}
    </button>
  );
}

