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
})();
