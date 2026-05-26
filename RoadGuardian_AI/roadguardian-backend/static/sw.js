const CACHE_NAME = "roadguardian-cache-v1";
const STATIC_ASSETS = [
  "/static/index.html",
  "/static/style.css",
  "/static/app.js",
  "/static/manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

// Install Event - Pre-cache central static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static assets...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache keys
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[Service Worker] Pruning expired cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Intercept requests with customized caching strategies
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Caching Strategy: Network-First for API requests to ensure accurate live reporting
  if (requestUrl.pathname.includes("/hazards/") || requestUrl.pathname.includes("/auth/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok && event.request.method === "GET") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached API responses if network is down
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            
            // Standard offline JSON fallback response
            return new Response(
              JSON.stringify({
                error: "Offline Mode Active",
                message: "This safe system is offline. Connect to the internet to submit reports or fetch real-time analytics."
              }),
              { headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
    return;
  }

  // Caching Strategy: Stale-While-Revalidate for static resources to speed up page load
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Suppress fetch errors when fully offline
        });

      return cachedResponse || fetchPromise;
    })
  );
});
