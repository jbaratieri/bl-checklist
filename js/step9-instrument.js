// Step 9: Instrument selector + namespaced persistence + print header
(function(){
  'use strict';

  // ---- Config ----
  const INST_KEY = 'bl:instrument'; // vcl|vla|cav|uku
  const INST_NAMES = {
    vcl: 'Violão',
    vla: 'Viola Caipira',
    cav: 'Cavaquinho',
    uku: 'Ukulele'
  };
  const DEFAULT_INST = 'vcl';
  const SECTIONS_FOR_MEASURES = ['02','03','04','05','08','09'];

  // ---- Helpers DOM/NS ----
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $$(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function nsKey(inst, sec, fieldId){ return `bl:v1:${inst}:${sec}:${fieldId}`; }

  // ---- Instrumento atual (storage + fallback) ----
  function getInstrument(){
    let inst = localStorage.getItem(INST_KEY);
    if (!inst || !INST_NAMES[inst]) {
      inst = DEFAULT_INST;
      localStorage.setItem(INST_KEY, inst);
    }
    return inst;
  }

  // ---- Callouts (deixa CSS decidir; remove inline legado) ----
  function refreshCalloutsVisibility(){
    document.querySelectorAll('.callout[data-instruments]').forEach(el=>{
      el.style.removeProperty('display');
    });
  }

  // ---- Atualiza badge (nome e data-code) ----
  function updateInstrumentBadge(inst){
    const badge = document.getElementById('instBadge');
    if (!badge) return;
    badge.dataset.code = inst;
    // mantém emoji inicial se já existir
    const text = (badge.textContent || '').trim();
    const hasPrefix = text.startsWith('🎸');
    const prefix = hasPrefix ? '🎸 ' : '🎸 ';
    badge.textContent = prefix + (INST_NAMES[inst] || inst);
  }

  // ---- Migra chaves antigas para namespace por instrumento (uma vez por inst) ----
  function migrateInto(inst){
    const marker = `bl:migrated:v1:${inst}`;
    if (localStorage.getItem(marker)) return;
    SECTIONS_FOR_MEASURES.forEach(num => {
      const sec = `sec-${num}`;
      [['w',`w-sec${num}`],['h',`h-sec${num}`],['t',`t-sec${num}`],['notes',`notes-sec${num}`]].forEach(([k, oldId])=>{
        const el = document.getElementById(oldId);
        if (!el) return;
        const ns = nsKey(inst, sec, k);
        if (localStorage.getItem(ns) == null && el.value){
          localStorage.setItem(ns, el.value);
        }
      });
    });
    localStorage.setItem(marker, '1');
  }

  // ---- Carrega valores persistidos (por instrumento) ----
  function loadPersistedValues(){
    const inst = getInstrument();
    // measures conhecidos
    SECTIONS_FOR_MEASURES.forEach(num => {
      const sec = `sec-${num}`;
      const mapping = { 'w': `w-sec${num}`, 'h': `h-sec${num}`, 't': `t-sec${num}`, 'notes': `notes-sec${num}` };
      Object.entries(mapping).forEach(([k, id])=>{
        const el = document.getElementById(id);
        if (!el) return;
        const v = localStorage.getItem(nsKey(inst, sec, k));
        if (v != null) el.value = v;
      });
    });
    // genérico: inputs .persist (scoped por seção + instrumento)
    $$('.persist').forEach(input => {
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
      const id = input.id || input.name;
      if (!id) return;
      const sec = input.closest('[id^="sec-"]')?.id || 'root';
      const key = nsKey(inst, sec, id);
      const v = localStorage.getItem(key);
      if (v != null) input.value = v;
    });
  }

  // ---- Salva inputs .persist ao digitar (namespaced por instrumento) ----
  function bindPersistence(){
    document.addEventListener('input', (ev)=>{
      const t = ev.target;
      if (!(t && t.classList && t.classList.contains('persist'))) return;
      const id = t.id || t.name; if (!id) return;
      const inst = getInstrument();
      const sec = t.closest('[id^="sec-"]')?.id || 'root';
      localStorage.setItem(nsKey(inst, sec, id), t.value ?? '');
    });
  }

  // ---- Header/Rodapé de impressão ----
  function ensurePrintHeaderElements(){
    if (!document.getElementById('app-print-header')){
      const h = document.createElement('div'); h.id = 'app-print-header';
      const title = document.createElement('div'); title.className = 'title'; title.textContent = 'Checklist — Baratieri Luthieria';
      const right = document.createElement('div'); right.className = 'right';
      const instSpan = document.createElement('span'); instSpan.id = 'app-print-instrument'; right.appendChild(instSpan);
      h.appendChild(title); h.appendChild(right);
      document.body.prepend(h);
      const spacer = document.createElement('div'); spacer.id = 'app-print-spacer'; document.body.prepend(spacer);
    }
    if (!document.getElementById('app-print-footer')){
      const f = document.createElement('div'); f.id = 'app-print-footer';
      const when = document.createElement('div'); when.id='app-print-when'; f.appendChild(when);
      const page = document.createElement('div'); page.className='page-count'; f.appendChild(page);
      document.body.appendChild(f);
      const spacerB = document.createElement('div'); spacerB.id = 'app-print-spacer-bottom'; document.body.appendChild(spacerB);
    }
  }

  function populatePrintHeader(){
    ensurePrintHeaderElements();
    const inst = getInstrument();
    const name = INST_NAMES[inst] || inst;
    const span = document.getElementById('app-print-instrument');
    if (span) span.textContent = `Instrumento: ${name}`;
    const when = document.getElementById('app-print-when');
    if (when){
      const now = new Date();
      when.textContent = `Gerado em ${now.toLocaleString()}`;
    }
  }

  // ---- APLICA instrumento (salva + classe do body + recarrega UI) ----
  function setInstrument(inst){
    if (!INST_NAMES[inst]) return;
    localStorage.setItem(INST_KEY, inst);

    // classe do <body> para callouts via CSS
    document.body.classList.remove('inst-vcl','inst-vla','inst-cav','inst-uku');
    document.body.classList.add('inst-'+inst);

    // limpa inline, recarrega dados e header, atualiza badge
    refreshCalloutsVisibility();
    loadPersistedValues();
    populatePrintHeader();
    updateInstrumentBadge(inst);

    // avisa outros módulos
    document.dispatchEvent(new CustomEvent('instrumento:changed', { detail:{ instrumento: inst }}));
  }

  // ---- <select id="ctxInstrument">: aplica NO CHANGE ----
  function bindInstrumentSelect(){
    const sel = document.getElementById('ctxInstrument');
    if (!sel) return;

    // valor inicial do select = salvo no storage
    const inst = getInstrument();
    if (sel.value !== inst) sel.value = inst;

    // quando mudar, aplica na hora (sem F5)
    sel.addEventListener('change', (e)=>{
      const v = e.target.value;
      setInstrument(v);
    });
  }

  // ---- Boot ----
  document.addEventListener('DOMContentLoaded', ()=>{
    const inst = getInstrument();
    // ajusta body/badge já no load
    document.body.classList.add('inst-'+inst);
    updateInstrumentBadge(inst);

    // liga select, persistência e carrega valores
    bindInstrumentSelect();
    migrateInto(inst);
    bindPersistence();
    loadPersistedValues();
    populatePrintHeader();
    refreshCalloutsVisibility();
  });

  // opcional: expõe utilitários para debug no console
  window.bl = Object.assign(window.bl || {}, {
    getInstrument, setInstrument
  });

})();
