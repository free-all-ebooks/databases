const CACHE_NAME = 'wa-backup-cache-v11';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== CACHE_NAME) return caches.delete(k);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  // Never cache encrypted books (.enc) so fresh files always load from server
  if (e.request.url.includes('.enc')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }
  
  // Network-First for HTML pages so changes update immediately
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, toCache));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for icons and manifest
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, toCache));
        }
        return response;
      });
    })
  );
});
