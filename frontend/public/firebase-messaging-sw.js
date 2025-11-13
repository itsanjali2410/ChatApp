// Import Firebase scripts for background messages
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDszyPzTtgV-k8TpBGm4lmckkyyFAbon6A",
  authDomain: "chatapp-internal.firebaseapp.com",
  projectId: "chatapp-internal",
  storageBucket: "chatapp-internal.firebasestorage.app",
  messagingSenderId: "231183713207",
  appId: "1:231183713207:web:1937c63c9000294ca69e32"
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages - THIS IS THE KEY FOR INSTANT NOTIFICATIONS
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 📬 Background message received:', payload);
  console.log('[SW] ⏰ Timestamp:', new Date().toISOString());
  
  // Extract notification data with fallbacks
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
  const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new message';
  const notificationIcon = payload.notification?.icon || payload.data?.icon || '/icon-192.png';
  const chatId = payload.data?.chatId || payload.data?.chat_id;
  
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/icon-192.png',
    image: payload.notification?.image || payload.data?.image,
    tag: chatId || 'chatapp-message',
    requireInteraction: false,
    renotify: true, // Show notification even if one with same tag exists
    silent: false,
    data: {
      ...payload.data,
      chatId: chatId,
      click_action: payload.data?.click_action || payload.notification?.click_action || '/chat',
      timestamp: Date.now()
    },
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open Chat',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    timestamp: Date.now(),
    dir: 'ltr',
    lang: 'en'
  };

  console.log('[SW] 🔔 Showing notification:', notificationTitle);
  
  // IMPORTANT: Return the promise to ensure notification is shown immediately
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('[SW] ✅ Notification shown successfully');
    })
    .catch((error) => {
      console.error('[SW] ❌ Error showing notification:', error);
    });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👆 Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  // Handle dismiss action
  if (action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }
  
  // Default action: open chat
  const targetUrl = notificationData.click_action 
    || (notificationData.chatId ? `/chat?chat=${notificationData.chatId}` : '/chat');
  
  console.log('[SW] Opening URL:', targetUrl);
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const baseUrl = targetUrl.split('?')[0];
        if (client.url.includes(baseUrl) && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus().then(() => {
            // Post message to navigate to specific chat
            if (notificationData.chatId) {
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                chatId: notificationData.chatId
              });
            }
          });
        }
      }
      // If no existing window, open a new one
      console.log('[SW] Opening new window');
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Service Worker activation - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Service Worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting(); // Activate immediately
});

// Handle push events (additional fallback for instant notifications)
self.addEventListener('push', (event) => {
  console.log('[SW] 📨 Push event received');
  
  if (event.data) {
    console.log('[SW] Push data:', event.data.text());
    
    try {
      const payload = event.data.json();
      console.log('[SW] Parsed push payload:', payload);
      
      // If Firebase messaging doesn't trigger, this is a fallback
      const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
      const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new message';
      
      const notificationOptions = {
        body: notificationBody,
        icon: payload.notification?.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.chatId || 'chatapp-message',
        data: payload.data,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: false,
        silent: false
      };
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
          .then(() => console.log('[SW] ✅ Push notification shown'))
          .catch((error) => console.error('[SW] ❌ Push notification error:', error))
      );
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  } else {
    console.log('[SW] Push event has no data');
  }
});

console.log('[SW] 🚀 Firebase Messaging Service Worker loaded');