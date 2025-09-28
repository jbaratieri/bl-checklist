// step1-toggle.js
(() => {
  'use strict';

  // Toggle de SEÇÕES (abre/fecha o corpo da seção)
  document.addEventListener('click', e => {
    const header = e.target.closest('.section > header');
    if (!header) return;

    const section = header.parentElement;
    section.classList.toggle('open');
  });

  // Toggle de DETALHES (＋/−)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const detail = document.getElementById(targetId);
    if (!detail) return;

    const isHidden = detail.hasAttribute('hidden');
    const icon = btn.querySelector('.icon');

    if (isHidden) {
      detail.removeAttribute('hidden');
      btn.classList.add('active');
      if (icon) icon.textContent = '−';
    } else {
      detail.setAttribute('hidden', '');
      btn.classList.remove('active');
      if (icon) icon.textContent = '＋';
    }
  });
})();
