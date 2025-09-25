// sw.js — v1.2 (corrige fallback offline para index.html)
const CACHE_VERSION = 'bl-app-v1.2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  // CSS
  './css/main.css',
  './css/images-thumbs.css',
  './css/context-bar.css',
  // JS principais
  './js/checklist.js',
  './js/step1-toggle.js',
  './js/step2-toc.js',
  './js/step6-export.js',
  './js/step11-tech.js',
  './js/step9-instrument-bus.js',
  './js/step21-project-bus.js',
  './js/step21-project-unique.js',
  './js/step23-media-context.js',
  './js/step9-instrument.js',
  './js/step15-instrument-badge.js',
  './js/viewer.global.js',
  './js/step14-images-persist.v4.1.js',
  './js/load-assets.patch.js',
  './js/step12-draw.v4.1.js',
  './js/step17-measures-instrumentos.js',
  './js/step16-measures-presets.js',
  './js/step16-range-support.js',
  './js/step19-project-plan.v2.js',
  './js/step19-plan-toggle.js',
  './js/step20-context-bar.js',
  './js/step18-persist-fallback.v3.js',
  // Ícones PWA
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/Logotipo.svg'
];

const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const SHELL_CACHE   = `shell-${CACHE_VERSION}`;

// limite de imagens em cache runtime
const IMG_CACHE_MAX_ENTRIES = 300;

// Helpers
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

// Instalação: pré-cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpa versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => ![SHELL_CACHE, RUNTIME_CACHE].includes(n))
           .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 1) Navegação/HTML → network-first, fallback cache
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const net = await fetch(request);
        cache.put('/index.html', net.clone()); // salva com caminho absoluto
        return net;
      } catch {
        return (await cache.match('/index.html')) 
            || (await cache.match('./index.html')) 
            || Response.error();
      }
    })());
    return;
  }

  // 2) CSS/JS/manifest/ícones → stale-while-revalidate
  if (/\.(css|js|json|webmanifest|png|svg)$/.test(url.pathname)) {
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

  // 3) Imagens de álbuns/tech → cache-first com limite
  const isAlbumImg = url.pathname.includes('/assets/extras/albuns/');
  const isTechImg  = url.pathname.includes('/assets/tech/');
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname) && (isAlbumImg || isTechImg)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const net = await fetch(request, { cache: 'no-store' });
        await putWithTrim(
          RUNTIME_CACHE,
          request,
          net.clone(),
          ['/assets/extras/albuns/', '/assets/tech/']
        );
        return net;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 4) Outros → cache-first
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const net = await fetch(request);
      cache.put(request, net.clone());
      return net;
    } catch {
      return cached || Response.error();
    }
  })());
});
