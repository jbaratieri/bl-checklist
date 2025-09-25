
/* step16-range-support.js — trata presets com faixa (ex.: "44-50", "2.4–2.8 mm")
   Como usar:
   1) Inclua este arquivo DEPOIS do step16-measures-presets.js.
   2) Ele intercepta o preenchimento automático e evita setar strings inválidas em <input type="number">.
   3) Estratégia de faixa:
      - Global: window.BL_MEASURE_FILL_STRATEGY = 'skip' | 'min' | 'max' | 'mean' (padrão: 'skip')
      - Por campo: data-fill-range="skip|min|max|mean" (tem prioridade sobre a global)
*/
(function(){
  'use strict';

  function numsFrom(str){
    if (!str && str !== 0) return [];
    // troca vírgula por ponto, remove texto
    const s = String(str).replace(/,/g,'.');
    const m = s.match(/-?\d+(?:\.\d+)?/g);
    return m ? m.map(parseFloat).filter(n => Number.isFinite(n)) : [];
  }

  function pickFromRange(str, strategy){
    const vals = numsFrom(str);
    if (!vals.length) return null;
    if (vals.length === 1) return vals[0];
    switch (strategy){
      case 'min': return Math.min.apply(null, vals);
      case 'max': return Math.max.apply(null, vals);
      case 'mean': return vals.reduce((a,b)=>a+b,0)/vals.length;
      case 'skip':
      default: return null;
    }
  }

  function fillNumbersSafely(root){
    const strategyGlobal = (window.BL_MEASURE_FILL_STRATEGY || 'skip').toLowerCase();
    // procura todos inputs NUMBER com data-measure e vazios
    document.querySelectorAll('input[type="number"][data-measure]').forEach(inp=>{
      if (String(inp.value||'').trim()) return; // já tem valor digitado
      // busca hint (placeholder ou title)
      const hint = inp.getAttribute('placeholder') || inp.getAttribute('title') || '';
      const strategy = (inp.getAttribute('data-fill-range') || strategyGlobal).toLowerCase();
      const parsed = pickFromRange(hint, strategy);
      if (parsed == null) return; // mantém vazio se não der pra decidir
      // respeita min/max se existirem
      let v = parsed;
      const min = inp.getAttribute('min'); const max = inp.getAttribute('max');
      if (min !== null && v < parseFloat(min)) v = parseFloat(min);
      if (max !== null && v > parseFloat(max)) v = parseFloat(max);
      // step fica por sua conta
      inp.value = String(v);
      // dispara eventos para persistência
      inp.dispatchEvent(new Event('input', {bubbles:true}));
      inp.dispatchEvent(new Event('change', {bubbles:true}));
    });
  }

  // Rodar após o engine do step16 aplicar placeholders
  function runSoon(){
    // roda agora e mais algumas vezes para pegar DOM tardio
    fillNumbersSafely(document);
    setTimeout(()=>fillNumbersSafely(document), 150);
    setTimeout(()=>fillNumbersSafely(document), 600);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', runSoon);
  } else {
    runSoon();
  }

  // Ao clicar no botão "Preencher campos vazios", rode depois do handler original
  document.addEventListener('click', function(e){
    const t = e.target;
    if (!t) return;
    if (t.id === 'btnFillEmpty'){
      setTimeout(()=> fillNumbersSafely(document), 0);
    }
  }, true);

  // Reagir à troca de instrumento (placeholders mudam)
  (function watchInstrument(){
    let last = localStorage.getItem('bl:instrument') || 'vcl';
    const tryRun = ()=> runSoon();
    try{
      if (!localStorage.__blRangeSupportPatched){
        localStorage.__blRangeSupportPatched = true;
        const _set = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function(k, v){
          const prev = localStorage.getItem(k);
          const out = _set(k, v);
          if (k==='bl:instrument' && v!==prev){ last=v; tryRun(); }
          return out;
        };
        const _rem = localStorage.removeItem.bind(localStorage);
        localStorage.removeItem = function(k){
          const out = _rem(k);
          if (k==='bl:instrument'){ last=localStorage.getItem('bl:instrument')||'vcl'; tryRun(); }
          return out;
        };
      }
    }catch(_e){}
    setInterval(()=>{ const now = localStorage.getItem('bl:instrument')||'vcl'; if (now!==last){ last=now; tryRun(); } }, 800);
  })();

  // Exponha utilitário para checar parser
  window.BL_RANGE_SUPPORT = { numsFrom, pickFromRange, run: () => fillNumbersSafely(document) };

})();
