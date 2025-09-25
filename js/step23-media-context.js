/* step23-media-context.js — helpers para chaves por Instrumento + Projeto */
(function(){
  'use strict';
  function getInst(){
    try { return (window.BL_INSTRUMENT && BL_INSTRUMENT.get()) || localStorage.getItem('bl:instrument') || 'vcl'; }
    catch(e){ return 'vcl'; }
  }
  function getProj(){
    try {
      if (window.BL_PROJECT){
        const inst = getInst();
        return BL_PROJECT.get(inst) || 'default';
      }
      // fallback: último projeto usado por instrumento
      const inst = getInst();
      return localStorage.getItem('bl:project:'+inst) || 'default';
    } catch(e){
      return 'default';
    }
  }
  function key(){
    const parts = Array.prototype.slice.call(arguments).filter(Boolean);
    return ['bl', getInst(), getProj()].concat(parts).join(':');
  }
  function oldKey(){
    const parts = Array.prototype.slice.call(arguments).filter(Boolean);
    return ['bl', getInst()].concat(parts).join(':');
  }
  function onCtx(cb){
    window.addEventListener('bl:instrument-change', cb);
    window.addEventListener('bl:project-change', cb);
  }
  window.BL_CTX = { getInst, getProj, key, oldKey, onCtx };
})();