// FILE: js/sw-client.js — LuthierPro (ajustado: dynamic registration + logs + fallback)
(function () {
  'use strict';

  // atualize a query quando fizer deploy pra forçar fetch do service-worker.js novo
  const SW_URL = '/service-worker.js?v=20251111-v1';
  const BANNER_ID = 'sw-update-banner';

  if (!('serviceWorker' in navigator)) {
    console.log('[sw-client] serviceWorker não suportado neste navegador');
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
    // log básico
    try {
      console.log('[sw-client] watchRegistration — reg:', reg);
      if (reg.waiting) {
        console.log('[sw-client] reg.waiting detected on watchRegistration');
        showUpdateBanner(); // não passa reg aqui; handler buscará a registration atual dinamicamente
      }
    } catch (e) {
      console.warn('[sw-client] watchRegistration error', e);
    }

    // updatefound -> instalar nova SW
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      console.log('[sw-client] updatefound — installing:', !!newSW);
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        console.log('[sw-client] installing statechange ->', newSW.state);
        if (newSW.state === 'installed') {
          // se já existe controlador, então é uma atualização (waiting)
          if (navigator.serviceWorker.controller) {
            console.log('[sw-client] new SW installed and controller exists -> show banner');
            showUpdateBanner();
          } else {
            console.log('[sw-client] new SW installed but no controller -> first install (no banner)');
          }
        }
      });
    });

    // opcional: monitor periodicamente (pode desligar)
    // setInterval(() => reg.update(), 1000 * 60 * 30);
  }

  // showUpdateBanner — não depende de uma registration "presa"; handler verifica dinamicamente no clique
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
        // pega a registration mais atual possível no momento do clique
        const reg = await navigator.serviceWorker.getRegistration();
        console.log('[sw-client] click Atualizar — current registration:', reg);

        if (!reg) {
          console.warn('[sw-client] no registration found on click');
          return;
        }

        // se não houver waiting, tenta forçar um update (pode criar installing -> waiting)
        if (!reg.waiting) {
          console.warn('[sw-client] no waiting SW at click; calling reg.update() to try to fetch new SW');
          try { await reg.update(); } catch (err) { console.warn('[sw-client] reg.update() failed', err); }
        }

        // re-check
        const regAfter = await navigator.serviceWorker.getRegistration();
        if (!(regAfter && regAfter.waiting)) {
          console.warn('[sw-client] still no waiting SW after update(); nothing to activate at this moment');
          // opcional: informar usuário
          btnReload.disabled = true;
          btnReload.textContent = 'Sem atualização no momento';
          setTimeout(() => {
            try { banner.remove(); } catch (_) {}
          }, 2500);
          return;
        }

        // existe waiting — envia SKIP_WAITING
        btnReload.disabled = true;
        btnReload.textContent = 'Aplicando...';
        console.log('[sw-client] sending SKIP_WAITING to waiting sw');
        regAfter.waiting.postMessage({ type: 'SKIP_WAITING' });

        // aguarda controllerchange para recarregar — 1 reload apenas
        let reloaded = false;
        function onController() {
          if (reloaded) return;
          reloaded = true;
          console.log('[sw-client] controllerchange detected — reloading page');
          window.location.reload();
        }
        navigator.serviceWorker.addEventListener('controllerchange', onController);

        // fallback: se nada acontecer em 7s, forçar reload mesmo assim
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

  // registrar logo que o script carrega
  registerSW();
})();
