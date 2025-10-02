// step16-measures-toggle.js — toggle com ícone 📏/🔽 e legenda dinâmica
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const icon  = btn.querySelector('.icon');
    const label = btn.querySelector('.label');
    const isHidden = grid.hasAttribute('hidden');

    if (isHidden) {
      grid.removeAttribute('hidden');
      grid.style.display = 'grid'; // garante layout correto
      btn.classList.add('active');
      if (icon)  icon.textContent  = '🔽';
      if (label) label.textContent = 'Recolher';
    } else {
      grid.setAttribute('hidden', '');
      grid.style.display = 'none';
      btn.classList.remove('active');
      if (icon)  icon.textContent  = '📏';
      if (label) label.textContent = 'Medidas';
    }
  });
})();
