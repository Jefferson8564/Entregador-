// ============================================================
//  SERVICE WORKER — O Rei da Coxinha 🛵
//
//  ✅ Para lançar uma atualização:
//     1. Mude APP_VERSION aqui embaixo (ex: '1.0.0' → '1.1.0')
//     2. Faça commit + push no GitHub
//     3. O pop-up roxo aparecerá automaticamente para todos!
// ============================================================

const APP_VERSION = '1.0.0'; // ⬅️ MUDE AQUI ao atualizar

const CACHE_APP   = `rei-coxinha-app-${APP_VERSION}`;
const CACHE_TILES = 'rei-coxinha-tiles-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icone.png',
  './sw-update.js',
];

// ─── INSTALL: salva app shell no cache ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_APP).then(cache => cache.addAll(APP_SHELL))
    // ⚠️ NÃO chama skipWaiting — o usuário decide quando atualizar
  );
});

// ─── ACTIVATE: apaga caches de versões antigas ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('rei-coxinha-app-') && k !== CACHE_APP)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH: tiles do mapa em cache separado ─────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Tiles do mapa — cache longo, separado do app
  if (url.includes('cartocdn.com') || url.includes('openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE_TILES).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            if (res && res.ok) cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // App shell — rede primeiro, cache como fallback offline
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_APP).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── MESSAGE: comandos vindos do app ───────────────────────
self.addEventListener('message', event => {
  // Usuário confirmou atualização — ativa o novo SW
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // App pediu a versão atual do SW (para exibir no pop-up)
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: APP_VERSION });
  }
});
