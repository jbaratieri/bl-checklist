// sw.js — v2.3.2 com fallback offline (HTML + imagens)
const CACHE_VERSION = 'bl-app-v2.3.2';
const APP_SHELL = [
  '/bl-checklist/',
  '/bl-checklist/index.html',
  '/bl-checklist/offline.html',
  '/bl-checklist/manifest.webmanifest',
  // Ícone fallback p/ imagens
  '/bl-checklist/assets/fallback-image.png',
  // CSS principais (revise se todos existem)
  '/bl-checklist/css/checklist.css',
  '/bl-checklist/css/images-thumbs.css',
  '/bl-checklist/css/context-bar.css',
  '/bl-checklist/css/project-header.css',
  // JS essenciais (revise se todos existem)
  '/bl-checklist/js/checklist.js',
  '/bl-checklist/js/step1-toggle.js',
  '/bl-checklist/js/step2-toc.js',
  '/bl-checklist/js/step6-export.js',
  '/bl-checklist/js/step11-tech.js',
  '/bl-checklist/js/step9-instrument.js',
  '/bl-checklist/js/step15-instrument-badge.js',
  '/bl-checklist/js/step14-images-persist.v4.1.js',
  '/bl-checklist/js/step12-draw.v4.1.js',
  '/bl-checklist/js/step17-measures-instrumentos.js',
  '/bl-checklist/js/step16-measures-presets.js',
  '/bl-checklist/js/step16-range-support.js',
  '/bl-checklist/js/step19-project-plan.v2.js',
  '/bl-checklist/js/step19-plan-toggle.js',
  '/bl-checklist/js/step20-context-bar.js',
  '/bl-checklist/js/step18-persist-fallback.v3.js',
  '/bl-checklist/js/viewer.global.js',
  // Ícones PWA
  '/bl-checklist/icons/icon-192.png',
  '/bl-checklist/icons/icon-512.png'

];

const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
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

// Install (resiliente)
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    for (const url of APP_SHELL) {
      try {
        await cache.add(url);
        console.log('[SW] Cached:', url);
      } catch (err) {
        console.warn('[SW] Falha ao adicionar no cache:', url, err);
      }
    }
    await self.skipWaiting();
  })());
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
        cache.put(request, net.clone());
        return net;
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(request))
          || (await cache.match('/bl-checklist/offline.html'))
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

  // Imagens (qualquer coisa em /assets/)
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
        console.warn('[SW] imagem offline → usando fallback');
        return await caches.match('/bl-checklist/assets/fallback-image.png');
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
      return (await caches.match('/bl-checklist/offline.html')) || Response.error();
    }
  })());
});
