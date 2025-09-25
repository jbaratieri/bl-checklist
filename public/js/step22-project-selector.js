/* step22-project-selector.v2.js — monta quando o cabeçalho existir */
(function(){
  'use strict';

  function doRender(host){
    if (host.querySelector('#projectSelector')) return;
    const wrap = document.createElement('div');
    wrap.id = 'projectSelector';
    wrap.style.marginTop = '8px';
    wrap.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <label style="display:flex; align-items:center; gap:.5rem;">
          Projeto
          <select id="selProject" class="persist"></select>
        </label>
        <button class="btn" id="btnProjectNew" type="button">Novo</button>
        <button class="btn" id="btnProjectRen" type="button">Renomear</button>
        <button class="btn" id="btnProjectDel" type="button">Excluir</button>
        <small style="opacity:.75">por instrumento</small>
      </div>
    `;
    host.appendChild(wrap);

    function currInst(){
      return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    }
    function refresh(){
      if (!window.BL_PROJECT) return;
      const inst = currInst();
      const sel  = wrap.querySelector('#selProject');
      const list = BL_PROJECT.list(inst);
      sel.innerHTML = list.map(p=> `<option value="${p.id}">${p.name}</option>`).join('');
      sel.value = BL_PROJECT.get(inst);
    }
    refresh();

    // >>> handler corrigido aqui <<<
    wrap.querySelector('#selProject').addEventListener('change', (e) => {
      const inst = currInst();
      const id = (e.target && e.target.value) || '';
      if (window.__BL_PERSIST_APPLYING__) return;
      if (!window.BL_PROJECT) return;
      if (BL_PROJECT.get(inst) === id) return;
      BL_PROJECT.set(inst, id, { source: 'selector' });
    });

    wrap.querySelector('#btnProjectNew').addEventListener('click', ()=>{
      const name = prompt('Nome do novo projeto:'); if (!name) return;
      const inst = currInst(); BL_PROJECT.create(inst, name); refresh();
    });
    wrap.querySelector('#btnProjectRen').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      const curName = (BL_PROJECT.list(inst).find(x=>x.id===cur)||{}).name || '';
      const name = prompt('Novo nome do projeto:', curName); if (!name) return;
      BL_PROJECT.rename(inst, cur, name); refresh();
    });
    wrap.querySelector('#btnProjectDel').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      if (!confirm('Excluir projeto atual da lista? (dados continuam salvos)')) return;
      BL_PROJECT.remove(inst, cur); refresh();
    });

    window.addEventListener('bl:instrument-change', refresh);
    window.addEventListener('bl:project-change', refresh);
  }

  function mountWhenReady(){
    const host = document.getElementById('projectHeader') || document.querySelector('.project-header');
    if (host) return doRender(host);
    const mo = new MutationObserver(()=>{
      const h = document.getElementById('projectHeader') || document.querySelector('.project-header');
      if (h){ mo.disconnect(); doRender(h); }
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', mountWhenReady); }
  else { mountWhenReady(); }
})();
