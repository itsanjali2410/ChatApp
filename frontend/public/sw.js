const CACHE_NAME = 'chatapp-v1';
const urlsToCache = [
  '/',
  '/login',
  '/chat',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received', event);
  
  let notificationData = {
    title: 'New Message',
    body: 'You have a new message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'chatapp-message',
    requireInteraction: false,
    data: {}
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        tag: pushData.tag || notificationData.tag,
        requireInteraction: pushData.requireInteraction || false,
        data: {
          chatId: pushData.chatId || '',
          senderName: pushData.senderName || '',
          messageType: pushData.messageType || 'text',
          url: pushData.url || '/chat'
        }
      };
    } catch (e) {
      console.error('[ServiceWorker] Error parsing push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Open Chat',
          icon: '/icon-192.png'
        }
      ]
    })
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked', event.notification);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/chat';
  
  // If chatId is provided, append it to the URL
  const urlToOpen = notificationData.chatId 
    ? `${targetUrl}?chat=${notificationData.chatId}` 
    : targetUrl;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl.split('?')[0]) && 'focus' in client) {
          return client.focus().then(() => {
            // If chatId is in the URL, navigate to that specific chat
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
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
