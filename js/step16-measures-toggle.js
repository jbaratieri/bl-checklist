// step16-measures-toggle.js — versão limpa e robusta
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const grid = document.getElementById(targetId);
    if (!grid) {
      console.warn('[measures-toggle] Grid não encontrado para', targetId);
      return;
    }

    const icon = btn.querySelector('.icon');
    const isHidden = grid.hasAttribute('hidden') || grid.style.display === 'none';

    if (isHidden) {
      // --- Abrir ---
      grid.removeAttribute('hidden');
      grid.style.display = 'grid';
      btn.classList.add('active');
      if (icon) icon.textContent = '−';
      console.log('[measures-toggle] ABRINDO →', targetId, grid);
    } else {
      // --- Fechar ---
      grid.setAttribute('hidden', '');
      grid.style.display = 'none';
      btn.classList.remove('active');
      if (icon) icon.textContent = '＋';
      console.log('[measures-toggle] FECHANDO →', targetId, grid);
    }
  });
})();
