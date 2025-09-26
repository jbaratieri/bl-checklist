// Step 1: Toggle por cabeçalho — robusto (força filho direto em todos seletores)
(function(){
  'use strict';
  if (window.__BL_TOGGLE_V3__) return;
  window.__BL_TOGGLE_V3__ = true;

  // util: encontra o PRIMEIRO filho direto que corresponda a um dos seletores
  function findDirect(container, csv) {
    const sels = csv.split(',').map(s => s.trim()).filter(Boolean);
    for (const s of sels) {
      const el = container.querySelector(`:scope > ${s}`);
      if (el) return el;
    }
    return null;
  }

  const HEADER_SECTION_CANDIDATES = 'h3, header, .section-header';
  const HEADER_ETAPA_CANDIDATES   = '.etapa-header';
  const BODY_SECTION              = '.section-body';
  const BODY_ETAPA                = '.etapa-body';
  const OPEN_CLASS                = 'is-open';

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

  // Clique (captura) — só a seção mais próxima reage
  document.addEventListener('click', function(e){
    const hdr = e.target.closest('h3, header, .section-header, .etapa-header');
    if (!hdr) return;

    // ignora controles dentro do header
    if (e.target !== hdr && e.target.closest('button,a,input,select,textarea,[role="button"],.btn,[data-target]')) return;

    // garante que o header é filho direto do container
    const container = hdr.closest('.section, .etapa');
    if (!container) return;
    const mustBe = container.matches('.section') ? findDirect(container, HEADER_SECTION_CANDIDATES) : findDirect(container, HEADER_ETAPA_CANDIDATES);
    if (mustBe !== hdr) return; // clicou em algo com a mesma classe lá dentro, mas não é o header direto

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    toggleContainer(container, hdr);
  }, true);

  // Teclado
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const hdr = e.target.closest('h3, header, .section-header, .etapa-header');
    if (!hdr) return;
    const container = hdr.closest('.section, .etapa');
    if (!container) return;
    const mustBe = container.matches('.section') ? findDirect(container, HEADER_SECTION_CANDIDATES) : findDirect(container, HEADER_ETAPA_CANDIDATES);
    if (mustBe !== hdr) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    toggleContainer(container, hdr);
  }, true);

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initOnce());
  } else {
    initOnce();
  }

  // (Opcional) APIs globais para Expandir/Recolher Tudo
  window.BL_ToggleAll = {
    openAll(){ document.querySelectorAll('.section, .etapa').forEach(c => c.classList.add(OPEN_CLASS)); },
    closeAll(){ document.querySelectorAll('.section, .etapa').forEach(c => c.classList.remove(OPEN_CLASS)); }
  };
})();
