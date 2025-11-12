// FILE: js/sw-client.js
(function () {
  'use strict';

  const SW_URL = '/service-worker.js?v=20251111'; // ajuste a query se necessário no deploy
  const BANNER_ID = 'sw-update-banner';

  if (!('serviceWorker' in navigator)) return;

  async function registerSW() {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL);
      watchRegistration(reg);
    } catch (err) {
      console.warn('[sw-client] registration failed', err);
    }
  }

  function watchRegistration(reg) {
    // se já existe waiting SW no registro (por exemplo, SW novo já instalado)
    if (reg.waiting) {
      showUpdateBanner(reg);
    }

    // quando uma nova instalação é detectada
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          // nova versão instalada e outra SW está controlando -> notificar usuário
          showUpdateBanner(reg);
        }
      });
    });

    // opcional: checar periodicamente (não obrigatório)
    // setInterval(() => reg.update(), 1000 * 60 * 30); // check a cada 30min
  }

  // Cria e exibe um banner simples no canto inferior
  function showUpdateBanner(registration) {
    if (document.getElementById(BANNER_ID)) return; // já existe

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
    btnReload.addEventListener('click', () => {
      // envia mensagem para pedir skipWaiting()
      if (!registration || !registration.waiting) {
        console.warn('[sw-client] no waiting SW to activate');
        return;
      }
      // desabilita botão pra evitar cliques repetidos
      btnReload.disabled = true;
      btnReload.textContent = 'Aplicando...';
      // envia SKIP_WAITING
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Quando controllerchange ocorrer, recarrega
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    btnClose.style.cssText = 'background:transparent;border:1px solid #ddd;padding:6px 10px;border-radius:8px;cursor:pointer;margin-left:8px';
    btnClose.addEventListener('click', () => banner.remove());

    actions.appendChild(btnReload);
    actions.appendChild(btnClose);
    banner.appendChild(actions);

    document.body.appendChild(banner);
  }

  // registrar logo que o script carrega
  registerSW();
})();
