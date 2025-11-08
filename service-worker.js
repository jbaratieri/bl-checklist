// service-worker.js — LuthierPro v2.4.3 (offline forte + login sem cache + ignora /api)
const CACHE_VERSION = 'luthierpro-v2.4.3';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`; // <-- assegura nome igual ao window.__RUNTIME_CACHE_NAME
const IMG_CACHE_MAX_ENTRIES = 300;

const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/fallback-image.png',
  './css/checklist.css',
  './css/images-thumbs.css',
  './css/context-bar.css',
  './css/project-header.css',
  './css/step12-draw.css',
  './css/responsive.css',
  './css/footer.css',
  './css/login.css',
  './js/checklist.js',
  './js/step2-toc.js',
  './js/step6-export.js',
  './js/step11-tech.js',
  './js/step9-instrument.js',
  './js/step15-instrument-badge.js',
  './js/step14-images-persist.v4.1.js',
  './js/step12-draw.v4.2.js',
  './js/step17-measures-instrumentos.js',
  './js/step16-measures-presets.v3.js',
  './js/step16-range-support.js',
  './js/step16-measures-toggle.js',
  './js/step19-project-plan.v7.js',
  './js/step18-persist-fallback.v3.js',
  './js/viewer.global.js',
  './js/login.js',
  './icon/icon-192.webp',
  './icon/icon-512.webp',
  './assets/logos/logo-luthierpro1.webp'
];

async function putWithTrim(cacheName, request, response, matchPrefixList = []) {
  const cache = await caches.open(cacheName);
  try {
    await cache.put(request, response.clone());
  } catch (e) {
    console.warn('[Service Worker] putWithTrim put failed', e);
  }

  if (cacheName === RUNTIME_CACHE && matchPrefixList.length) {
    try {
      const keys = await cache.keys();
      const filtered = keys.filter(k => matchPrefixList.some(prefix => k.url.includes(prefix)));
      if (filtered.length > IMG_CACHE_MAX_ENTRIES) {
        const toDelete = filtered.slice(0, filtered.length - IMG_CACHE_MAX_ENTRIES);
        await Promise.all(toDelete.map(req => cache.delete(req)));
      }
    } catch (e) {
      console.warn('[Service Worker] putWithTrim trim failed', e);
    }
  }
}

// INSTALL
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install', CACHE_VERSION);
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
    if (url.pathname.endsWith('/login.html') || url.pathname.endsWith('login.html')) {
      event.respondWith((async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match('./offline.html')) || Response.error();
        }
      })());
      return;
    }

    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const net = await fetch(request);
        cache.put('./index.html', net.clone());
        return net;
      } catch {
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

  // Imagens em /assets/ — com fallback para .webp quando disponível
  const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname);
  const isAsset = url.pathname.includes('/assets/');
  if (isImg && isAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);

      const isRequestedWebp = /\.webp$/i.test(url.pathname);
      const internalFlag = request.headers.get('x-sw-webp') === '1';

      if (!isRequestedWebp && !internalFlag) {
        try {
          const webpPath = url.pathname.replace(/\.(png|jpe?g|jpeg|svg)$/i, '.webp');
          const webpUrl = new URL(webpPath, self.location.origin).href;
          const cachedWebp = await cache.match(webpUrl);
          if (cachedWebp) {
            console.log('[Service Worker] Serve cached .webp for', url.pathname, '->', webpUrl);
            return cachedWebp;
          }

          try {
            const webpReq = new Request(webpUrl, {
              method: 'GET',
              headers: { 'x-sw-webp': '1' },
              mode: request.mode,
              credentials: request.credentials,
              redirect: 'follow'
            });
            const webpResp = await fetch(webpReq);
            if (webpResp && webpResp.ok) {
              console.log('[Service Worker] Fetched .webp for', url.pathname, '->', webpUrl);
              await putWithTrim(RUNTIME_CACHE, webpReq, webpResp.clone(), ['/assets/']);
              return webpResp;
            }
          } catch (e) {
            console.warn('[Service Worker] fetch .webp failed for', webpUrl, e);
          }
        } catch (e) {
          console.warn('[Service Worker] error generating webp path for', url.pathname, e);
        }
      }

      const cached = await cache.match(request);
      if (cached) {
        console.log('[Service Worker] Serve cached original for', url.pathname);
        return cached;
      }

      try {
        const net = await fetch(request);
        if (net && net.ok) {
          await putWithTrim(RUNTIME_CACHE, request, net.clone(), ['/assets/']);
          console.log('[Service Worker] Fetched original and cached for', url.pathname);
          return net;
        }
      } catch (e) {
        console.warn('[Service Worker] fetch original failed for', url.pathname, e);
      }

      console.warn('[Service Worker] imagem offline → usando fallback', url.pathname);
      const fallback = await caches.match('./assets/fallback-image.png');
      return fallback || Response.error();
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

// MESSAGE listener — receber notificações da página (ex.: restauração de backup)
self.addEventListener('message', (evt) => {
  try {
    const data = evt.data || {};
    if (data && data.type === 'BR_RESTORED') {
      console.log('[SW] BR_RESTORED received — broadcasting BR_DONE to clients');
      // notifica todos os clients que o restore foi concluído/registrado
      self.clients.matchAll().then(clients => {
        clients.forEach(c => {
          try { c.postMessage({ type: 'BR_DONE', meta: data.meta || null }); } catch(_) {}
        });
      });
      // opcional: poderíamos aqui acionar limpeza ou outra rotina
    }
  } catch (e) {
    console.warn('[SW] message handler error', e);
  }
});
