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
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.chatId || 'chatapp-message',
    requireInteraction: false,
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open Chat'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked', event.notification);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.chatId 
    ? `/chat?chat=${notificationData.chatId}`
    : '/chat';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/chat') && 'focus' in client) {
          return client.focus().then(() => {
            if (notificationData.chatId) {
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                chatId: notificationData.chatId
              });
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

