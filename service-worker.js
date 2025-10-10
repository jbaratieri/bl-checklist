// service-worker.js — LuthierPro v2.3.9
const CACHE_VERSION = 'luthierpro-v2.3.9';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMG_CACHE_MAX_ENTRIES = 300;

const APP_SHELL = [
  './',
  './index.html',
  './login.html',
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
  './src/js/checklist.js',
  './src/js/step2-toc.js',
  './src/js/step6-export.js',
  './src/js/step11-tech.js',
  './src/js/step9-instrument.js',
  './src/js/step15-instrument-badge.js',
  './src/js/step14-images-persist.v4.1.js',
  './src/js/step12-draw.v4.1.js',
  './src/js/step17-measures-instrumentos.js',
  './src/js/step16-measures-presets.v3.js',
  './src/js/step16-range-support.js',
  './src/js/step16-measures-toggle.js',
  './src/js/step19-project-plan.v7.js',
  './src/js/step18-persist-fallback.v3.js',
  './src/js/viewer.global.js',
  './src/js/login.js',

  // Ícones PWA
  './icon/icon-192.webp',
  './icon/icon-512.webp'
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
  console.log('[Service Worker] Install v2.3.9');
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
    await Promise.all(names.filter(n => ![SHELL_CACHE, RUNTIME_CACHE].includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// FETCH
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições externas e POST
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegação HTML
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, net.clone());
        return net;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(request))
            || (await cache.match('./offline.html'))
            || Response.error();
      }
    })());
    return;
  }

  // CSS/JS/Manifest
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

  // Outros arquivos
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const net = await fetch(request);
      cache.put(request, net.clone());
      return net;
    } catch {
      return (await caches.match('./offline.html')) || Response.error();
    }
  })());
});
