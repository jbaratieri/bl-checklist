// step9-bodyclass-sync.js
(function(){
  'use strict';

  const INST_KEY = 'bl:instrument';
  const VALID = new Set(['vcl','vla','cav','uku']);
  const INST_PREFIX = 'inst-';
  const KNOWN_CLASSES = ['inst-vcl','inst-vla','inst-cav','inst-uku'];

  function getInst(){
    try {
      const v = localStorage.getItem(INST_KEY);
      return VALID.has(v) ? v : 'vcl';
    } catch(e){
      return 'vcl';
    }
  }

  function clearInstClasses(){
    // prefer remove por classList para não clobber outras classes
    KNOWN_CLASSES.forEach(c => document.body.classList.remove(c));
    // também remove qualquer inst-xxxxx desconhecido (cautela)
    [...document.body.classList].filter(cl => cl.startsWith(INST_PREFIX) && !KNOWN_CLASSES.includes(cl))
      .forEach(cl => document.body.classList.remove(cl));
  }

  function setBodyClass(inst){
    if (!inst) return;
    clearInstClasses();
    document.body.classList.add(INST_PREFIX + inst);
    document.body.dataset.instrument = inst;
  }

  function refreshCallouts(){
    // limpamos inline display para permitir regras CSS baseadas em body.inst-*
    document.querySelectorAll('.callout[data-instruments]').forEach(el=>{
      el.style.removeProperty('display');
      // se o callout tiver lógica JS, dispare um evento para que possa re-renderizar
      try { el.dispatchEvent(new CustomEvent('callout:refresh', { bubbles: true })); } catch(_){}
    });
  }

  function syncBody(){
    const inst = getInst();
    setBodyClass(inst);
    refreshCallouts();
  }

  // reaplica por alguns frames para vencer scripts que mexem no body logo após
  function resyncSoon(times=6){
    function tick(){
      syncBody();
      if (--times > 0) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ------------- Observers / Listeners ---------------

  // 1) mudança direta do <select id="ctxInstrument"> (se existir)
  document.addEventListener('change', (e)=>{
    const sel = e.target;
    if (!(sel && sel.id === 'ctxInstrument')) return;
    const v = sel.value;
    if (!VALID.has(v)) return;
    localStorage.setItem(INST_KEY, v);
    syncBody();
    resyncSoon();
    // também notifica em forma de event padrão para outros módulos (compatibilidade)
    try{ window.dispatchEvent(new CustomEvent('instrument:changed', { detail:{ instrument: v } })); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent('instrumento:changed', { detail:{ instrumento: v } })); }catch(_){}
  });

  // 2) Eventos conhecidos do "bus" e compatibilidade com BL_INSTRUMENT
  // nomes que vamos escutar (cobrimos variações)
  const BUS_EVENTS = [
    'instrument:changed',
    'instrumento:changed',
    'inst:changed',
    'bl:instrument-change',     // este é o emit do BL_INSTRUMENT no seu outro trecho
    'bl:instrument:changed'
  ];

  BUS_EVENTS.forEach(evt=>{
    document.addEventListener(evt, (ev)=>{
      // se o evento vier com payload, e.g. detail.to / detail.instrument / detail.instrumento, tentamos extrair
      const d = ev && ev.detail ? ev.detail : {};
      const candidate = d.to || d.instrument || d.instrumento || d.value;
      if (candidate && VALID.has(String(candidate))) {
        localStorage.setItem(INST_KEY, String(candidate));
      }
      syncBody();
      resyncSoon();
    }, false);

    // também no window
    window.addEventListener(evt, (ev)=>{
      const d = ev && ev.detail ? ev.detail : {};
      const candidate = d.to || d.instrument || d.instrumento || d.value;
      if (candidate && VALID.has(String(candidate))) {
        localStorage.setItem(INST_KEY, String(candidate));
      }
      syncBody();
      resyncSoon();
    }, false);
  });

  // 3) Integração direta com window.BL_INSTRUMENT (se existir) — registra listener
  if (window.BL_INSTRUMENT && typeof window.BL_INSTRUMENT.on === 'function'){
    try {
      window.BL_INSTRUMENT.on(function(detail){
        // detail may be { from, to, source } or a simple code
        const code = (detail && (detail.to || detail.instrument || detail.instrumento)) || detail;
        if (code && VALID.has(String(code))) {
          localStorage.setItem(INST_KEY, String(code));
        }
        syncBody();
        resyncSoon();
      });
      // também tenta usar ready() to seed initial state if available
      if (typeof window.BL_INSTRUMENT.ready === 'function'){
        window.BL_INSTRUMENT.ready(function(code){
          if (code && VALID.has(String(code))) {
            localStorage.setItem(INST_KEY, String(code));
          }
          syncBody();
          resyncSoon();
        });
      }
    } catch(e){}
  }

  // 4) storage event (outra aba)
  window.addEventListener('storage', (e)=>{
    if (e.key === INST_KEY && VALID.has(e.newValue)) {
      syncBody();
      resyncSoon();
    }
  });

  // 5) MutationObserver fallback: observa texto do elemento #app-print-instrument
  (function startObs(){
    const tryStart = ()=>{
      const target = document.getElementById('app-print-instrument') || document.querySelector('[data-role="app-print-instrument"]');
      if (!target) return;
      // aplica estado inicial pelo texto também (se storage não estiver setado)
      const txt = (target.innerText || target.textContent || '').trim();
      if (txt){
        // extrai slug heurístico (ex: 'Instrumento: Viola Caipira' -> 'vla')
        const lc = txt.toLowerCase();
        if (lc.includes('violão') || lc.includes('violao')) { localStorage.setItem(INST_KEY, 'vcl'); }
        else if (lc.includes('viola') && !lc.includes('violao')) { localStorage.setItem(INST_KEY, 'vla'); }
        else if (lc.includes('cava')) { localStorage.setItem(INST_KEY, 'cav'); }
        else if (lc.includes('ukulele') || lc.includes('uku') || lc.includes('uke')) { localStorage.setItem(INST_KEY, 'uku'); }
        syncBody();
      }

      const mo = new MutationObserver((mutList)=>{
        // sempre que o texto do span mudar, tentamos synchronizar o body com heurística
        const text = (target.innerText || target.textContent || '').trim();
        if (!text) return;
        const lc = text.toLowerCase();
        let code = null;
        if (lc.includes('violão') || lc.includes('violao')) code = 'vcl';
        else if (lc.includes('viola') && !lc.includes('violao')) code = 'vla';
        else if (lc.includes('cava')) code = 'cav';
        else if (lc.includes('ukulele') || lc.includes('uku') || lc.includes('uke')) code = 'uku';
        if (code && VALID.has(code)){
          localStorage.setItem(INST_KEY, code);
          syncBody();
          resyncSoon(4);
        }
      });
      mo.observe(target, { childList: true, subtree: true, characterData: true });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive'){
      tryStart();
    } else {
      document.addEventListener('DOMContentLoaded', tryStart);
    }
  })();

  // 6) Boot: aplica class inicial sem clobber de outras classes
  document.addEventListener('DOMContentLoaded', ()=>{
    syncBody();
    resyncSoon();
  });

  // utilitários de debug
  window.bl = Object.assign(window.bl || {}, {
    _syncBodyClassNow: ()=>{ syncBody(); resyncSoon(); },
    getInstrument: getInst
  });

})();
