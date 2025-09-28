// step16-measures-toggle.js (debug)
(() => {
  'use strict';

  console.log('[measures-toggle] Script carregado ✅');

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    console.log('[measures-toggle] Clique detectado no botão:', btn);

    const targetId = btn.dataset.target;
    console.log('[measures-toggle] data-target =', targetId);

    const grid = document.getElementById(targetId);
    if (!grid) {
      console.warn('[measures-toggle] Nenhum grid encontrado com id', targetId);
      return;
    }

    const isHidden = grid.hasAttribute('hidden');
    console.log('[measures-toggle] Estado atual → hidden?', isHidden);

    if (isHidden) {
      grid.removeAttribute('hidden');
      btn.classList.add('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '−';
      console.log('[measures-toggle] Grid ABERTO:', grid);
    } else {
      grid.setAttribute('hidden', '');
      btn.classList.remove('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '＋';
      console.log('[measures-toggle] Grid FECHADO:', grid);
    }
  });
})();

