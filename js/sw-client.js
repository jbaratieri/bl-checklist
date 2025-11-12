// FILE: js/sw-client.js — LuthierPro (updated: dynamic registration, logs, only show banner when waiting)
(function () {
  'use strict';

  // Update this query on each deploy to force fetching a new service-worker.js
  const SW_URL = '/service-worker.js?v=20251112';
  const BANNER_ID = 'sw-update-banner';

  if (!('serviceWorker' in navigator)) {
    console.log('[sw-client] serviceWorker not supported in this browser');
    return;
  }

  async function registerSW() {
    try {
      console.log('[sw-client] registering', SW_URL);
      const reg = await navigator.serviceWorker.register(SW_URL);
      console.log('[sw-client] registered:', reg.scope, 'active:', !!reg.active, 'waiting:', !!reg.waiting);
      watchRegistration(reg);
    } catch (err) {
      console.warn('[sw-client] registration failed', err);
    }
  }

  function watchRegistration(reg) {
    try {
      console.log('[sw-client] watchRegistration — reg:', reg);
      // If there's already a waiting SW, show banner
      if (reg.waiting) {
        console.log('[sw-client] reg.waiting detected on watchRegistration');
        showUpdateBanner(); // showUpdateBanner will check dynamic registration on click
      }
    } catch (e) {
      console.warn('[sw-client] watchRegistration error', e);
    }

    // Listen for new installing SWs
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      console.log('[sw-client] updatefound — installing:', !!newSW);
      if (!newSW) return;
      newSW.addEventListener('statechange', async () => {
        console.log('[sw-client] installing statechange ->', newSW.state);
        if (newSW.state === 'installed') {
          // Re-check registration to avoid stale objects
          try {
            const r = await navigator.serviceWorker.getRegistration();
            if (r && r.waiting) {
              console.log('[sw-client] new SW installed and waiting exists -> show banner');
              showUpdateBanner();
              return;
            }
            // If there's no waiting, SW probably activated quickly. Show a subtle toast.
            console.log('[sw-client] new SW installed but no waiting (activated quickly). No banner needed.');
            const toast = document.createElement('div');
            toast.textContent = 'Nova versão aplicada.';
            toast.style.cssText = 'position:fixed;bottom:20px;left:20px;background:#222;color:#fff;padding:8px 12px;border-radius:8px;z-index:99999;font-family:system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
            document.body.appendChild(toast);
            setTimeout(()=>toast.remove(), 2500);
          } catch (err) {
            console.warn('[sw-client] error re-checking registration', err);
          }
        }
      });
    });
  }

  function showUpdateBanner() {
    if (document.getElementById(BANNER_ID)) {
      console.log('[sw-client] banner already shown');
      return;
    }

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.style.cssText = [
      'position:fixed',
      'left:12px',
      'right:12px',
      'bottom:18px',
      'z-index:999999',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'padding:10px 12px',
      'background:#fff',
      'border:1px solid #ddd',
      'border-radius:10px',
      'box-shadow:0 8px 30px rgba(0,0,0,0.12)',
      'font-family:system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      'font-size:14px'
    ].join(';');

    const msg = document.createElement('div');
    msg.textContent = 'Nova versão disponível.';
    banner.appendChild(msg);

    const actions = document.createElement('div');

    const btnReload = document.createElement('button');
    btnReload.textContent = 'Atualizar agora';
    btnReload.style.cssText = 'background:#8a623f;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:600';
    btnReload.addEventListener('click', async () => {
      try {
        console.log('[sw-client] click Atualizar — attempting dynamic registration check');
        // fetch the most up-to-date registration
        const reg = await navigator.serviceWorker.getRegistration();
        console.log('[sw-client] click Atualizar — current registration:', reg);

        if (!reg) {
          console.warn('[sw-client] no registration found on click');
          btnReload.disabled = true;
          btnReload.textContent = 'Sem registro';
          setTimeout(()=>banner.remove(), 2500);
          return;
        }

        // If no waiting, try to force update which may create installing -> waiting
        if (!reg.waiting) {
          console.warn('[sw-client] no waiting SW at click; calling reg.update() to try to fetch new SW');
          try { await reg.update(); } catch (err) { console.warn('[sw-client] reg.update() failed', err); }
        }

        // Re-check registration after update attempt
        const regAfter = await navigator.serviceWorker.getRegistration();
        if (!(regAfter && regAfter.waiting)) {
          console.warn('[sw-client] still no waiting SW after update(); nothing to activate at this moment');
          btnReload.disabled = true;
          btnReload.textContent = 'Sem atualização no momento';
          setTimeout(() => { try { banner.remove(); } catch (_) {} }, 2000);
          return;
        }

        // There is a waiting SW - ask it to skipWaiting
        btnReload.disabled = true;
        btnReload.textContent = 'Aplicando...';
        console.log('[sw-client] sending SKIP_WAITING to waiting sw');
        regAfter.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Handle controllerchange once and reload page
        let reloaded = false;
        function onController() {
          if (reloaded) return;
          reloaded = true;
          console.log('[sw-client] controllerchange detected — reloading page');
          window.location.reload();
        }
        navigator.serviceWorker.addEventListener('controllerchange', onController);

        // fallback: if nothing happens in 7s, force reload
        setTimeout(() => {
          if (!reloaded) {
            console.warn('[sw-client] controllerchange timeout — forcing reload');
            window.location.reload();
          }
        }, 7000);

      } catch (err) {
        console.warn('[sw-client] erro no click atualizar', err);
      }
    });

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    btnClose.style.cssText = 'background:transparent;border:1px solid #ddd;padding:6px 10px;border-radius:8px;cursor:pointer;margin-left:8px';
    btnClose.addEventListener('click', () => banner.remove());

    actions.appendChild(btnReload);
    actions.appendChild(btnClose);
    banner.appendChild(actions);

    document.body.appendChild(banner);
    console.log('[sw-client] update banner shown');
  }

  // register the service worker
  registerSW();
})();