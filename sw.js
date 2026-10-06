const CACHE = "swertres-v7";

const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "src/lucky.js",
  "src/games.js",
  "src/reasons.js",
  "src/profile.js",
  "src/sound.js",
  "src/app.js",
  "manifest.webmanifest",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/og-image.png"
];

// Install event: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => {
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event: cache-first strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests to same origin
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Check if same origin (no protocol/host/port change)
  const selfUrl = new URL(self.location.href);
  if (url.origin !== selfUrl.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache responses that aren't successful
            if (!response || !response.ok || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response for caching
            const responseToCache = response.clone();
            
            return caches.open(CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                return response;
              });
          })
          .catch(() => {
            // For navigation requests, fall back to cached index.html
            if (event.request.mode === 'navigate') {
              return caches.match('index.html');
            }
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
