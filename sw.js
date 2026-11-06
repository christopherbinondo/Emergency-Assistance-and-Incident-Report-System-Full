const CACHE = 'incident-desk-v28';
const ASSETS = [
  './', 
  './index.html', 
  './report.html', 
  './queue.html', 
  './records.html', 
  './analytics.html',
  './style.css?v=26', 
  './board.html',
  './desk.css?v=1',
  './desk.js',
  './core.js', 
  './ai.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // ONLY skip caching for the AI server
  if (url.hostname === 'oxford.uk.eu.org') return;
  
  // (We removed the googleapis and unpkg skip, so it caches them now)
  
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
