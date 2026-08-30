// `step16-measures-toggle.js`: controla abrir/recolher grades de medidas por botao.
// Troca icone e legenda dinamicamente para indicar estado visivel/oculto.
// Atenção: depende de `data-target` apontando para um elemento existente.
// Opcionais: `data-label` e `data-icon` no botao (padrao: Medidas / 📏).
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
    const collapsedLabel = btn.dataset.label || 'Medidas';
    const collapsedIcon = btn.dataset.icon || '📏';
    const isHidden = grid.hasAttribute('hidden');

    if (isHidden) {
      grid.removeAttribute('hidden');
      if (grid.classList.contains('measures-grid')) {
        grid.style.display = 'grid';
      } else {
        grid.style.removeProperty('display');
      }
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
      if (icon)  icon.textContent  = '🔽';
      if (label) label.textContent = 'Recolher';
    } else {
      grid.setAttribute('hidden', '');
      grid.style.display = 'none';
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
      if (icon)  icon.textContent  = collapsedIcon;
      if (label) label.textContent = collapsedLabel;
    }
  });
})();
