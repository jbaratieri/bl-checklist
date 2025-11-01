// service-worker.js — LuthierPro v2.4.1 (offline forte + login sem cache + ignora /api)
const CACHE_VERSION = 'luthierpro-v2.4.1';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMG_CACHE_MAX_ENTRIES = 300;

const APP_SHELL = [
  './',
  './index.html',            // mantém cache para offline do app
  // './login.html',         // ⚠️ não cachear login (sempre rede)
  './offline.html',
  './manifest.webmanifest',

  // Ícone fallback (para imagens offline)
  './assets/fallback-image.png',

  // CSS
  './css/checklist.css',
  './css/images-thumbs.css',
  './css/context-bar.css',
  './css/project-header.css',
  './css/step12-draw.css',
  './css/responsive.css',
  './css/footer.css',
  './css/login.css',

  // JS principais
  './js/checklist.js',
  './js/step2-toc.js',
  './js/step6-export.js',
  './js/step11-tech.js',
  './js/step9-instrument.js',
  './js/step15-instrument-badge.js',
  './js/step14-images-persist.v4.1.js',
  './js/step12-draw.v4.1.js',
  './js/step17-measures-instrumentos.js',
  './js/step16-measures-presets.v3.js',
  './js/step16-range-support.js',
  './js/step16-measures-toggle.js',
  './js/step19-project-plan.v7.js',
  './js/step18-persist-fallback.v3.js',
  './js/viewer.global.js',
  './js/login.js', // ok manter; o HTML do login é que não será cacheado

  // Ícones PWA
  './icon/icon-192.webp',
  './icon/icon-512.webp',
  './assets/logos/logo-luthierpro1.webp'
];

// Helper para limitar quantidade de imagens cacheadas
async function putWithTrim(cacheName, request, response, matchPrefixList = []) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());

  if (cacheName === RUNTIME_CACHE && matchPrefixList.length) {
    const keys = await cache.keys();
    const filtered = keys.filter(k => matchPrefixList.some(prefix => k.url.includes(prefix)));
    if (filtered.length > IMG_CACHE_MAX_ENTRIES) {
      const toDelete = filtered.slice(0, filtered.length - IMG_CACHE_MAX_ENTRIES);
      await Promise.all(toDelete.map(req => cache.delete(req)));
    }
  }
}

// INSTALL
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install v2.4.1');
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    for (const url of APP_SHELL) {
      try {
        await cache.add(url);
        console.log('[Service Worker] Cached:', url);
      } catch (err) {
        console.warn('[Service Worker] Falha ao adicionar no cache:', url, err);
      }
    }
    await self.skipWaiting();
  })());
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(n => ![SHELL_CACHE, RUNTIME_CACHE].includes(n))
        .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// FETCH
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições externas e POST
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // ⚠️ Nunca interceptar APIs (nem GET), para evitar cache em validação/licença
  if (url.pathname.startsWith('/api/')) return;

  // Navegação HTML
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    // login.html: rede sempre (sem cache) + fallback offline
    if (url.pathname.endsWith('/login.html') || url.pathname.endsWith('login.html')) {
      event.respondWith((async () => {
        try {
          return await fetch(request); // rede
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match('./offline.html')) || Response.error();
        }
      })());
      return;
    }

    // index.html e demais HTML: network-first com fallback ao cache (garante offline)
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const net = await fetch(request);
        // atualiza cache da página principal
        cache.put('./index.html', net.clone());
        return net;
      } catch {
        // offline: tenta cache do index ou offline.html
        return (await cache.match('./index.html'))
            || (await cache.match('./offline.html'))
            || Response.error();
      }
    })());
    return;
  }

  // CSS/JS/Manifest (cache first, atualiza em segundo plano)
  if (/\.(css|js|json|webmanifest|png|webp)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((net) => {
        cache.put(request, net.clone());
        return net;
      }).catch(() => null);
      return cached || fetchPromise || fetch(request);
    })());
    return;
  }

  // Imagens em /assets/
  const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  const isAsset = url.pathname.includes('/assets/');
  if (isImg && isAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const net = await fetch(request);
        await putWithTrim(RUNTIME_CACHE, request, net.clone(), ['/assets/']);
        return net;
      } catch {
        console.warn('[Service Worker] imagem offline → usando fallback');
        return await caches.match('./assets/fallback-image.png');
      }
    })());
    return;
  }

  // Outros arquivos (runtime cache-first)
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const net = await fetch(request);
      cache.put(request, net.clone());
      return net;
    } catch {
      const fallback = await caches.match('./offline.html');
      return fallback || Response.error();
    }
  })());
});
