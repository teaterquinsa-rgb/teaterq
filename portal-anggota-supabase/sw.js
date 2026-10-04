// Service Worker Teater Q - High-Performance PWA & Offline Shell Resilience
// Versi: 20261004-v7
const CACHE_NAME = 'tq-pwa-v20261004-v7';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './assets/logo.png',
  './assets/logo_transparent.png',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching core assets warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!req || req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Lewatkan 100% tanpa campur tangan untuk Supabase, API eksternal, Google Apps Script, Google AdSense, CounterAPI, WhatsApp, dan WebSockets
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('counterapi.dev') ||
    url.hostname.includes('googlesyndication.com') ||
    url.hostname.includes('wa.me') ||
    url.protocol.startsWith('ws')
  ) {
    return; // Native browser passthrough
  }

  // 2. Mode Navigasi (Membuka halaman web / index.html): Network-First
  // Selalu request HTML paling segar dari server secara langsung.
  // Hanya jika jaringan offline / mati sinyal, layani cache index.html agar aplikasi tetap terbuka mulus.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('./index.html').then((res) => {
          return res || caches.match('index.html');
        });
      })
    );
    return;
  }

  // 3. Aset Gambar & Logo Lokal: Stale-While-Revalidate untuk render instan 0ms
  if (url.origin === self.location.origin && (url.pathname.includes('/assets/') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.png'))) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default passthrough browser
});
