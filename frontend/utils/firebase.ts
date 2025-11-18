import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api';
// Your existing Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDszyPzTtgV-k8TpBGm4lmckkyyFAbon6A",
  authDomain: "chatapp-internal.firebaseapp.com",
  projectId: "chatapp-internal",
  storageBucket: "chatapp-internal.firebasestorage.app",
  messagingSenderId: "231183713207",
  appId: "1:231183713207:web:1937c63c9000294ca69e32"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Extended NotificationOptions to include vibrate (TypeScript fix)
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  renotify?: boolean;
  timestamp?: number;
}

/**
 * CRITICAL FIX: Request notification permission and get FCM token
 * This now properly registers the service worker and gets token with VAPID key
 */
export const requestNotificationPermissionAndToken = async () => {
  try {
    console.log('🔔 Requesting notification permission...');
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.error('❌ This browser does not support notifications');
      return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.error('❌ This browser does not support service workers');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('❌ Notification permission denied');
      return null;
    }

    console.log('✅ Notification permission granted');

    // Register service worker with IMMEDIATE updates
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none' // CRITICAL: Always check for updates, no caching
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Wait for service worker to be active and ready
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker is ready');

    // Get Firebase Messaging instance
    const messaging = getMessaging(app);

    // CRITICAL: Get FCM token with VAPID key
    // TODO: Replace 'YOUR_VAPID_KEY_HERE' with your actual VAPID key from Firebase Console
    // Go to: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
    const token = await getToken(messaging, {
      vapidKey: 'BCvp3xwoohxjD2uGNJAB7ZxmgI4mr4iPQQ5zTsV9puib-Jvunj2al0TpZm3tppOzv9ODylpsb1uTPmXy_MPyw40', // ⚠️ REPLACE THIS WITH YOUR ACTUAL VAPID KEY
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ FCM Token obtained:', token);
      return token;
    } else {
      console.error('❌ No FCM token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      // Common error handling
      if (error.message.includes('messaging/permission-blocked')) {
        console.error('💡 Notification permission was previously blocked. User must enable it in browser settings.');
      } else if (error.message.includes('messaging/token-subscribe-failed')) {
        console.error('💡 Failed to subscribe to FCM. Check VAPID key configuration.');
      } else if (error.message.includes('messaging/vapid-key-invalid')) {
        console.error('💡 Invalid VAPID key. Generate a new one in Firebase Console.');
      }
    }
    
    return null;
  }
};

/**
 * CRITICAL FIX: Handle foreground messages with immediate notification display
 */
export const onForegroundMessage = (callback: (payload: any) => void) => {
  try {
    const messaging = getMessaging(app);
    
    // Listen for messages when app is in foreground
    onMessage(messaging, (payload) => {
      console.log('📬 Foreground message received:', payload);
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      // ALWAYS show notification immediately even when app is in foreground
      // This ensures users never miss messages
      if (Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
        const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new message';
        const notificationIcon = payload.notification?.icon || payload.data?.icon || '/icon-192.png';
        const chatId = payload.data?.chatId || payload.data?.chat_id;
        
        // Create notification options with proper TypeScript typing
        const notificationOptions: ExtendedNotificationOptions = {
          body: notificationBody,
          icon: notificationIcon,
          badge: '/icon-192.png',
          tag: chatId || 'chatapp-message',
          requireInteraction: false,
          silent: false, // Enable sound
          vibrate: [200, 100, 200, 100, 200], // TypeScript error fixed
          renotify: true, // Show notification even if one with same tag exists
          data: {
            ...payload.data,
            chatId: chatId,
            click_action: `/chat${chatId ? `?chat=${chatId}` : ''}`
          },
          timestamp: Date.now()
        };
        
        // Create and show notification INSTANTLY - always show, even in foreground
        const notification = new Notification(notificationTitle, notificationOptions);

        // Handle notification click
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          
          const chatId = payload.data?.chatId || payload.data?.chat_id;
          if (chatId) {
            window.location.href = `/chat?chat=${chatId}`;
          } else {
            window.location.href = '/chat';
          }
          
          notification.close();
        };

        console.log('✅ Foreground notification shown');
      }
      
      // Call the callback with payload
      callback(payload);
    });
    
    console.log('✅ Foreground message listener registered');
  } catch (error) {
    console.error('❌ Error setting up foreground message listener:', error);
  }
};

/**
 * CRITICAL FIX: Save FCM token to backend with retry logic
 */
export const saveFCMTokenToBackend = async (token: string, retries = 3): Promise<boolean> => {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      console.log(`💾 Saving FCM token to backend (attempt ${attempt + 1}/${retries})...`);
      
      const authToken = localStorage.getItem('token');
      
      if (!authToken) {
        console.error('❌ No auth token found. User must be logged in.');
        return false;
      }

      // FIX: Use the correct backend URL
      const API_URL = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_API_URL || 'https://chatapp.tripstarsholidays.com'
        : 'http://localhost:8000';

      const response = await fetch(`${API_URL}/users/fcm-token`, {  
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          fcm_token: token,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ FCM token saved to backend successfully');
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save FCM token:', response.status, errorData);
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return false;
        }
      }
    } catch (error) {
      console.error(`❌ Error saving FCM token (attempt ${attempt + 1}):`, error);
    }
    
    attempt++;
    
    // Wait before retrying (exponential backoff)
    if (attempt < retries) {
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Retrying in ${waitTime / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  console.error('❌ Failed to save FCM token after all retries');
  return false;
};

/**
 * Force service worker update (useful for debugging)
 */
export const updateServiceWorker = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration) {
      console.log('🔄 Checking for service worker updates...');
      await registration.update();
      console.log('✅ Service worker update check complete');
    }
  } catch (error) {
    console.error('❌ Error updating service worker:', error);
  }
};

/**
 * Unregister service worker (useful for debugging)
 */
export const unregisterServiceWorker = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration) {
      await registration.unregister();
      console.log('✅ Service worker unregistered');
    }
  } catch (error) {
    console.error('❌ Error unregistering service worker:', error);
  }
};

/**
 * Get current FCM token (if already registered)
 */
export const getCurrentFCMToken = async (): Promise<string | null> => {
  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.getRegistration('/');
    
    if (!registration) {
      console.error('❌ No service worker registration found');
      return null;
    }
    
    const token = await getToken(messaging, {
      vapidKey: 'BCvp3xwoohxjD2uGNJAB7ZxmgI4mr4iPQQ5zTsV9puib-Jvunj2al0TpZm3tppOzv9ODylpsb1uTPmXy_MPyw40', // ⚠️ REPLACE THIS
      serviceWorkerRegistration: registration
    });
    
    return token;
  } catch (error) {
    console.error('❌ Error getting current FCM token:', error);
    return null;
  }
};

/**
 * Check if notifications are supported and enabled
 */
export const checkNotificationSupport = (): { 
  supported: boolean; 
  permission: NotificationPermission | null;
  message: string;
} => {
  if (!('Notification' in window)) {
    return {
      supported: false,
      permission: null,
      message: 'Notifications are not supported in this browser'
    };
  }
  
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      permission: null,
      message: 'Service Workers are not supported in this browser'
    };
  }
  
  return {
    supported: true,
    permission: Notification.permission,
    message: `Notification permission: ${Notification.permission}`
  };
};

// Export the app for use in other parts of your application
export default app;