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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Message';
  const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new message';
  const notificationIcon = payload.notification?.icon || payload.data?.icon || '/icon-192.png';
  const chatId = payload.data?.chatId || payload.data?.chat_id || 'chatapp-message';
  
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/icon-192.png',
    image: payload.notification?.image || payload.data?.image,
    tag: chatId,
    requireInteraction: false,
    silent: false, // Ensure system notification sound plays (default sound)
    data: {
      ...payload.data,
      chatId: chatId,
      click_action: payload.data?.click_action || payload.notification?.click_action || '/chat'
    },
    // Enhanced vibration pattern (vibrate pattern: 200ms, pause 100ms, 200ms, pause 100ms, 200ms)
    vibrate: [200, 100, 200, 100, 200],
    // Actions for notification interaction
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
    // Additional notification metadata
    timestamp: Date.now(),
    dir: 'ltr',
    lang: 'en',
    // Show in notification drawer and replace previous notifications with same tag
    renotify: true
  };

  // Show notification with all options
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked', event.notification);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  // Handle dismiss action
  if (action === 'dismiss') {
    return; // Just close, don't open anything
  }
  
  // Default action: open chat
  const targetUrl = notificationData.click_action 
    || (notificationData.chatId ? `/chat?chat=${notificationData.chatId}` : '/chat');
  
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
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

