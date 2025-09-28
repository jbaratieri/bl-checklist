// step16-measures-toggle.js
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const isOpen = !grid.hidden;
    if (isOpen) {
      // Fechar
      grid.hidden = true;
      btn.classList.remove('active');
      btn.querySelector('.icon').textContent = '＋';
      console.log('[measures-toggle] FECHANDO →', targetId, grid);
    } else {
      // Abrir
      grid.hidden = false;
      btn.classList.add('active');
      btn.querySelector('.icon').textContent = '−';
      console.log('[measures-toggle] ABRINDO →', targetId, grid);
    }
  });

  // força iniciar fechado
  document.querySelectorAll('.measures-grid').forEach(g => g.hidden = true);
})();
