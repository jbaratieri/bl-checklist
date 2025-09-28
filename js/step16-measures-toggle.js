// step16-measures-toggle.js
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('button.measures-toggle');
    if (!btn) return;

    const targetId = btn.getAttribute('data-target');
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const icon = btn.querySelector('.icon');

    // estado REAL: considera atributo hidden e estilo inline
    const isHidden = grid.hasAttribute('hidden') || grid.style.display === 'none';
    console.log('[measures-toggle] Estado real =', isHidden, '→ target:', targetId);

    if (isHidden) {
      grid.removeAttribute('hidden');  // remove o atributo
      grid.style.display = 'grid';     // garante exibição
      btn.classList.add('active');
      if (icon) icon.textContent = '−';
      console.log('[measures-toggle] ABERTO:', targetId);
    } else {
      grid.setAttribute('hidden', ''); // recoloca o atributo
      grid.style.display = 'none';     // esconde
      btn.classList.remove('active');
      if (icon) icon.textContent = '＋';
      console.log('[measures-toggle] FECHADO:', targetId);
    }
  });
})();
