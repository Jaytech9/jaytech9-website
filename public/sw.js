// JayTech9 service worker: makes the site installable and usable offline.
// Bump VERSION whenever you deploy a change you want everyone to receive straight away.
const VERSION = 'jt9-v8';
const CORE = ['/', '/offline/', '/services/', '/products/', '/about/', '/contact/', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Live data (orders, payments, counts) must never come from the cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/cdn-cgi/')) return;
  // Private order pages and payment returns are never stored on the device.
  if (/^\/(track|donate\/thanks)\//.test(url.pathname)) return;

  // Pages: try the network first so visitors see the latest content; fall back to cache, then the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/offline/')))
    );
    return;
  }

  // Styles, fonts, images: serve from cache when we have them, otherwise fetch and keep a copy.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
