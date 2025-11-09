// FILE: js/footer.js
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', initFooter);
  function initFooter() {
    document.body.addEventListener('click', (e) => {
      const mOpen = e.target.closest('[data-modal]');
      if (mOpen) { e.preventDefault(); openModal(mOpen.getAttribute('data-modal')); return; }
      const mClose = e.target.closest('[data-modal-close]');
      if (mClose) { e.preventDefault(); closeModal(mClose.getAttribute('data-modal-close')); return; }
    });
    window.openModal = function (id) {
      const modal = document.getElementById(id); if (!modal) return;
      modal.setAttribute('aria-hidden', 'false'); modal.style.display = 'flex';
    };
    window.closeModal = function (id) {
      const modal = document.getElementById(id); if (!modal) return;
      modal.setAttribute('aria-hidden', 'true'); modal.style.display = 'none';
    };
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (ev) => { if (ev.target === m) closeModal(m.id); });
    });
    let deferredPrompt = null;
    const btnInstall = document.getElementById('btnInstall');
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (btnInstall) btnInstall.hidden = false; });
    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        btnInstall.hidden = true; if (!deferredPrompt) return; deferredPrompt.prompt();
        try { const choice = await deferredPrompt.userChoice; console.log('PWA prompt choice:', choice); } catch(e){}
        deferredPrompt = null;
      });
    }
    window.addEventListener('appinstalled', () => { if (btnInstall) btnInstall.hidden = true; console.log('App installed'); });
    const licenseEl = document.getElementById('licenseStatus');
    if (licenseEl) licenseEl.addEventListener('click', () => { if (document.getElementById('modalContato')) openModal('modalContato'); else console.log('licenseStatus clicked'); });
  }

  // footer.js — intercepta botão Manual e abre num modal in-page (opcional)
(function(){
  const btn = document.getElementById('btnManual');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    // se quiser abrir em nova aba, deixe o comportamento default (não previnir)
    // para abrir in-page, previna e carregue manual.html
    e.preventDefault();
    try {
      const res = await fetch(btn.href);
      const html = await res.text();
      // crie/injete modal simples
      let m = document.getElementById('manualModal');
      if (!m) {
        m = document.createElement('div'); m.id = 'manualModal'; m.className='modal'; m.setAttribute('aria-hidden','false');
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99999;padding:12px';
        const dialog = document.createElement('div'); dialog.className='modal-dialog'; dialog.style.cssText='width:100%;max-width:900px;height:90%;overflow:auto;background:#fff;border-radius:10px;padding:12px';
        const close = document.createElement('button'); close.textContent='Fechar'; close.className='btn-close'; close.style.cssText='position:sticky;top:8px;float:right';
        close.addEventListener('click', ()=>m.remove());
        dialog.appendChild(close);
        m.appendChild(dialog);
        document.body.appendChild(m);
      }
      m.querySelector('.modal-dialog').innerHTML = '<button class="btn-close" style="float:right">Fechar</button>' + html;
      m.querySelector('.btn-close').addEventListener('click', ()=>m.remove());
    } catch (err) { console.error('Erro ao abrir manual', err); window.open(btn.href, '_blank'); }
  });
})();

})();
