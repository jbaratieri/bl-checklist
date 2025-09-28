// step16-measures-toggle.js
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const icon = btn.querySelector('.icon');

    if (grid.hasAttribute('hidden')) {
      grid.removeAttribute('hidden');
      btn.classList.add('active');
      if (icon) icon.textContent = '−';
    } else {
      grid.setAttribute('hidden', '');
      btn.classList.remove('active');
      if (icon) icon.textContent = '＋';
    }
  });
})();
