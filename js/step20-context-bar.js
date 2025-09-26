/* step20-context-bar.js (v1.4.0) — Refeito para usar HTML fixo no index.html */
(function(){
  'use strict';

  const INSTR_NAMES = { vcl:'Violão Clássico', vla:'Viola', cav:'Cavaquinho', uku:'Ukulele' };
  const ORDER = ['vcl','vla','cav','uku'];

  // ---------- Helpers ----------
  function norm(t){ return (t||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase(); }

  function trySet(el, value){
    if (!el) return false;
    el.value = value;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  }

  function bySelectors(list){
    for (const sel of list){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function byLabel(regex){
    const labs = Array.from(document.querySelectorAll('label'));
    const lab = labs.find(l => regex.test(norm(l.textContent)));
    if (!lab) return null;
    const direct = lab.querySelector('input,select,textarea');
    if (direct) return direct;
    let sib = lab.nextElementSibling;
    for (let i=0;i<3 && sib;i++, sib=sib.nextElementSibling){
      if (sib.matches && sib.matches('input,select,textarea')) return sib;
      const nested = sib.querySelector && sib.querySelector('input,select,textarea');
      if (nested) return nested;
    }
    return null;
  }

  function setStart(value){
    const el = bySelectors(['#job-start','#job-start-date','[name="job-start"]','#start-date']);
    if (el) return trySet(el, value);
    const byLab = byLabel(/\binicio\b|\binicio previsto\b/);
    if (byLab) return trySet(byLab, value);
    return false;
  }

  function setEnd(value){
    const el = bySelectors([
      '#job-end','#job-end-date','[name="job-end"]','#end-date',
      '#job-delivery','#job-delivery-date','[name="job-delivery"]',
      '#entrega','#entrega-prevista','[name="entrega"]','[name="entrega-prevista"]',
      '#job-due','[name="job-due"]'
    ]);
    if (el) return trySet(el, value);
    const byLab = byLabel(/\bentrega\b|\bentrega prevista\b|\bprazo\b|\bdeadline\b|\bdue\b|\bvencimento\b/);
    if (byLab) return trySet(byLab, value);
    return false;
  }

  function fillInstrumentOptions(sel, current){
    sel.innerHTML = ORDER.map(code => `<option value="${code}">${INSTR_NAMES[code]||code.toUpperCase()}</option>`).join('');
    sel.value = current;
  }
  function fillProjectOptions(sel, list, current){
    sel.innerHTML = (list||[]).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    sel.value = current;
  }

  function hideLegacySelectors(){
    const fab = document.querySelector('.instrument-fab, #btnInstrument, [data-role="instrument-fab"]');
    if (fab) fab.style.display = 'none';
    const oldProj = document.getElementById('projectSelector');
    if (oldProj) oldProj.style.display = 'none';
    const jobInst = document.getElementById('job-instrument');
    if (jobInst){
      const lab = jobInst.closest('label');
      if (lab) lab.style.display = 'none';
    }
  }

  function boot(){
    if (!window.BL_INSTRUMENT || !window.BL_PROJECT){
      console.warn('[context-bar] BL_INSTRUMENT/BL_PROJECT ausente(s). Garanta a ordem dos scripts.');
      return;
    }

    const bar = document.getElementById('contextBar');
    if (!bar){
      console.warn('[context-bar] Nenhum <div id="contextBar"> encontrado no HTML.');
      return;
    }

    const selInst = bar.querySelector('#ctxInstrument');
    const selProj = bar.querySelector('#ctxProject');
    const btnNew  = bar.querySelector('#ctxNew');
    const btnRen  = bar.querySelector('#ctxRen');
    const btnDel  = bar.querySelector('#ctxDel');
    const hint    = bar.querySelector('#ctxHint');

    function refreshAll(){
      const inst = BL_INSTRUMENT.get();
      fillInstrumentOptions(selInst, inst);
      const list = BL_PROJECT.list(inst);
      fillProjectOptions(selProj, list, BL_PROJECT.get(inst));
      hint.textContent = `${INSTR_NAMES[inst]||inst.toUpperCase()} — ${list.length} projeto(s)`;
    }

    BL_INSTRUMENT.ready(function(){
      refreshAll();
      hideLegacySelectors();
    });

    selInst.addEventListener('change', (e)=>{
      const code = e.target.value;
      if (window.__BL_PERSIST_APPLYING__) return;
      if (BL_INSTRUMENT.get() === code) return;
      BL_INSTRUMENT.set(code, {source:'context-bar'});
    });
    selProj.addEventListener('change', (e)=>{
      const id = e.target.value;
      if (window.__BL_PERSIST_APPLYING__) return;
      const inst = BL_INSTRUMENT.get();
      if (BL_PROJECT.get(inst) === id) return;
      BL_PROJECT.set(inst, id, {source:'context-bar'});
    });

    btnNew.addEventListener('click', ()=> {
      alert("Função de criar projeto: mantenha o modal ou implemente aqui.");
    });
    btnRen.addEventListener('click', ()=>{
      const inst = BL_INSTRUMENT.get();
      const cur  = BL_PROJECT.get(inst);
      const curName = (BL_PROJECT.list(inst).find(x=>x.id===cur)||{}).name || '';
      const name = prompt('Novo nome do projeto:', curName);
      if (!name) return;
      BL_PROJECT.rename(inst, cur, name);
      refreshAll();
    });
    btnDel.addEventListener('click', ()=>{
      const inst = BL_INSTRUMENT.get();
      const cur  = BL_PROJECT.get(inst);
      if (!confirm('Excluir projeto atual da lista? (dados permanecem salvos no navegador)')) return;
      BL_PROJECT.remove(inst, cur);
      refreshAll();
    });

    window.addEventListener('bl:instrument-change', refreshAll);
    window.addEventListener('bl:project-change', refreshAll);
  }

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
})();
