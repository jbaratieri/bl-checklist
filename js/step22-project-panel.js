/* FILE: js/step22-project-panel.js — Updated bindings for Backup / Restore buttons
   - Adds buttons/menu: Export atual, Exportar tudo, Import (merge), Import (overwrite)
   - Uses BackupRestore API (exportProject, exportAllProjects, importPayloadWithOptions)
   - Shows basic confirm dialogs and handles download + import file input
   - Emits user-friendly alerts and prevents double clicks
*/
(function(){
  'use strict';

  // ---------- Simple toast system (replaces alerts) ----------
  function ensureToastContainer(){
    var c = document.getElementById('toastContainer');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;max-width:360px;';
    document.body.appendChild(c);
    return c;
  }
  function showToast(msg, opts){
    opts = opts || {};
    var c = ensureToastContainer();
    var t = document.createElement('div');
    t.className = 'toast '+(opts.type||'info');
    t.style.cssText = 'background:#222;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.3);font-size:13px;max-width:100%;opacity:0;transform:translateY(6px);transition:all .28s ease;';
    t.innerText = msg;
    c.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity='1'; t.style.transform='translateY(0)'; });
    var ms = opts.timeout || 3500;
    if (opts.sticky) return { dismiss: function(){ t.style.opacity='0'; setTimeout(()=>t.remove(),280); } };
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(6px)'; setTimeout(()=>t.remove(),280); }, ms);
    return { element: t };
  }

  function currInst(){ return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl')); }

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

    selProject.addEventListener('change', (e) => {
      const inst = currInst();
      const id = (e.target && e.target.value) || '';
      if (window.__BL_PERSIST_APPLYING__) return;
      if (!window.BL_PROJECT) return;
      if (BL_PROJECT.get(inst) === id) return;
      BL_PROJECT.set(inst, id, { source: 'selector' });
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id } }));
    });

    selInstrument.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      if (window.BL_INSTRUMENT) BL_INSTRUMENT.set(val);
      else localStorage.setItem('bl:instrument', val);
      refresh();
      window.dispatchEvent(new CustomEvent('bl:instrument-change', { detail: { inst: val } }));
    });

    document.querySelector('#btnProjectNew').addEventListener('click', ()=>{
      const name = prompt('Nome do novo projeto:'); if (!name) return;
      const inst = currInst(); BL_PROJECT.create(inst, name); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } }));
    });

    document.querySelector('#btnProjectRen').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      const curName = (BL_PROJECT.list(inst).find(x=>x.id===cur)||{}).name || '';
      const name = prompt('Novo nome do projeto:', curName); if (!name) return;
      BL_PROJECT.rename(inst, cur, name); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id: cur } }));
    });

    document.querySelector('#btnProjectDel').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      if (!confirm('Excluir projeto atual da lista? (dados continuam salvos)')) return;
      BL_PROJECT.remove(inst, cur); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } }));
    });

    // ---------- Backup / Restore bindings (enhanced)
    try {
      const btnExp = document.getElementById('btnExportProject');
      const btnExpAll = document.getElementById('btnExportAllProjects');
      const btnImp = document.getElementById('btnRestoreProject');
      const btnImpOverwrite = document.getElementById('btnRestoreProjectOverwrite');

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

      // helper UI guard
      function guard(fn){
        let busy = false;
        return async function(){ if (busy) return; busy = true; try { await fn.apply(this, arguments); } finally { busy = false; } };
      }

      if (btnExp) {
        btnExp.addEventListener('click', guard(async function(){
          try {
            const inst = currInst();
            const proj = (window.BL_PROJECT && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default';
            if (typeof window.exportProjectFile === 'function') {
              await window.exportProjectFile(inst, proj);
              showToast('Export concluído — arquivo salvo no seu computador.', { type:'success' });
            } else if (window.BackupRestore && typeof window.BackupRestore.exportProject === 'function'){
              const p = await BackupRestore.exportProject(inst, proj);
              const name = 'luthierpro-export-'+inst+'-proj'+proj+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
              const blob = new Blob([JSON.stringify(p, null, 2)], { type:'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
              showToast('Export concluído — arquivo salvo no seu computador.', { type:'success' });
            } else {
              showToast('Função exportProjectFile/BackupRestore.exportProject não encontrada.', { type:'error' });
            }
          } catch (e) { console.error(e); showToast('Falha ao exportar: ' + (e && e.message ? e.message : e), { type:'error' }); }
        }));
      }

      if (btnExpAll) {
        btnExpAll.addEventListener('click', guard(async function(){
          try {
            if (!window.BackupRestore || typeof BackupRestore.exportAllProjects !== 'function'){
              showToast('ExportAll não disponível (BackupRestore.exportAllProjects ausente).', { type:'error' }); return;
            }
            const payload = await BackupRestore.exportAllProjects();
            const name = 'luthierpro-export-all-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
            showToast('Export (All) concluído — arquivo salvo no seu computador.', { type:'success' });
          } catch(e){ console.error(e); showToast('Falha no exportAll: '+(e&&e.message||e), { type:'error' }); }
        }));
      }

      if (btnImp) {
        btnImp.addEventListener('click', function(){ _br_file_input._importMode = 'merge'; _br_file_input.click(); });
      }

      if (btnImpOverwrite) {
        btnImpOverwrite.addEventListener('click', function(){ if (!confirm('Deseja substituir os dados existentes do(s) projeto(s) importados? Esta ação pode apagar dados atuais.')) return; _br_file_input._importMode = 'overwrite'; _br_file_input.click(); });
      }

      _br_file_input.addEventListener('change', guard(async function(){
        const f = _br_file_input.files && _br_file_input.files[0];
        _br_file_input._importMode = _br_file_input._importMode || 'merge';
        const mode = _br_file_input._importMode;
        if (!f) return;
        try {
          if (window.BackupRestore && typeof BackupRestore.importFromFile === 'function') {
            const res = await BackupRestore.importFromFile(f);
            showToast('Import concluído — recarregando para aplicar mudanças.', { type:'success' });
            return res;
          } else if (window.importProjectFile && typeof window.importProjectFile === 'function'){
            await window.importProjectFile(f);
            showToast('Import concluído — recarregando para aplicar mudanças.', { type:'success' });
            return { ok:true };
          } else if (window.BackupRestore && typeof BackupRestore.importPayloadWithOptions === 'function'){
            const txt = await f.text(); const payload = JSON.parse(txt);
            const res = await BackupRestore.importPayloadWithOptions(payload, { merge: mode==='merge', overwrite: mode==='overwrite' });
            showToast('Import concluído — recarregando para aplicar mudanças.', { type:'success' });
            return res;
          } else {
            showToast('Função de import não encontrada. Verifique se js/backup-restore.v1.js foi incluído.', { type:'error' });
          }
        } catch (err) { console.error(err); showToast('Falha ao importar: ' + (err && err.message ? err.message : err), { type:'error' }); }
        finally { _br_file_input.value = ''; _br_file_input._importMode = null; }
      }));

    } catch (e) { console.warn('[ProjectPanel] backup bindings failed', e); }

  }

  function init(){ bindEvents(); refresh(); }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
(function(){
  'use strict';

  function currInst(){ return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl')); }

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

    selProject.addEventListener('change', (e) => {
      const inst = currInst();
      const id = (e.target && e.target.value) || '';
      if (window.__BL_PERSIST_APPLYING__) return;
      if (!window.BL_PROJECT) return;
      if (BL_PROJECT.get(inst) === id) return;
      BL_PROJECT.set(inst, id, { source: 'selector' });
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id } }));
    });

    selInstrument.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      if (window.BL_INSTRUMENT) BL_INSTRUMENT.set(val);
      else localStorage.setItem('bl:instrument', val);
      refresh();
      window.dispatchEvent(new CustomEvent('bl:instrument-change', { detail: { inst: val } }));
    });

    document.querySelector('#btnProjectNew').addEventListener('click', ()=>{
      const name = prompt('Nome do novo projeto:'); if (!name) return;
      const inst = currInst(); BL_PROJECT.create(inst, name); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } }));
    });

    document.querySelector('#btnProjectRen').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      const curName = (BL_PROJECT.list(inst).find(x=>x.id===cur)||{}).name || '';
      const name = prompt('Novo nome do projeto:', curName); if (!name) return;
      BL_PROJECT.rename(inst, cur, name); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id: cur } }));
    });

    document.querySelector('#btnProjectDel').addEventListener('click', ()=>{
      const inst = currInst(); const cur = BL_PROJECT.get(inst);
      if (!confirm('Excluir projeto atual da lista? (dados continuam salvos)')) return;
      BL_PROJECT.remove(inst, cur); refresh();
      window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } }));
    });

    // ---------- Backup / Restore bindings (enhanced)
    try {
      const btnExp = document.getElementById('btnExportProject');
      const btnExpAll = document.getElementById('btnExportAllProjects');
      const btnImp = document.getElementById('btnRestoreProject');
      const btnImpOverwrite = document.getElementById('btnRestoreProjectOverwrite');

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

      // helper UI guard
      function guard(fn){
        let busy = false;
        return async function(){ if (busy) return; busy = true; try { await fn.apply(this, arguments); } finally { busy = false; } };
      }

      if (btnExp) {
        btnExp.addEventListener('click', guard(async function(){
          try {
            const inst = currInst();
            const proj = (window.BL_PROJECT && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default';
            if (typeof window.exportProjectFile === 'function') {
              await window.exportProjectFile(inst, proj);
              alert('Export concluído — arquivo salvo no seu computador.');
            } else if (window.BackupRestore && typeof window.BackupRestore.exportProject === 'function'){
              const p = await BackupRestore.exportProject(inst, proj);
              const name = 'luthierpro-export-'+inst+'-proj'+proj+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
              // força download
              const blob = new Blob([JSON.stringify(p, null, 2)], { type:'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
              alert('Export concluído — arquivo salvo no seu computador.');
            } else {
              alert('Função exportProjectFile/BackupRestore.exportProject não encontrada. Verifique se js/backup-restore.v1.js foi incluído.');
            }
          } catch (e) { console.error(e); alert('Falha ao exportar: ' + (e && e.message ? e.message : e)); }
        }));
      }

      if (btnExpAll) {
        btnExpAll.addEventListener('click', guard(async function(){
          try {
            if (!window.BackupRestore || typeof BackupRestore.exportAllProjects !== 'function'){
              alert('ExportAll não disponível (BackupRestore.exportAllProjects ausente).'); return;
            }
            const payload = await BackupRestore.exportAllProjects();
            const name = 'luthierpro-export-all-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500);
            alert('Export (All) concluído — arquivo salvo no seu computador.');
          } catch(e){ console.error(e); alert('Falha no exportAll: '+(e&&e.message||e)); }
        }));
      }

      if (btnImp) {
        btnImp.addEventListener('click', function(){ _br_file_input._importMode = 'merge'; _br_file_input.click(); });
      }

      if (btnImpOverwrite) {
        btnImpOverwrite.addEventListener('click', function(){ _br_file_input._importMode = 'overwrite'; _br_file_input.click(); });
      }

      _br_file_input.addEventListener('change', guard(async function(){
        const f = _br_file_input.files && _br_file_input.files[0];
        _br_file_input._importMode = _br_file_input._importMode || 'merge';
        const mode = _br_file_input._importMode;
        if (!f) return;
        try {
          if (window.BackupRestore && typeof BackupRestore.importFromFile === 'function') {
            const res = await BackupRestore.importFromFile(f);
            alert('Import concluído — recarregando para aplicar mudanças.');
            // note: BackupRestore already triggers reload; we still return
            return res;
          } else if (window.importProjectFile && typeof window.importProjectFile === 'function'){
            // legacy shim may call importProjectFile and that will call BackupRestore.importFromFile
            await window.importProjectFile(f);
            alert('Import concluído — recarregando para aplicar mudanças.');
            return { ok:true };
          } else if (window.BackupRestore && typeof BackupRestore.importPayloadWithOptions === 'function'){
            const txt = await f.text(); const payload = JSON.parse(txt);
            const res = await BackupRestore.importPayloadWithOptions(payload, { merge: mode==='merge', overwrite: mode==='overwrite' });
            alert('Import concluído — recarregando para aplicar mudanças.');
            return res;
          } else {
            alert('Função de import não encontrada. Verifique se js/backup-restore.v1.js foi incluído.');
          }
        } catch (err) { console.error(err); alert('Falha ao importar: ' + (err && err.message ? err.message : err)); }
        finally { _br_file_input.value = ''; _br_file_input._importMode = null; }
      }));

    } catch (e) { console.warn('[ProjectPanel] backup bindings failed', e); }

  }

  function init(){ bindEvents(); refresh(); }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
