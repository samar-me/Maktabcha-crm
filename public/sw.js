const CACHE_NAME = "maktabcha-crm-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/attendance",
  "/students",
  "/groups",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

// Install Event - cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate for static & network-first for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension/external requests
  if (request.method !== "GET" || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Skip API routes from static cache (they are handled by IndexedDB sync)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, return cached response
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
