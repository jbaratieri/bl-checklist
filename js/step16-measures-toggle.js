// step16-measures-toggle.js — Toggle de MEDIDAS (botão retangular ＋ Medidas / − Medidas)
(() => {
  'use strict';

  function toggleMeasures(btn) {
    const targetId = btn.dataset.target;
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const isHidden = grid.hasAttribute('hidden');
    if (isHidden) {
      grid.removeAttribute('hidden');
      grid.style.display = 'grid';
      btn.classList.add('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '−';
    } else {
      grid.setAttribute('hidden', '');
      grid.style.display = 'none';
      btn.classList.remove('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '＋';
    }
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;
    toggleMeasures(btn);
  });
})();
