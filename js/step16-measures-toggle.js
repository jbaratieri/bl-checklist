// step16-measures-toggle.js — abre/fecha blocos de medidas
(() => {
  'use strict';

  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const $  = (s, c = document) => c.querySelector(s);

  function toggleBlock(btn) {
    const targetId = btn.dataset.target;
    const block = document.getElementById(targetId);
    if (!block) return;

    const isHidden = block.hasAttribute('hidden');
    if (isHidden) {
      block.removeAttribute('hidden');
      btn.classList.add('active');
      const icon = $('.icon', btn);
      if (icon) icon.textContent = '－';
    } else {
      block.setAttribute('hidden', '');
      btn.classList.remove('active');
      const icon = $('.icon', btn);
      if (icon) icon.textContent = '＋';
    }
  }

  function init() {
    $$('.btn.measures-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleBlock(btn));
      // força iniciar fechado
      const block = document.getElementById(btn.dataset.target);
      if (block) block.setAttribute('hidden', '');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
