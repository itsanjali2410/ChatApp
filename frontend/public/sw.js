const CACHE_NAME = 'chatapp-v1';
const STATIC_CACHE = 'chatapp-static-v1';
const DYNAMIC_CACHE = 'chatapp-dynamic-v1';

// Static assets to cache on install
const urlsToCache = [
  '/',
  '/login',
  '/chat',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// API routes that should NEVER be cached (always fetch fresh)
const neverCacheRoutes = [
  '/api/',
  '/ws/',
  '/socket.io/'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove old cache versions
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Service worker activated successfully');
      return self.clients.claim(); // Take control of all pages immediately
    })
    .catch((error) => {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch Strategy: Network First for API, Cache First for Static Assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // NEVER cache API calls, WebSocket connections, or dynamic data
  const shouldNeverCache = neverCacheRoutes.some(route => url.pathname.includes(route));
  
  if (shouldNeverCache) {
    // Network-only strategy for API calls
    event.respondWith(
      fetch(request)
        .catch((error) => {
          console.error('[SW] Network request failed:', error);
          // Return a custom offline response for API calls
          return new Response(
            JSON.stringify({ 
              error: 'Network unavailable',
              message: 'Please check your internet connection'
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // For static assets: Cache First, falling back to Network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        console.log('[SW] Fetching from network:', url.pathname);
        return fetch(request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Clone the response (can only be consumed once)
            const responseToCache = response.clone();
            
            // Cache the fetched response for future use
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
                console.log('[SW] Cached new resource:', url.pathname);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // Return a custom offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html').then(offlinePage => {
                if (offlinePage) return offlinePage;
                
                // If no offline page, return basic HTML
                return new Response(
                  `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Offline - ChatApp</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          min-height: 100vh;
                          margin: 0;
                          background: #f5f5f5;
                          text-align: center;
                          padding: 20px;
                        }
                        .offline-container {
                          max-width: 400px;
                        }
                        h1 {
                          color: #333;
                          font-size: 24px;
                          margin-bottom: 16px;
                        }
                        p {
                          color: #666;
                          font-size: 16px;
                          line-height: 1.5;
                        }
                        .icon {
                          font-size: 64px;
                          margin-bottom: 20px;
                        }
                        button {
                          background: #4A90E2;
                          color: white;
                          border: none;
                          padding: 12px 24px;
                          border-radius: 6px;
                          font-size: 16px;
                          cursor: pointer;
                          margin-top: 20px;
                        }
                        button:hover {
                          background: #357ABD;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="offline-container">
                        <div class="icon">📡</div>
                        <h1>You're Offline</h1>
                        <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
                        <button onclick="window.location.reload()">Retry</button>
                      </div>
                    </body>
                  </html>
                  `,
                  {
                    headers: { 'Content-Type': 'text/html' }
                  }
                );
              });
            }
            
            // For other requests, just return the error
            return new Response('Network error', { status: 408, statusText: 'Request Timeout' });
          });
      })
  );
});

// Handle messages from clients (e.g., force update)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating immediately');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Log service worker lifecycle events
self.addEventListener('controllerchange', () => {
  console.log('[SW] Controller changed - new service worker activated');
});

// ⚠️ IMPORTANT: Push notifications and notification clicks are handled by firebase-messaging-sw.js
// This service worker (sw.js) should NOT handle push events to avoid conflicts
// If you need custom push notification handling, do it in firebase-messaging-sw.js

console.log('[SW] Service worker script loaded');