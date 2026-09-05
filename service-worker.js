// Service worker for Our Wedding Planner.
// Caches the app shell so it loads and works offline after the first visit.
// All actual wedding data lives in localStorage on the device, not here —
// this only caches the code/assets needed to render the app.

const CACHE_NAME = 'wedding-planner-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else (if any) pass through.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // Cache same-origin app files and the phone-validation library
          // as they're fetched, so later visits (including offline ones)
          // have the latest copy without needing a new deploy each time.
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // offline and not cached yet — nothing more we can do

      // Serve from cache immediately if we have it (fast + works offline),
      // and refresh the cache in the background for next time.
      return cached || network;
    })
  );
});
