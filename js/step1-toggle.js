// step1-toggle.js — Toggle de DETALHES (botão redondo ＋/−)
(() => {
  'use strict';

  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function toggleDetail(btn) {
    const targetId = btn.dataset.target;
    const detail = document.getElementById(targetId);
    if (!detail) return;

    const isHidden = detail.hasAttribute('hidden');
    if (isHidden) {
      detail.removeAttribute('hidden');
      btn.classList.add('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '−';
    } else {
      detail.setAttribute('hidden', '');
      btn.classList.remove('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '＋';
    }
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.toggle');
    if (!btn) return;

    // Evita interferir nos botões de medidas
    if (btn.classList.contains('measures-toggle')) return;

    toggleDetail(btn);
  });
})();
