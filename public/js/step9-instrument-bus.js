/* step9-instrument-bus.js — fonte única da verdade para instrumento atual
   API:
     BL_INSTRUMENT.get() -> 'vcl'|'vla'|'cav'|'uku'
     BL_INSTRUMENT.set(code, {source})  // emite evento se mudou
     BL_INSTRUMENT.on(fn) / off(fn)     // escuta mudanças
     BL_INSTRUMENT.ready(cb)            // chama cb quando estabilizar após boot

   Integrações: dispara CustomEvent 'bl:instrument-change' em window.
*/
(function(){
  'use strict';
  if (window.BL_INSTRUMENT) return; // já instalado

  var KEY = 'bl:instrument';
  var last = null;
  var listeners = new Set();
  var stableTimer = null, stableHits = 0;

  function get(){ try{ return localStorage.getItem(KEY) || 'vcl'; }catch(e){ return 'vcl'; } }
  function same(a,b){ return String(a||'').toLowerCase() === String(b||'').toLowerCase(); }

  function emit(detail){
    try {
      window.dispatchEvent(new CustomEvent('bl:instrument-change', { detail }));
    } catch(e){ /* ignore */ }
    listeners.forEach(fn => {
      try { fn(detail); } catch(_){}
    });
  }

  function set(code, opts){
    var src = (opts && opts.source) || 'bus';
    var cur = get();
    if (same(cur, code)) return;
    try { localStorage.setItem(KEY, code); } catch(e){ /* ignore */ }
    var prev = last || cur;
    last = code;
    emit({ from: prev, to: code, source: src });
  }

  function on(fn){ listeners.add(fn); }
  function off(fn){ listeners.delete(fn); }

  // Intercepta localStorage.setItem para capturar mudanças feitas por outros módulos
  try {
    if (!localStorage.__blInstrPatched){
      localStorage.__blInstrPatched = true;
      var _set = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function(k,v){
        var prev = localStorage.getItem(k);
        var out = _set(k,v);
        if (k === KEY && !same(prev, v)){
          var cur = get();
          last = cur;
          emit({ from: prev, to: cur, source: 'storage' });
        }
        return out;
      };
    }
  } catch(e){}

  // Também escuta o evento 'storage' (outra aba)
  window.addEventListener('storage', function(ev){
    if (ev.key === KEY && !same(ev.oldValue, ev.newValue)){
      var cur = get();
      last = cur;
      emit({ from: ev.oldValue, to: cur, source: 'storage-event' });
    }
  });

  function ready(cb){
    // considera estabilizado após 2 leituras iguais com 200ms
    var lastSeen = get();
    var hits = 0;
    var iv = setInterval(function(){
      var now = get();
      if (same(now, lastSeen)){ hits++; } else { hits=0; lastSeen = now; }
      if (hits >= 2){
        clearInterval(iv);
        try { cb(now); } catch(_){}
      }
    }, 200);
  }

  window.BL_INSTRUMENT = { get, set, on, off, ready };
})();