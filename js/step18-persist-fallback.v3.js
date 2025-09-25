/* step18-persist-fallback.v3.js — com anti-loop e debounce */
(function(){
  'use strict';

  // Utilitários robustos (evitam erro de querySelectorAll)
  const $$ = (s, c) => {
    const ctx = (c && typeof c.querySelectorAll === 'function') ? c : document;
    try { return Array.from(ctx.querySelectorAll(s)); } catch(_) { return []; }
  };
  const $  = (s, c) => {
    const ctx = (c && typeof c.querySelector === 'function') ? c : document;
    try { return ctx.querySelector(s); } catch(_) { return null; }
  };

  const INST = ()=> (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
  const PROJ = ()=> (window.BL_PROJECT ? BL_PROJECT.get(INST()) : (localStorage.getItem('bl:project:'+INST())||'default'));
  const KEY  = (inst, proj, id)=> `bl:val:${inst}:${proj}:${id}`;
  const LEGACY_KEY = (inst, id)=> `bl:val:${inst}:${id}`;

  const SENSITIVE_NOCHANGE = new Set(['job-instrument','selProject']); // não disparar "change" neles
  let APPLYING = false;            // flag global para outros módulos ignorarem eventos
  let applyTimer = null;           // debounce

  // Exponho a flag para outros módulos (cronograma/selector): podem ignorar mudanças
  Object.defineProperty(window, '__BL_PERSIST_APPLYING__', {
    get(){ return APPLYING; }
  });

  function isPersistEl(el){
    if (!(el instanceof HTMLElement)) return false;
    if (!el.classList || !el.classList.contains('persist')) return false;
    if (!('id' in el) || !el.id) return false;
    const tag = el.tagName.toLowerCase();
    return (tag==='input' || tag==='textarea' || tag==='select');
  }

  function saveEl(el, inst=INST(), proj=PROJ()){
    if (!isPersistEl(el)) return;
    const id = el.id;
    let val;
    if (el.type==='checkbox' || el.type==='radio'){ val = el.checked ? '1' : '0'; }
    else { val = (el.value ?? '').toString(); }
    try { localStorage.setItem(KEY(inst, proj, id), val); } catch(e){}
  }

  function loadEl(el, inst=INST(), proj=PROJ()){
    if (!isPersistEl(el)) return false;
    const id = el.id;
    let val = null;
    try { val = localStorage.getItem(KEY(inst, proj, id)); } catch(_){}
    if (val===null){
      try { val = localStorage.getItem(LEGACY_KEY(inst, id)); } catch(_){}
    }
    if (val===null){
      if (el.type==='checkbox' || el.type==='radio'){ el.checked=false; } else { el.value=''; }
      return false;
    }
    if (el.type==='checkbox' || el.type==='radio'){ el.checked = (val==='1'); }
    else { el.value = val; }
    return true;
  }

  function wireEl(el){
    if (!isPersistEl(el)) return;
    if (!el.__blPersistWired){
      el.__blPersistWired = true;
      el.addEventListener('input', ()=> { if (!APPLYING) saveEl(el); });
      el.addEventListener('change', ()=> { if (!APPLYING) saveEl(el); });
    }
  }

  function wireAll(root=document){
    $$('input.persist, textarea.persist, select.persist', root).forEach(wireEl);
  }

  function applyAll(inst=INST(), proj=PROJ()){
    if (APPLYING) return; // evita reentrância
    APPLYING = true;
    try{
      $$('input.persist, textarea.persist, select.persist').forEach(el=>{
        // Valor antes
        const before = (el.type==='checkbox'||el.type==='radio') ? (el.checked?'1':'0') : (el.value ?? '');
        const loaded = loadEl(el, inst, proj);
        if (!loaded) return; // nada salvo -> não dispara eventos

        // Valor depois
        const after = (el.type==='checkbox'||el.type==='radio') ? (el.checked?'1':'0') : (el.value ?? '');
        if (before === after) return; // não mudou -> não disparar

        // Dispara eventos só quando mudou
        el.dispatchEvent(new Event('input', {bubbles:true}));
        if (!SENSITIVE_NOCHANGE.has(el.id)){
          el.dispatchEvent(new Event('change', {bubbles:true}));
        }
      });
    } finally {
      APPLYING = false;
    }
  }

  function queueApply(){ // debounce para cascatas
    if (applyTimer) cancelAnimationFrame(applyTimer);
    applyTimer = requestAnimationFrame(()=> {
      applyTimer = null;
      applyAll(INST(), PROJ());
    });
  }

  // Boot
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=>{ wireAll(); queueApply(); }); }
  else { wireAll(); queueApply(); }

  // Observa DOM dinâmico
  const mo = new MutationObserver(muts=>{
    let need=false;
    muts.forEach(m=> m.addedNodes && Array.from(m.addedNodes).forEach(n=>{
      if (!(n instanceof HTMLElement)) return;
      if (isPersistEl(n)) need=true;
      n.querySelectorAll && n.querySelectorAll('.persist').length && (need=true);
    }));
    if (need){ wireAll(); queueApply(); }
  });
  mo.observe(document.documentElement, {subtree:true, childList:true});

  // Ao trocar instrumento/projeto, aplica com debounce
  window.addEventListener('bl:instrument-change', queueApply);
  window.addEventListener('bl:project-change',    queueApply);

  // Debug opcional
  window.BL_PERSIST_DEBUG = Object.assign({}, window.BL_PERSIST_DEBUG||{}, {
    listCurrent: function(){
      const inst=INST(), proj=PROJ();
      const pfx = `bl:val:${inst}:${proj}:`;
      const acc={};
      for (let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if (k && k.startsWith(pfx)) acc[k]=localStorage.getItem(k);
      }
      console.table(acc); return acc;
    }
  });
})();
