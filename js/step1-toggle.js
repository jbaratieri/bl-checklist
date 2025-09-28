// step1-toggle.js — controla abrir/fechar detalhes com hidden
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    const detailBox = document.getElementById(targetId);
    if (!detailBox) return;

    // Alterna estado
    const isHidden = detailBox.hasAttribute('hidden');
    if (isHidden) {
      detailBox.removeAttribute('hidden');
      btn.classList.add('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '−';
    } else {
      detailBox.setAttribute('hidden', '');
      btn.classList.remove('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '＋';
    }
  });
})();
