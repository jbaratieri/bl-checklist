// step1-toggle.js
(() => {
  'use strict';

  // === Toggle das seções inteiras ===
  document.addEventListener('click', e => {
    const header = e.target.closest('.section > header');
    if (!header) return;

    const section = header.parentElement;
    if (!section.classList.contains('section')) return;

    const isOpen = section.classList.contains('open');
    section.classList.toggle('open', !isOpen);

    // se quiser, pode expandir/recolher ícone aqui também
  });

  // === Toggle dos detalhes dentro das steps ===
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn.toggle');
    if (!btn) return;

    const targetId = btn.dataset.target;
    if (!targetId) return;

    const detail = document.getElementById(targetId);
    if (!detail) return;

    const isHidden = detail.hasAttribute('hidden');

    if (isHidden) {
      detail.removeAttribute('hidden');
      detail.style.display = 'block';
      btn.classList.add('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '−';
    } else {
      detail.setAttribute('hidden', '');
      detail.style.display = 'none';
      btn.classList.remove('active');
      const icon = btn.querySelector('.icon');
      if (icon) icon.textContent = '＋';
    }
  });

  // === Botões globais (expandir/recolher/limpar) ===
  document.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === 'expand-all') {
      document.querySelectorAll('.section').forEach(sec => sec.classList.add('open'));
    }

    if (action === 'collapse-all') {
      document.querySelectorAll('.section').forEach(sec => sec.classList.remove('open'));
    }

    if (action === 'clear-data') {
      if (confirm('Tem certeza que deseja limpar todos os dados?')) {
        localStorage.clear();
        location.reload();
      }
    }
  });
})();
