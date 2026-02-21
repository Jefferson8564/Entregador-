const CACHE_NAME = 'rei-entregas-v2';

// Assets do app
const APP_ASSETS = [
  './',
  './index.html',
  './icone.png',
  './manifest.json'
];

// ===== INSTALL: cacheia assets do app =====
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

// ===== ACTIVATE: limpa caches antigos =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== FETCH: estratégia inteligente =====
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // 1. TILES DO MAPA LOCAL — sempre serve do cache (offline first)
  if (url.includes('/tiles/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        // Se não tem no cache, tenta buscar online e salva
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // 2. TILES EXTERNOS (CartoCDN) — tenta cache primeiro, fallback online
  if (url.includes('cartocdn') || url.includes('openstreetmap') || url.includes('tile.')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // 3. SUPABASE / OSRM / APIs externas — sempre online, sem cache
  if (url.includes('supabase') || url.includes('osrm') || url.includes('fonts.')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // 4. ASSETS DO APP — cache first
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  }
});
