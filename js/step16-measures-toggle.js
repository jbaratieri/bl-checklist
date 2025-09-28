/* step16-measures-toggle.js — abre/fecha blocos de medidas */
(function(){
  'use strict';

  document.addEventListener('click', function(e){
    const btn = e.target.closest('.btn.measures-toggle');
    if (!btn) return;

    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;

    const grid = document.getElementById(targetId);
    if (!grid) return;

    // alterna visibilidade
    const isHidden = grid.hasAttribute('hidden');
    if (isHidden) {
      grid.removeAttribute('hidden');
      btn.classList.add('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '−';
    } else {
      grid.setAttribute('hidden', '');
      btn.classList.remove('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '＋';
    }
  });
})();
