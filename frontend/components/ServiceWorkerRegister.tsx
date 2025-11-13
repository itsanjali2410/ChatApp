"use client";

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Register Firebase Service Worker for FCM
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log('Firebase Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.log('Firebase Service Worker registration failed:', error);
          });
        
        // Register PWA Service Worker for app features
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.log('PWA Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}

