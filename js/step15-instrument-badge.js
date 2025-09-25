/* step15-instrument-badge.js — v2
   - Corrige mapeamento: vcl → "Violão Clássico"
   - Permite override por window.BL_INSTRUMENT_LABELS ou localStorage 'bl:instrumentLabel:<code>'
*/
(function(){
  'use strict';

  const DEFAULT_MAP = {
    vcl: { label: 'Violão Clássico', color: '#8a623f', emoji: '🎸' },
    vla: { label: 'Viola',           color: '#8a623f', emoji: '🎻' },
    cav: { label: 'Cavaquinho',      color: '#cf995f', emoji: '🎸' },
    uku: { label: 'Ukulele',         color: '#cf995f', emoji: '🎸' }
  };

  const USER_MAP = (window.BL_INSTRUMENT_LABELS && typeof window.BL_INSTRUMENT_LABELS==='object')
    ? window.BL_INSTRUMENT_LABELS
    : {};

  const getInst = () => (localStorage.getItem('bl:instrument') || 'vcl');

  function getMeta(code){
    if (!code) return { label: '—', color: '#666', emoji: '🎼' };
    // 1) override via JS global
    if (USER_MAP[code]) return USER_MAP[code];
    // 2) override via localStorage
    try{
      const ls = localStorage.getItem('bl:instrumentLabel:' + code);
      if (ls) return { label: ls, color: '#8a623f', emoji: '🎸' };
    }catch(_e){}
    // 3) fallback default
    if (DEFAULT_MAP[code]) return DEFAULT_MAP[code];
    // 4) genérico
    return { label: (code||'').toUpperCase(), color: '#666', emoji: '🎼' };
  }

  function findTitleAnchor(){
    const selectors = [
      '.app-title', '.brand h1', 'header h1', 'header .title', '.header .title', '.topbar .title', 'h1'
    ];
    for (const sel of selectors){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function ensureBadge(){
    let b = document.getElementById('instBadge');
    if (b) return b;
    const anchor = findTitleAnchor();
    const badge = document.createElement('span');
    badge.id = 'instBadge';
    badge.className = 'inst-badge';
    if (anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(badge, anchor.nextSibling);
    } else {
      const top = document.createElement('div');
      top.style.cssText = 'position:fixed;top:8px;right:8px;z-index:1500;';
      document.body.appendChild(top);
      top.appendChild(badge);
    }
    return badge;
  }

  function updateBadge(){
    const code = getInst();
    const meta = getMeta(code);
    const b = ensureBadge();
    b.setAttribute('data-code', code);
    b.style.setProperty('--inst-color', meta.color);
    b.textContent = `${meta.emoji} ${meta.label}`;
  }

  // Inicializa
  document.addEventListener('DOMContentLoaded', ()=>{
    updateBadge();
    setTimeout(updateBadge, 200);
    setTimeout(updateBadge, 800);
  });

  // Atualiza em mudanças (sem F5)
  (function watchInstrument(){
    let last = getInst();
    try{
      if (!localStorage.__blInstBadgePatchedV2){
        localStorage.__blInstBadgePatchedV2 = true;
        const _set = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(k, v){
          const prev = localStorage.getItem(k);
          const out = _set(k, v);
          if (k==='bl:instrument' && v!==prev){ last=v; updateBadge(); }
          if (k && k.startsWith('bl:instrumentLabel:')) updateBadge();
          return out;
        };
        const _rem = localStorage.removeItem.bind(localStorage);
        localStorage.removeItem = function(k){
          const out = _rem(k);
          if (k==='bl:instrument' || (k && k.startsWith('bl:instrumentLabel:'))){ last=getInst(); updateBadge(); }
          return out;
        };
      }
    }catch(_e){/* ignore */}
    setInterval(()=>{
      const now = getInst();
      if (now !== last){ last = now; updateBadge(); }
    }, 600);
  })();

})();