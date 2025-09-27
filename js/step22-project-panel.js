/* step22-project-panel.js — controla seleção e gerenciamento de projetos */
(function(){
  'use strict';

  function currInst(){
    return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
  }

  function refresh(){
    if (!window.BL_PROJECT) return;
    const inst = currInst();
    const sel  = document.querySelector('#selProject');
    if (!sel) return;
    const list = BL_PROJECT.list(inst);
    sel.innerHTML = list.map(p=> `<option value="${p.id}">${p.name}</option>`).join('');
    sel.value = BL_PROJECT.get(inst);
  }

  function bindEvents(){
    const selProject = document.querySelector('#selProject');
    const selInstrument = document.querySelector('#selInstrument');
    if (!selProject || !selInstrument) return;

    // trocar projeto
    selProject.addEventListener('change', (e) => {
      const inst = currInst();
      const id = (e.target && e.target.value) || '';
      if (window.__BL_PERSIST_APPLYING__) return;
      if (!window.BL_PROJECT) return;
      if (BL_PROJECT.get(inst) === id) return;
      BL_PROJECT.set(inst, id, { source: 'selector' });

      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id } }));
    });

    // trocar instrumento
    selInstrument.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      if (window.BL_INSTRUMENT) BL_INSTRUMENT.set(val);
      else localStorage.setItem('bl:instrument', val);
      refresh();

      window.dispatchEvent(new CustomEvent('bl:instrument-change', { detail: { inst: val } }));
    });

    // criar
    document.querySelector('#btnProjectNew').addEventListener('click', ()=>{
      const name = prompt('Nome do novo projeto:'); if (!name) return;
      const inst = currInst(); BL_PROJECT.create(inst, name); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } }));
    });

    // renomear
    document.querySelector('#btnProjectRen').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      const curName = (BL_PROJECT.list(inst).find(x=>x.id===cur)||{}).name || '';
      const name = prompt('Novo nome do projeto:', curName); if (!name) return;
      BL_PROJECT.rename(inst, cur, name); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id: cur } }));
    });

    // excluir
    document.querySelector('#btnProjectDel').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      if (!confirm('Excluir projeto atual da lista? (dados continuam salvos)')) return;
      BL_PROJECT.remove(inst, cur); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } }));
    });
  }

  function init(){
    bindEvents();
    refresh();
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
