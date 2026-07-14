const CACHE = 'gesta-v4.0';
const SHELL = [
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase et Groq : réseau uniquement, jamais de cache
  if (url.hostname.includes('firebase') || url.hostname.includes('groq.com')) {
    return;
  }

  // App shell : cache en premier, réseau en arrière-plan (stale-while-revalidate)
  if (e.request.destination === 'document' || SHELL.includes(e.request.url)) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const networkFetch = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => null);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Tout le reste : réseau avec fallback cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
