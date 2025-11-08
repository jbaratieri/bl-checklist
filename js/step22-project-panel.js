/* FILE: js/step22-project-panel.js — Backup/Restore bindings (cleaned) */
(function(){
  'use strict';

  // ---------- Toast system (minimal, non-blocking) ----------
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
    t.style.cssText = [
      'background:#111;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.28);',
      'font-size:13px;max-width:100%;opacity:0;transform:translateY(6px);transition:all .28s ease;'
    ].join('');
    t.innerText = msg;
    c.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity='1'; t.style.transform='translateY(0)'; });
    var ms = (typeof opts.timeout === 'number') ? opts.timeout : (opts.type === 'error' ? 6000 : 3500);
    if (opts.sticky) return { dismiss: function(){ t.style.opacity='0'; setTimeout(()=>t.remove(),280); } };
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(6px)'; setTimeout(()=>t.remove(),280); }, ms);
    return { element: t };
  }

  // ---------- small helpers ----------
  function currInst(){ return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl')); }
  function refreshProjectSelector(){
    if (!window.BL_PROJECT) return;
    const inst = currInst();
    const sel  = document.querySelector('#selProject');
    if (!sel) return;
    const list = BL_PROJECT.list(inst);
    sel.innerHTML = list.map(p=> `<option value="${p.id}">${p.name}</option>`).join('');
    sel.value = BL_PROJECT.get(inst);
  }
  function getEl(id){ return document.getElementById(id); }

  // Guard wrapper to prevent double clicks (per-button)
  function guard(fn){
    var busy = false;
    return async function(){
      if (busy) return;
      busy = true;
      try { await fn.apply(this, arguments); }
      finally { busy = false; }
    };
  }

  // create or reuse hidden file input used by import buttons
  function ensureBrFileInput(){
    var inp = document.getElementById('_br_file_input') || document.getElementById('br_file_input');
    if (inp) return inp;
    inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.luthierproj.json,application/json,.json';
    inp.id = '_br_file_input';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    return inp;
  }

  // Helper: close details dropdown if present
  function closeDetails(detailsId){
    try {
      var d = document.getElementById(detailsId);
      if (d && d.tagName && d.tagName.toLowerCase() === 'details') d.removeAttribute('open');
    } catch(_) {}
  }

  // ---------- core binding logic ----------
  function bindEvents(){
    // basic project/instrument selectors (safe if missing)
    const selProject = document.querySelector('#selProject');
    const selInstrument = document.querySelector('#selInstrument');
    if (selProject && selInstrument) {
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
        refreshProjectSelector();
        window.dispatchEvent(new CustomEvent('bl:instrument-change', { detail: { inst: val } }));
      });

      // project CRUD buttons (new/rename/delete) — if present
      const bNew = getEl('btnProjectNew'), bRen = getEl('btnProjectRen'), bDel = getEl('btnProjectDel');
      if (bNew) bNew.addEventListener('click', ()=>{ const name = prompt('Nome do novo projeto:'); if (!name) return; const inst = currInst(); BL_PROJECT.create(inst, name); refreshProjectSelector(); window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } })); });
      if (bRen) bRen.addEventListener('click', ()=>{ const inst = currInst(); const cur = BL_PROJECT.get(inst); const curName = (BL_PROJECT.list(inst).find(x=>x.id===cur)||{}).name || ''; const name = prompt('Novo nome do projeto:', curName); if (!name) return; BL_PROJECT.rename(inst, cur, name); refreshProjectSelector(); window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst, id: cur } })); });
      if (bDel) bDel.addEventListener('click', ()=>{ const inst = currInst(); const cur = BL_PROJECT.get(inst); if (!confirm('Excluir projeto atual da lista? (dados continuam salvos)')) return; BL_PROJECT.remove(inst, cur); refreshProjectSelector(); window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst } })); });
    }

    // ---------- Backup / Restore buttons ----------
    const btnExp = getEl('btnExportProject');
    const btnExpAll = getEl('btnExportAllProjects');
    // note: your HTML uses btnImportProject / btnImportProjectOverwrite; support both sets
    const btnImp = getEl('btnImportProject') || getEl('btnRestoreProject');
    const btnImpOverwrite = getEl('btnImportProjectOverwrite') || getEl('btnRestoreProjectOverwrite');

    const fileInput = ensureBrFileInput();

    // Export current project
    if (btnExp){
      btnExp.addEventListener('click', guard(async function(){
        showToast('Preparando export do projeto...', { type:'info', timeout:1500 });
        try {
          const inst = currInst();
          const proj = (window.BL_PROJECT && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default';

          if (typeof window.exportProjectFile === 'function') {
            await window.exportProjectFile(inst, proj);
            showToast('Export concluído — arquivo salvo no seu computador.', { type:'success' });
            return;
          }

          if (window.BackupRestore && typeof BackupRestore.exportProject === 'function'){
            const payload = await BackupRestore.exportProject(inst, proj);
            const name = 'luthierpro-export-'+inst+'-proj'+proj+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),500);
            showToast('Export concluído — arquivo salvo no seu computador.', { type:'success' });
            return;
          }

          showToast('Função de export não encontrada (exportProjectFile / BackupRestore.exportProject).', { type:'error', timeout:6000 });
        } catch (err){
          console.error(err);
          showToast('Falha ao exportar: '+(err && err.message ? err.message : err), { type:'error', timeout:7000 });
        }
      } ));
    }

    // Export all projects (if API provides)
    if (btnExpAll){
      btnExpAll.addEventListener('click', guard(async function(){
        showToast('Iniciando export "All projects"...', { type:'info', timeout:1500 });
        try {
          if (window.BackupRestore && typeof BackupRestore.exportAllProjects === 'function'){
            const payload = await BackupRestore.exportAllProjects();
            const name = 'luthierpro-export-all-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),500);
            showToast('Export (All) concluído — arquivo salvo no seu computador.', { type:'success' });
          } else {
            showToast('ExportAll não disponível (BackupRestore.exportAllProjects ausente).', { type:'error' });
          }
        } catch (err){
          console.error(err);
          showToast('Falha no exportAll: '+(err && err.message ? err.message : err), { type:'error' });
        }
      } ));
    }

    // Import (merge)
    if (btnImp){
      btnImp.addEventListener('click', function(){
        fileInput._importMode = 'merge';
        fileInput.click();
      });
    }

    // Import (overwrite)
    if (btnImpOverwrite){
      btnImpOverwrite.addEventListener('click', function(){
        var ok = confirm('Deseja substituir os dados existentes do(s) projeto(s) importados? Esta ação pode apagar dados atuais.');
        if (!ok) return;
        fileInput._importMode = 'overwrite';
        fileInput.click();
      });
    }

    // file input change handler
    fileInput.addEventListener('change', guard(async function(){
      const f = fileInput.files && fileInput.files[0];
      const mode = fileInput._importMode || 'merge';
      fileInput._importMode = null;
      if (!f) return;
      showToast('Iniciando import — lendo arquivo...', { type:'info', timeout:1500 });

      try {
        // Prefer BackupRestore.importFromFile(file, options)
        if (window.BackupRestore && typeof BackupRestore.importFromFile === 'function'){
          await BackupRestore.importFromFile(f, { overwrite: mode === 'overwrite' });
          showToast('Import concluído — aplicando mudanças.', { type:'success' });
          closeDetails('btnImportToggle');
          if (mode === 'overwrite') {
            showToast('Substituição concluída — recarregando...', { type:'info', timeout:1800 });
            setTimeout(()=> location.reload(), 900);
          }
          return;
        }

        // Next fallback: global importProjectFile(file)
        if (typeof window.importProjectFile === 'function'){
          await window.importProjectFile(f);
          showToast('Import concluído — aplicando mudanças.', { type:'success' });
          closeDetails('btnImportToggle');
          if (mode === 'overwrite') {
            showToast('Substituição concluída — recarregando...', { type:'info', timeout:1800 });
            setTimeout(()=> location.reload(), 900);
          }
          return;
        }

        // fallback: read file + call BackupRestore.importPayload (if available)
        const txt = await f.text();
        let payload = null;
        try { payload = JSON.parse(txt); } catch(e){ throw new Error('Arquivo JSON inválido'); }
        if (window.BackupRestore && typeof BackupRestore.importPayload === 'function'){
          await BackupRestore.importPayload(payload, { merge: mode==='merge', overwrite: mode==='overwrite' });
          showToast('Import via importPayload concluído.', { type:'success' });
          closeDetails('btnImportToggle');
          if (mode === 'overwrite') { setTimeout(()=> location.reload(), 900); }
          return;
        }

        showToast('Nenhuma função de import disponível (BackupRestore.importFromFile/importProjectFile/importPayload).', { type:'error', timeout:7000 });
      } catch (err){
        console.error(err);
        showToast('Falha ao importar: '+(err && err.message ? err.message : err), { type:'error', timeout:7000 });
      } finally {
        try { fileInput.value = ''; } catch(_) {}
      }
    } ));

  } // bindEvents

  // init
  function init(){ try { bindEvents(); refreshProjectSelector(); } catch(e){ console.warn('[ProjectPanel] init error', e); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
