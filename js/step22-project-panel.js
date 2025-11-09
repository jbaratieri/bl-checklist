/* FILE: js/step22-project-panel.js — Backup/Restore bindings (cleaned & patched) */
(function () {
  'use strict';

  // Toast system
  function ensureToastContainer() {
    var c = document.getElementById('toastContainer');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;max-width:360px;';
    document.body.appendChild(c);
    return c;
  }
  function showToast(msg, opts) {
    opts = opts || {};
    var c = ensureToastContainer();
    var t = document.createElement('div');
    t.className = 'toast ' + (opts.type || 'info');
    t.style.cssText = 'background:#111;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.28);font-size:13px;max-width:100%;opacity:0;transform:translateY(6px);transition:all .28s ease;';
    t.innerText = msg;
    c.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    var ms = (typeof opts.timeout === 'number') ? opts.timeout : (opts.type === 'error' ? 6000 : 3500);
    if (opts.sticky) return { dismiss: function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 280); } };
    setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(function () { t.remove(); }, 280); }, ms);
    return { element: t };
  }

  // small helpers
  function currInst() { return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument') || 'vcl')); }
  function refreshProjectSelector() {
    if (!window.BL_PROJECT) return;
    var inst = currInst();
    var sel = document.querySelector('#selProject');
    if (!sel) return;
    var list = BL_PROJECT.list(inst) || [];
    sel.innerHTML = list.map(function (p) { return '<option value="' + p.id + '">' + (p.name || p.id) + '</option>'; }).join('');
    try { sel.value = BL_PROJECT.get(inst); } catch (_) { }
  }
  function getEl(id) { return document.getElementById(id); }

  // Guard wrapper
  function guard(fn) {
    var busy = false;
    return async function () {
      if (busy) return;
      busy = true;
      try { await fn.apply(this, arguments); }
      finally { busy = false; }
    };
  }

  function ensureBrFileInput() {
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

  function closeDetails(detailsId) {
    try {
      var d = document.getElementById(detailsId);
      if (d && d.tagName && d.tagName.toLowerCase() === 'details') d.removeAttribute('open');
    } catch (_) { }
  }

  function bindEvents() {
    var selProject = document.querySelector('#selProject');
    var selInstrument = document.querySelector('#selInstrument');

    if (selProject && selInstrument) {
      selProject.addEventListener('change', function (e) {
        var inst = currInst();
        var id = (e.target && e.target.value) || '';
        if (window.__BL_PERSIST_APPLYING__) return;
        if (!window.BL_PROJECT) return;
        if (BL_PROJECT.get(inst) === id) return;
        BL_PROJECT.set(inst, id, { source: 'selector' });
        window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst: inst, id: id } }));
      });

      selInstrument.addEventListener('change', function (e) {
        var val = e.target.value;
        if (!val) return;
        if (window.BL_INSTRUMENT) BL_INSTRUMENT.set(val);
        else localStorage.setItem('bl:instrument', val);
        refreshProjectSelector();
        window.dispatchEvent(new CustomEvent('bl:instrument-change', { detail: { inst: val } }));
      });

      var bNew = getEl('btnProjectNew'), bRen = getEl('btnProjectRen'), bDel = getEl('btnProjectDel');
      if (bNew) bNew.addEventListener('click', function () { var name = prompt('Nome do novo projeto:'); if (!name) return; var inst = currInst(); BL_PROJECT.create(inst, name); refreshProjectSelector(); window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst: inst } })); });
      if (bRen) bRen.addEventListener('click', function () { var inst = currInst(); var cur = BL_PROJECT.get(inst); var curName = (BL_PROJECT.list(inst).find(function (x) { return x.id === cur; }) || {}).name || ''; var name = prompt('Novo nome do projeto:', curName); if (!name) return; BL_PROJECT.rename(inst, cur, name); refreshProjectSelector(); window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst: inst, id: cur } })); });
      if (bDel) bDel.addEventListener('click', function () { var inst = currInst(); var cur = BL_PROJECT.get(inst); if (!confirm('Excluir projeto atual da lista? (dados continuam salvos)')) return; BL_PROJECT.remove(inst, cur); refreshProjectSelector(); window.dispatchEvent(new CustomEvent('bl:project-change', { detail: { inst: inst } })); });
    }

    // listeners for BackupRestore
    window.addEventListener('bl:projects-imported', function (e) {
      try {
        refreshProjectSelector();
        var meta = (e && e.detail && e.detail.meta) || null;
        if (meta && meta.inst && meta.proj) {
          try { if (window.BL_PROJECT && typeof BL_PROJECT.set === 'function') BL_PROJECT.set(meta.inst, String(meta.proj)); } catch (_) { }
        }
      } catch (_) { }
    });

    window.addEventListener('bl:project:name-updated', function (e) {
      try {
        var detail = e && e.detail ? e.detail : {};
        refreshProjectSelector();
        var inst = detail.inst || currInst();
        var proj = detail.proj || (window.BL_PROJECT ? BL_PROJECT.get(inst) : localStorage.getItem('bl:project:' + inst));
        var name = detail.name || localStorage.getItem('bl:project:name:' + inst + ':' + proj) || (BL_PROJECT && BL_PROJECT.list ? (BL_PROJECT.list(inst).find(function (x) { return String(x.id) === String(proj); }) || {}).name : null);
        var titleEl = document.querySelector('#project-title') || document.querySelector('.project-name') || document.querySelector('[data-project-name]');
        if (titleEl && name) titleEl.textContent = name;
      } catch (_) { }
    });

    window.addEventListener('bl:images-updated', function () { try { } catch (_) { } });

    var btnExp = getEl('btnExportProject');
    var btnExpAll = getEl('btnExportAllProjects');
    var btnImp = getEl('btnImportProject') || getEl('btnRestoreProject');
    var btnImpOverwrite = getEl('btnImportProjectOverwrite') || getEl('btnRestoreProjectOverwrite');

    var fileInput = ensureBrFileInput();

    if (btnExp) {
      btnExp.addEventListener('click', guard(async function () {
        showToast('Preparando export do projeto...', { type: 'info', timeout: 1500 });
        try {
          var inst = currInst();
          var proj = (window.BL_PROJECT && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default';

          if (typeof window.exportProjectFile === 'function') {
            await window.exportProjectFile(inst, proj);
            showToast('Export concluído — arquivo salvo no seu computador.', { type: 'success' });
            return;
          }

          if (window.BackupRestore && typeof BackupRestore.exportProject === 'function') {
            var payload = await BackupRestore.exportProject(inst, proj);
            var name = 'luthierpro-export-' + inst + '-proj' + proj + '-' + (new Date().toISOString().replace(/[:.]/g, '-')) + '.json';
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 500);
            showToast('Export concluído — arquivo salvo no seu computador.', { type: 'success' });
            return;
          }

          showToast('Função de export não encontrada (exportProjectFile / BackupRestore.exportProject).', { type: 'error', timeout: 6000 });
        } catch (err) {
          console.error(err);
          showToast('Falha ao exportar: ' + (err && err.message ? err.message : err), { type: 'error', timeout: 7000 });
        }
      }));
    }

    if (btnExpAll) {
      btnExpAll.addEventListener('click', guard(async function () {
        showToast('Iniciando export All projects...', { type: 'info', timeout: 1500 });
        try {
          if (window.BackupRestore && typeof BackupRestore.exportAllProjects === 'function') {
            var payload = await BackupRestore.exportAllProjects();
            var name = 'luthierpro-export-all-' + (new Date().toISOString().replace(/[:.]/g, '-')) + '.json';
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 500);
            showToast('Export (All) concluído — arquivo salvo no seu computador.', { type: 'success' });
          } else {
            showToast('ExportAll não disponível (BackupRestore.exportAllProjects ausente).', { type: 'error' });
          }
        } catch (err) {
          console.error(err);
          showToast('Falha no exportAll: ' + (err && err.message ? err.message : err), { type: 'error' });
        }
      }));
    }

    if (btnImp) {
      btnImp.addEventListener('click', function () { fileInput._importMode = 'merge'; fileInput.click(); });
    }

    // btnImpOverwrite may not exist (we removed overwrite button). Keep handler only if present.
    if (btnImpOverwrite) {
      btnImpOverwrite.addEventListener('click', function () {
        var ok = confirm('Deseja substituir os dados existentes do(s) projeto(s) importados? Esta ação pode apagar dados atuais.');
        if (!ok) return;
        fileInput._importMode = 'overwrite';
        fileInput.click();
      });
    }

    fileInput.addEventListener('change', guard(async function () {
      var f = fileInput.files && fileInput.files[0];
      var mode = fileInput._importMode || 'merge';
      fileInput._importMode = null;
      if (!f) return;
      showToast('Iniciando import — lendo arquivo...', { type: 'info', timeout: 1500 });

      try {
        if (window.BackupRestore && typeof BackupRestore.importFromFile === 'function') {
          var res = await BackupRestore.importFromFile(f, { overwrite: mode === 'overwrite' });
          showToast('Import concluído — aplicando mudanças.', { type: 'success' });
          closeDetails('btnImportToggle');

          try {
            refreshProjectSelector();
            try { window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta: (res && res.meta) || null } })); } catch (_) { }
            try { window.dispatchEvent(new CustomEvent('bl:project:name-updated', { detail: (res && res.meta) || {} })); } catch (_) { }
            try { window.dispatchEvent(new Event('bl:images-updated')); } catch (_) { }

            if (mode === 'overwrite') {
              showToast('Substituição concluída — recarregando...', { type: 'info', timeout: 1800 });
              setTimeout(function () { location.reload(); }, 900);
              return;
            }
          } catch (e) {
            console.warn('[ProjectPanel] post-import handling failed', e);
          }
          return;
        }

        if (typeof window.importProjectFile === 'function') {
          var res2 = await window.importProjectFile(f);
          showToast('Import concluído — aplicando mudanças.', { type: 'success' });
          closeDetails('btnImportToggle');
          try { refreshProjectSelector(); } catch (_) { }
          try { window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta: (res2 && res2.meta) || null } })); } catch (_) { }
          try { window.dispatchEvent(new CustomEvent('bl:project:name-updated', { detail: (res2 && res2.meta) || {} })); } catch (_) { }
          try { window.dispatchEvent(new Event('bl:images-updated')); } catch (_) { }
          if (mode === 'overwrite') { showToast('Substituição concluída — recarregando...', { type: 'info', timeout: 1800 }); setTimeout(function () { location.reload(); }, 900); }
          return;
        }

        var txt = await f.text();
        var payload = null;
        try { payload = JSON.parse(txt); } catch (e) { throw new Error('Arquivo JSON inválido'); }
        if (window.BackupRestore && typeof BackupRestore.importPayload === 'function') {
          var res3 = await BackupRestore.importPayload(payload, { merge: mode === 'merge', overwrite: mode === 'overwrite' });
          showToast('Import via importPayload concluído.', { type: 'success' });
          closeDetails('btnImportToggle');
          try { refreshProjectSelector(); } catch (_) { }
          try { window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta: (res3 && res3.meta) || null } })); } catch (_) { }
          try { window.dispatchEvent(new CustomEvent('bl:project:name-updated', { detail: (res3 && res3.meta) || {} })); } catch (_) { }
          try { window.dispatchEvent(new Event('bl:images-updated')); } catch (_) { }
          if (mode === 'overwrite') { setTimeout(function () { location.reload(); }, 900); }
          return;
        }

        showToast('Nenhuma função de import disponível (BackupRestore.importFromFile/importProjectFile/importPayload).', { type: 'error', timeout: 7000 });
      } catch (err) {
        console.error(err);
        showToast('Falha ao importar: ' + (err && err.message ? err.message : err), { type: 'error', timeout: 7000 });
      } finally {
        try { fileInput.value = ''; } catch (_) { }
      }
    }));

    // --- ensure export/import dropdowns close each other ---
    (function attachExportImportToggleHandlers() {
      var exportDetails = document.getElementById('btnExportToggle');
      var importDetails = document.getElementById('btnImportToggle');
      if (!exportDetails && !importDetails) return;

      function closeOthers(opened) {
        try {
          if (opened === exportDetails && importDetails) importDetails.removeAttribute('open');
          if (opened === importDetails && exportDetails) exportDetails.removeAttribute('open');
        } catch (e) {
          console.warn('[ProjectPanel] closeOthers error', e);
        }
      }

      if (exportDetails) {
        exportDetails.addEventListener('toggle', function () {
          if (exportDetails.open) closeOthers(exportDetails);
        });
      }
      if (importDetails) {
        importDetails.addEventListener('toggle', function () {
          if (importDetails.open) closeOthers(importDetails);
        });
      }
    })();

  } // bindEvents

  function init() { try { bindEvents(); refreshProjectSelector(); } catch (e) { console.warn('[ProjectPanel] init error', e); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
