
/* step20-context-bar.js (v1.3.2) — Hotfix: inclui #job-due / [name="job-due"] para 'Entrega' */
(function(){
  'use strict';

  const INSTR_NAMES = { vcl:'Violão Clássico', vla:'Viola', cav:'Cavaquinho', uku:'Ukulele' };
  const ORDER = ['vcl','vla','cav','uku'];

  function ensureBar(){
    let bar = document.getElementById('contextBar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'contextBar';
    bar.innerHTML = `
      <div class="row">
        <div class="group">
          <label>Instrumento
            <select id="ctxInstrument"></select>
          </label>
          <label>Projeto
            <select id="ctxProject"></select>
          </label>
        </div>
        <div class="group">
          <button class="btn primary" id="ctxNew">Novo</button>
          <button class="btn" id="ctxRen">Renomear</button>
          <button class="btn" id="ctxDel">Excluir</button>
          <small id="ctxHint"></small>
        </div>
      </div>
    `;
    const anchor = document.querySelector('.topbar, header') || document.body.firstElementChild;
    if (anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
    return bar;
  }

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
    // IDs e names comuns + alternativas (inclui job-due)
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

  function ensureNewModal(){
    let modal = document.getElementById('ctxNewModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ctxNewModal';
    modal.className = 'backdrop';
    modal.innerHTML = `
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="ctxNewTitle">
        <h4 id="ctxNewTitle">Novo projeto</h4>
        <div class="grid">
          <div class="field">
            <label for="ctxNewInstrument">Instrumento</label>
            <select id="ctxNewInstrument"></select>
          </div>
          <div class="field">
            <label for="ctxNewName">Nome</label>
            <input id="ctxNewName" type="text" placeholder="ex.: Jacir / Lote 2025-08">
          </div>
          <div class="field">
            <label for="ctxNewClient">Cliente</label>
            <input id="ctxNewClient" type="text" placeholder="Nome do cliente (opcional)">
          </div>
          <div class="field">
            <label for="ctxNewStart">Início</label>
            <input id="ctxNewStart" type="date">
          </div>
          <div class="field">
            <label for="ctxNewEnd">Entrega</label>
            <input id="ctxNewEnd" type="date">
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <div class="row">
              <input id="ctxCalcNow" type="checkbox" checked>
              <span>Calcular cronograma agora</span>
            </div>
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <div class="row">
              <input id="ctxSwitchAfterCreate" type="checkbox" checked>
              <span>Abrir esse projeto após criar</span>
            </div>
          </div>
        </div>
        <div class="hint">Dica: você pode criar um projeto para outro instrumento sem sair do atual.</div>
        <div class="actions">
          <button class="btn" id="ctxCancel">Cancelar</button>
          <button class="btn primary" id="ctxCreate">Criar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function findButtonByText(regex){
    const btns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
    return btns.find(b => regex.test((b.textContent||b.value||'').trim()));
  }

  function openNewModal(currentInst){
    const modal = ensureNewModal();
    const sel = modal.querySelector('#ctxNewInstrument');
    sel.innerHTML = ORDER.map(c => `<option value="${c}">${INSTR_NAMES[c]||c.toUpperCase()}</option>`).join('');
    sel.value = currentInst;
    const inputName = modal.querySelector('#ctxNewName');
    const inputClient = modal.querySelector('#ctxNewClient');
    const inputStart = modal.querySelector('#ctxNewStart');
    const inputEnd   = modal.querySelector('#ctxNewEnd');
    inputName.value = ''; inputClient.value = ''; inputStart.value=''; inputEnd.value='';

    function maybeSuggestName(){
      if (inputName.value.trim()) return;
      const c = inputClient.value.trim(); if (!c) return;
      const code = sel.value;
      inputName.value = `${c} — ${INSTR_NAMES[code]||code.toUpperCase()}`;
    }
    inputClient.addEventListener('input', maybeSuggestName);
    sel.addEventListener('change', maybeSuggestName);

    modal.classList.add('show');

    function close(){
      modal.classList.remove('show');
      modal.removeEventListener('click', onBackdrop);
      modal.querySelector('#ctxCancel').removeEventListener('click', onCancel);
      modal.querySelector('#ctxCreate').removeEventListener('click', onCreate);
      inputClient.removeEventListener('input', maybeSuggestName);
      sel.removeEventListener('change', maybeSuggestName);
    }
    function onBackdrop(e){ if (e.target === modal) close(); }
    function onCancel(){ close(); }
    function onCreate(){
      const instSel = sel.value;
      const name = inputName.value.trim();
      const client = inputClient.value.trim();
      const start = inputStart.value; // YYYY-MM-DD
      const end   = inputEnd.value;   // YYYY-MM-DD
      const calcNow = modal.querySelector('#ctxCalcNow').checked;
      const go = modal.querySelector('#ctxSwitchAfterCreate').checked;
      if (!name){ alert('Informe um nome para o projeto.'); return; }
      try{
        if (go){
          if (window.BL_INSTRUMENT && BL_INSTRUMENT.get() !== instSel){
            BL_INSTRUMENT.set(instSel, {source:'context-bar:new'});
          }
          const id = BL_PROJECT.create(instSel, name);
          if (BL_PROJECT.get(instSel) !== id){
            BL_PROJECT.set(instSel, id, {source:'context-bar:new'});
          }
          setTimeout(()=>{
            if (client){
              const el = bySelectors(['#job-client','[name="job-client"]','#client']);
              if (el) trySet(el, client);
            }
            if (start){ setStart(start); }
            if (end){   setEnd(end);     }
            if (calcNow){
              const btn = document.getElementById('btnPlanCalc') || findButtonByText(/calcular\s+cronograma/i);
              if (btn){ btn.click(); }
            }
          }, 220);
        } else {
          BL_PROJECT.create(instSel, name);
        }
      } finally {
        close();
      }
    }

    modal.addEventListener('click', onBackdrop);
    modal.querySelector('#ctxCancel').addEventListener('click', onCancel);
    modal.querySelector('#ctxCreate').addEventListener('click', onCreate);
    inputName.focus();
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
    const bar = ensureBar();
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

    btnNew.addEventListener('click', ()=> openNewModal(BL_INSTRUMENT.get()));
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
