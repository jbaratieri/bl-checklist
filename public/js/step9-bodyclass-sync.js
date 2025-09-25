// step9-bodyclass-sync.js
(function(){
  'use strict';

  const INST_KEY = 'bl:instrument';
  const VALID = new Set(['vcl','vla','cav','uku']);

  function getInst(){
    const v = localStorage.getItem(INST_KEY);
    return VALID.has(v) ? v : 'vcl';
  }

  function setBodyClass(inst){
    // remove qualquer inst-xxx antigo do className (mais forte que remove/add isolado)
    document.body.className = document.body.className
      .replace(/\binst-(vcl|vla|cav|uku)\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    document.body.classList.add('inst-' + inst);
  }

  function refreshCallouts(){
    // se algum JS antigo deixou display inline, limpamos para o CSS decidir
    document.querySelectorAll('.callout[data-instruments]').forEach(el=>{
      el.style.removeProperty('display');
    });
  }

  function syncBody(){
    const inst = getInst();
    setBodyClass(inst);
    refreshCallouts();
  }

  // Em alguns frames seguintes, reaplicamos (vence scripts que mexem no body logo após)
  function resyncSoon(times=5){
    function tick(){
      syncBody();
      if (--times > 0) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // 1) <select id="ctxInstrument"> muda -> aplica na hora
  document.addEventListener('change', (e)=>{
    const sel = e.target;
    if (!(sel && sel.id === 'ctxInstrument')) return;
    const v = sel.value;
    if (!VALID.has(v)) return;
    // garante persistência e aplica visual
    localStorage.setItem(INST_KEY, v);
    syncBody();
    resyncSoon();
  });

  // 2) Escuta vários nomes de eventos do “bus” (cobrimos variações)
  const BUS_EVENTS = [
    'instrument:changed',
    'instrumento:changed',
    'inst:changed',
    'bl:instrument:changed'
  ];
  BUS_EVENTS.forEach(evt=>{
    document.addEventListener(evt, ()=>{ syncBody(); resyncSoon(); }, false);
    window.addEventListener(evt, ()=>{ syncBody(); resyncSoon(); }, false);
  });

  // 3) Se outra aba mudar o storage
  window.addEventListener('storage', (e)=>{
    if (e.key === INST_KEY) { syncBody(); resyncSoon(); }
  });

  // 4) No carregamento inicial
  document.addEventListener('DOMContentLoaded', ()=>{ syncBody(); resyncSoon(); });

  // 5) (Opcional) expõe utilitário pra debugar no console
  window.bl = Object.assign(window.bl || {}, {
    _syncBodyClassNow: ()=>{ syncBody(); resyncSoon(); }
  });

})();
