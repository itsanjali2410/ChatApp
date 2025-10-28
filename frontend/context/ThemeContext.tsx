"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
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

    const getSystemTheme = (): 'light' | 'dark' => {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    };

    let resolvedTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      // For system theme, we'll default to light to avoid unwanted dark mode
      resolvedTheme = 'light';
      
      // Optional: Uncomment to enable system theme detection
      // resolvedTheme = getSystemTheme();
      // const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      // const handler = (e: MediaQueryListEvent) => {
      //   setActualTheme(e.matches ? 'dark' : 'light');
      //   applyTheme(e.matches ? 'dark' : 'light');
      // };
      // mediaQuery.addEventListener('change', handler);
      // setActualTheme(resolvedTheme);
      // return () => mediaQuery.removeEventListener('change', handler);
    } else {
      resolvedTheme = theme;
    }

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

  const toggleTheme = () => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
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

