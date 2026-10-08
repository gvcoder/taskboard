const CACHE_NAME = "taskboard-lite-v1";
const ASSETS_TO_CACHE = [
  "/mobile",
  "/manifest.json",
  "/favicon.ico"
];

self.addEventListener("install", (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  (self as any).skipWaiting();
});

self.addEventListener("activate", (event: any) => {
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
  (self as any).clients.claim();
});

self.addEventListener("fetch", (event: any) => {
  const url = new URL(event.request.url);

  // For API endpoints, prefer network, fall back to offline handling in app code
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network first, cache fallback for navigation / static assets
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === "navigate") {
          return caches.match("/mobile");
        }
        return Promise.reject("no-match");
      });
    })
  );
});
