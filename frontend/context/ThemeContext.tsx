"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme, options?: { persist?: boolean }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage, default to light
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // Default to light theme if no saved preference
      setThemeState('light');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const resolvedTheme: 'light' | 'dark' = theme === 'system' ? 'light' : theme;

    setActualTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  }, [theme, mounted]);

  const applyTheme = (resolvedTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const persistThemePreference = async (resolvedTheme: 'light' | 'dark') => {
    try {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) return;
      await api.put('/users/preferences/theme', { theme: resolvedTheme });
    } catch (error) {
      console.error('Failed to persist theme preference', error);
    }
  };

  const setTheme = (newTheme: Theme, options?: { persist?: boolean }) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    const resolvedTheme = newTheme === 'system' ? 'light' : (newTheme as 'light' | 'dark');
    if (options?.persist === false) {
      return;
    }
    void persistThemePreference(resolvedTheme);
  };

  const toggleTheme = () => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme, { persist: true });
  };

  // Apply theme on mount
  useEffect(() => {
    applyTheme(actualTheme);
  }, [actualTheme]);

  const value: ThemeContextType = {
    theme,
    actualTheme,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

