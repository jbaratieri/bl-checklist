// step16-measures-toggle.js
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const isOpen = btn.classList.toggle('active');
    grid.hidden = !isOpen;

    const icon = btn.querySelector('.icon');
    if (icon) icon.textContent = isOpen ? '−' : '＋';

    console.log('[measures-toggle]', targetId, '→', isOpen ? 'ABERTO' : 'FECHADO');
  });

  // inicia fechado
  document.querySelectorAll('.measures-grid').forEach(g => g.hidden = true);
})();
