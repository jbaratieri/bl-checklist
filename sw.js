// sw.js — v2.2 (debug: runtime caching de imagens)
const CACHE_VERSION = 'bl-app-v2.2';
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  // CSS
  './css/main.css',
  './css/images-thumbs.css',
  './css/context-bar.css',
  // JS essenciais
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
  // Ícones
  './assets/icon-192.png',
  './assets/icon-512.png'
];

const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const SHELL_CACHE   = `shell-${CACHE_VERSION}`;
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

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => ![SHELL_CACHE, RUNTIME_CACHE].includes(n)).map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegação (HTML)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('./index.html', net.clone());
        return net;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('./index.html'))
            || (await cache.match('./offline.html'))
            || Response.error();
      }
    })());
    return;
  }

  // CSS/JS/Manifest
  if (/\.(css|js|json|webmanifest|png)$/.test(url.pathname)) {
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

  // Imagens de /assets/
  const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  const isAsset = url.pathname.includes('/assets/extras/albuns/') || url.pathname.includes('/assets/tech/');

  if (isImg && isAsset) {
    console.log('[SW] interceptando imagem:', url.pathname);
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      if (cached) {
        console.log('[SW] servindo do cache:', url.pathname);
        return cached;
      }

      try {
        const net = await fetch(request, { cache: 'no-store' });
        console.log('[SW] salvando no runtime:', url.pathname);
        await putWithTrim(RUNTIME_CACHE, request, net.clone(), ['/assets/extras/albuns/', '/assets/tech/']);
        return net;
      } catch {
        console.warn('[SW] falha ao buscar imagem:', url.pathname);
        return (await caches.match('./offline.html')) || Response.error();
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
