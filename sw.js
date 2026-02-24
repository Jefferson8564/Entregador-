// ============================================================
//  SERVICE WORKER — O Rei da Coxinha 🛵
//
//  ✅ Para lançar uma atualização:
//     1. Mude APP_VERSION aqui embaixo (ex: '1.0.0' → '1.1.0')
//     2. Baixe o arquivo, edite e suba de volta no GitHub
//     3. O pop-up roxo aparecerá automaticamente para todos!
// ============================================================

const APP_VERSION = '1.0.1'; // ⬅️ MUDE AQUI ao atualizar

const CACHE_APP   = `rei-entregas-app-${APP_VERSION}`;
const CACHE_TILES = 'rei-entregas-tiles-v2';

// Assets do app que ficam em cache
const APP_ASSETS = [
  './',
  './index.html',
  './icone.png',
  './manifest.json',
  './sw-update.js'
];

// ===== INSTALL: cacheia assets do app =====
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_APP).then(cache => cache.addAll(APP_ASSETS))
    // ⚠️ NÃO chama skipWaiting — o usuário decide quando atualizar via pop-up
  );
});

// ===== ACTIVATE: limpa caches de versões antigas =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('rei-entregas-app-') && k !== CACHE_APP)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH: estratégia inteligente =====
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // 1. TILES DO MAPA LOCAL — cache offline first
  if (url.includes('/tiles/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_TILES).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // 2. TILES EXTERNOS (CartoCDN / OSM) — cache first, fallback online
  if (url.includes('cartocdn') || url.includes('openstreetmap') || url.includes('tile.')) {
    e.respondWith(
      caches.open(CACHE_TILES).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res && res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // 3. SUPABASE / OSRM / APIs externas — sempre online, sem cache
  if (url.includes('supabase') || url.includes('osrm') || url.includes('fonts.')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // 4. ASSETS DO APP — network first, fallback no cache (garante versão nova)
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_APP).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});

// ===== MESSAGE: comandos vindos do app =====
self.addEventListener('message', event => {
  // Usuário confirmou atualização no pop-up — ativa o novo SW
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Pop-up pediu a versão atual para exibir no chip (v1.0.0 → v1.1.0)
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: APP_VERSION });
  }
});
