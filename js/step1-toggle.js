/* step1-toggle.js — Toggle seções e medidas */
(function(){
  'use strict';

  const HEADER_SECTION_CANDIDATES = 'h3, header, .section-header';
  const HEADER_ETAPA_CANDIDATES   = '.etapa-header';
  const BODY_SECTION              = '.section-body';
  const BODY_ETAPA                = '.etapa-body';
  const OPEN_CLASS                = 'is-open';

  // util: encontra o PRIMEIRO filho direto que corresponda
  function findDirect(container, csv) {
    const sels = csv.split(',').map(s => s.trim()).filter(Boolean);
    for (const s of sels) {
      const el = container.querySelector(`:scope > ${s}`);
      if (el) return el;
    }
    return null;
  }

  function ensureA11y(header, container, body) {
    if (!body.id) body.id = (container.id ? container.id + '__body' : 'body-' + Math.random().toString(36).slice(2));
    header.setAttribute('role','button');
    header.setAttribute('tabindex','0');
    header.setAttribute('aria-controls', body.id);
    const startOpen = container.classList.contains(OPEN_CLASS) || header.getAttribute('aria-expanded') === 'true';
    container.classList.toggle(OPEN_CLASS, !!startOpen);
    header.setAttribute('aria-expanded', String(!!startOpen));
  }

  function initOnce(root=document){
    root.querySelectorAll('div.section, section.etapa').forEach(container => {
      const header = findDirect(container, container.matches('.section') ? HEADER_SECTION_CANDIDATES : HEADER_ETAPA_CANDIDATES);
      const body   = findDirect(container, container.matches('.section') ? BODY_SECTION : BODY_ETAPA);
      if (!header || !body) return;
      if (header.dataset.blA11y) return;
      ensureA11y(header, container, body);
      header.dataset.blA11y = '1';
    });
  }

  function toggleContainer(container, header){
    const open = !container.classList.contains(OPEN_CLASS);
    container.classList.toggle(OPEN_CLASS, open);
    if (header) header.setAttribute('aria-expanded', String(open));
  }

  // === Toggle para seções/etapas ===
  document.addEventListener('click', function(e){
    const hdr = e.target.closest('h3, header, .section-header, .etapa-header');
    if (!hdr) return;

    // ignora controles dentro do header
    if (e.target !== hdr && e.target.closest('button,a,input,select,textarea,[role="button"],.btn,[data-target]')) return;

    const container = hdr.closest('.section, .etapa');
    if (!container) return;
    const mustBe = container.matches('.section') ? findDirect(container, HEADER_SECTION_CANDIDATES) : findDirect(container, HEADER_ETAPA_CANDIDATES);
    if (mustBe !== hdr) return;

    e.preventDefault();
    toggleContainer(container, hdr);
  }, true);

  // === Toggle para MEDIDAS ===
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn.toggle');
    if (!btn) return;

    const targetId = btn.getAttribute('data-target');
    const grid = document.getElementById(targetId);
    if (!grid) return;

    const isHidden = grid.hasAttribute('hidden');
    if (isHidden) {
      grid.removeAttribute('hidden');
      btn.classList.add('active');
      btn.querySelector('.icon').textContent = '−';
    } else {
      grid.setAttribute('hidden', '');
      btn.classList.remove('active');
      btn.querySelector('.icon').textContent = '＋';
    }
  });

  // === Teclado (Enter/Espaço) nas seções ===
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const hdr = e.target.closest('h3, header, .section-header, .etapa-header');
    if (!hdr) return;
    const container = hdr.closest('.section, .etapa');
    if (!container) return;
    const mustBe = container.matches('.section') ? findDirect(container, HEADER_SECTION_CANDIDATES) : findDirect(container, HEADER_ETAPA_CANDIDATES);
    if (mustBe !== hdr) return;

    e.preventDefault();
    toggleContainer(container, hdr);
  }, true);

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initOnce());
  } else {
    initOnce();
  }

  // APIs globais
  window.BL_ToggleAll = {
    openAll(){ document.querySelectorAll('.section, .etapa').forEach(c => c.classList.add(OPEN_CLASS)); },
    closeAll(){ document.querySelectorAll('.section, .etapa').forEach(c => c.classList.remove(OPEN_CLASS)); }
  };
})();
