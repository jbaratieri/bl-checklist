// sw.js — v2.3 corrigido para GitHub Pages
const CACHE_VERSION = 'bl-app-v2.3';
const APP_SHELL = [
  '/bl-checklist/',
  '/bl-checklist/index.html',
  '/bl-checklist/offline.html',
  '/bl-checklist/manifest.webmanifest',
  // CSS
  '/bl-checklist/css/main.css',
  '/bl-checklist/css/images-thumbs.css',
  '/bl-checklist/css/context-bar.css',
  // JS essenciais
  '/bl-checklist/js/checklist.js',
  '/bl-checklist/js/step1-toggle.js',
  '/bl-checklist/js/step2-toc.js',
  '/bl-checklist/js/step6-export.js',
  '/bl-checklist/js/step11-tech.js',
  '/bl-checklist/js/step9-instrument-bus.js',
  '/bl-checklist/js/step21-project-bus.js',
  '/bl-checklist/js/step21-project-unique.js',
  '/bl-checklist/js/step23-media-context.js',
  '/bl-checklist/js/step9-instrument.js',
  '/bl-checklist/js/step15-instrument-badge.js',
  '/bl-checklist/js/viewer.global.js',
  '/bl-checklist/js/step14-images-persist.v4.1.js',
  '/bl-checklist/js/load-assets.patch.js',
  '/bl-checklist/js/step12-draw.v4.1.js',
  '/bl-checklist/js/step17-measures-instrumentos.js',
  '/bl-checklist/js/step16-measures-presets.js',
  '/bl-checklist/js/step16-range-support.js',
  '/bl-checklist/js/step19-project-plan.v2.js',
  '/bl-checklist/js/step19-plan-toggle.js',
  '/bl-checklist/js/step20-context-bar.js',
  '/bl-checklist/js/step18-persist-fallback.v3.js',
  // Ícones
  '/bl-checklist/assets/icon-192.png',
  '/bl-checklist/assets/icon-512.png'
];

const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const SHELL_CACHE   = `shell-${CACHE_VERSION}`;
const IMG_CACHE_MAX_ENTRIES = 300;

// ===== Helpers =====
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

// ===== Install =====
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Falha no addAll:', err))
  );
});

// ===== Activate =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => ![SHELL_CACHE, RUNTIME_CACHE].includes(n))
           .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// ===== Fetch =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegação (HTML) → network-first
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('/bl-checklist/index.html', net.clone());
        return net;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/bl-checklist/index.html'))
            || (await cache.match('/bl-checklist/offline.html'))
            || Response.error();
      }
    })());
    return;
  }

  // CSS / JS / Manifest → stale-while-revalidate
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

  // Imagens (albuns/tech) → cache-first com trim
  const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  const isAsset = url.pathname.includes('/assets/extras/albuns/') ||
                  url.pathname.includes('/assets/tech/');

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
        await putWithTrim(RUNTIME_CACHE, request, net.clone(),
          ['/assets/extras/albuns/', '/assets/tech/']);
        return net;
      } catch {
        console.warn('[SW] falha ao buscar imagem:', url.pathname);
        return (await caches.match('/bl-checklist/offline.html')) || Response.error();
      }
    })());
    return;
  }

  // Outros → cache-first
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const net = await fetch(request);
      cache.put(request, net.clone());
      return net;
    } catch {
      return (await caches.match('/bl-checklist/offline.html')) || Response.error();
    }
  })());
});
