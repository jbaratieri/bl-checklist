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

        // ---------------- Backup / Restore bindings ----------------
    try {
      const btnExp = document.getElementById('btnExportProject');
      const btnImp = document.getElementById('btnRestoreProject');

      // cria input file escondido (reutilizável)
      let _br_file_input = document.getElementById('_br_file_input');
      if (!_br_file_input) {
        _br_file_input = document.createElement('input');
        _br_file_input.type = 'file';
        _br_file_input.accept = '.luthierproj.json,application/json';
        _br_file_input.id = '_br_file_input';
        _br_file_input.style.display = 'none';
        document.body.appendChild(_br_file_input);
      }

      if (btnExp) {
        btnExp.addEventListener('click', async function(){
          try {
            const inst = currInst();
            const proj = (window.BL_PROJECT && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default';
            const token = (window.currentDrawToken || (document.querySelector('[data-step]') && document.querySelector('[data-step]').getAttribute('data-step'))) || 'root';
            if (typeof window.exportProjectFile === 'function') {
              await window.exportProjectFile(inst, proj, token);
              alert('Export concluído — arquivo salvo no seu computador.');
            } else {
              alert('Função exportProjectFile não encontrada. Verifique se js/backup-restore.v1.js foi incluído.');
            }
          } catch (e) {
            console.error(e);
            alert('Falha ao exportar: ' + (e && e.message ? e.message : e));
          }
        });
      }

      if (btnImp) {
        btnImp.addEventListener('click', function(){
          _br_file_input.click();
        });
      }

      _br_file_input.addEventListener('change', async function(){
        const f = _br_file_input.files && _br_file_input.files[0];
        if (!f) return;
        try {
          if (typeof window.importProjectFile === 'function') {
            await window.importProjectFile(f);
            alert('Import concluído — recarregue a página para aplicar mudanças (hard reload recomendado).');
          } else {
            alert('Função importProjectFile não encontrada. Verifique se js/backup-restore.v1.js foi incluído.');
          }
        } catch (err) {
          console.error(err);
          alert('Falha ao importar: ' + (err && err.message ? err.message : err));
        } finally {
          _br_file_input.value = '';
        }
      });
    } catch (e) { console.warn('[ProjectPanel] backup bindings failed', e); }

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
