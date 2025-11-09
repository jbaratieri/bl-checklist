/* FILE: js/backup-restore.v1.js — Backup & Restore for LuthierPro (v1.1 patched)
   - exportProject / exportAllProjects
   - importPayload with robust merge/overwrite heuristics
   - importFromFile(file, options)
   - Added heuristics to ensure project name/index keys are written on single-project import
   - Toggle debug: window.BL_BACKUP_DEBUG = true
*/
(function () {
  'use strict';
  if (window.__BL_BACKUP_V1__) return; window.__BL_BACKUP_V1__ = true;

  // debug toggle
  window.BL_BACKUP_DEBUG = window.BL_BACKUP_DEBUG || false;
  function dbg() { if (window.BL_BACKUP_DEBUG) try { console.debug.apply(console, arguments); } catch(_) {} }
  function info() { if (window.BL_BACKUP_DEBUG) try { console.info.apply(console, arguments); } catch(_) {} }

  // utilities
  function jsonTryParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }
  function nowISO() { return new Date().toISOString(); }
  function downloadJSON(obj, name) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name || ('luthierpro-backup-' + Date.now() + '.json');
    document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 400);
  }

  function currInst() { return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument') || 'vcl')); }
  function currProj(inst) { try { return (window.BL_PROJECT ? BL_PROJECT.get(inst) : (localStorage.getItem('bl:project:' + inst) || 'default')); } catch (_) { return (localStorage.getItem('bl:project:' + inst) || 'default'); } }

  // heurística para extrair assetKey (reverse de keyFor)
  function assetKeyFromLocalKey(localKey) {
    try { const parts = String(localKey).split(':'); if (parts.length >= 5) return parts.slice(4).join(':'); } catch (_) { } return String(localKey);
  }

  // Read images from IDB for an assetKey prefix (tries several blImg APIs)
  async function readImagesFromIDBForAsset(assetKey) {
    const out = [];
    if (!window.blImgListPrefix) return out;
    try {
      const recs = await window.blImgListPrefix(assetKey);
      if (!Array.isArray(recs)) return out;
      for (const r of recs) {
        try {
          // r might already include dataURL & addedAt in your implementation
          if (r && r.dataURL) { out.push({ key: r.key, dataURL: r.dataURL, addedAt: r.addedAt || Date.now() }); continue; }
          // otherwise try blImgGet
          if (window.blImgGet) {
            const full = await window.blImgGet(r.key);
            if (!full) continue;
            if (full.dataURL) {
              out.push({ key: r.key, dataURL: full.dataURL, addedAt: full.addedAt || Date.now() });
            } else if (full.blob) {
              // convert blob -> dataURL
              const dataURL = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(full.blob); });
              out.push({ key: r.key, dataURL, addedAt: full.addedAt || Date.now() });
            } else if (typeof full.toDataURL === 'function') {
              const dataURL = await full.toDataURL();
              out.push({ key: r.key, dataURL, addedAt: full.addedAt || Date.now() });
            }
          }
        } catch (e) {
          console.warn('[Backup] readImagesFromIDBForAsset: item failed', e);
        }
      }
    } catch (e) { console.warn('[Backup] blImgListPrefix failed', e); }
    return out;
  }

  // Build list of localStorage keys relevant for a project
  function keysForProject(inst, proj) {
    const all = Object.keys(localStorage || {});
    const out = new Set();
    // common prefixes used in app: bl:v2:imgs:inst:proj:sub, bl:val:inst:proj:..., bl:project:inst, bl:instrument, others containing :inst:proj:
    const pfxImgs = 'bl:v2:imgs:' + inst + ':' + proj + ':';
    for (const k of all) {
      if (!k) continue;
      if (k.indexOf(':' + inst + ':' + proj + ':') >= 0) out.add(k);
      if (k.startsWith('bl:') && k.indexOf(':' + inst + ':') >= 0 && k.indexOf(':' + proj + ':') >= 0) out.add(k);
      if (k.startsWith(pfxImgs)) out.add(k);
      if (k.indexOf('bl:val:' + inst + ':' + proj + ':') === 0) out.add(k);
      if (k === ('bl:project:' + inst) || k === ('bl:instrument')) out.add(k);
    }
    // last-resort: include all keys that mention the project id
    for (const k of all) { if (String(k).indexOf(':' + proj) >= 0) out.add(k); }
    return Array.from(out);
  }

  // --- exportProject (substituir a versão atual) ---
 async function exportProject(inst, proj) {
  inst = inst || currInst();
  proj = proj || currProj(inst);
  const meta = { exportedAt: nowISO(), inst, proj, app: 'LuthierPro', appVersion: (window.LUTHIERPRO_VERSION || null), name: null };

  // collect relevant local keys (base candidates)
  const keys = keysForProject(inst, proj);
  const local = {};
  for (const k of keys) { try { local[k] = localStorage.getItem(k); } catch (_) { } }

  // ensure we include common index/metadata keys even if keysForProject missed them
  const extraKeys = [
    'bl:projects:' + inst,
    'bl:project:meta:' + inst + ':' + proj,
    'bl:project:name:' + inst + ':' + proj,
    'bl:project:' + inst,
    'bl:instrument'
  ];
  for (const k of extraKeys) {
    if (!(k in local)) {
      try {
        const v = localStorage.getItem(k);
        if (v !== null && v !== undefined) local[k] = v;
      } catch (_) {}
    }
  }

  // Also try to include any app-specific aggregated keys (heuristic)
  const heuristics = Object.keys(localStorage || {}).filter(k => {
    if (!k) return false;
    // include keys that mention inst or proj or known prefixes
    return k.indexOf('bl:projects:') === 0
      || k.indexOf('bl:project:meta:') === 0
      || k.indexOf('bl:project:name:') === 0
      || k.indexOf('baratieri') === 0
      || k.indexOf('bl:val:' + inst + ':' + proj) === 0
      || k.indexOf('bl:val:' + inst + ':') === 0;
  });
  for (const k of heuristics) {
    if (!(k in local)) {
      try { local[k] = localStorage.getItem(k); } catch(_) {}
    }
  }

  // Try to infer a human-friendly project name from several sources (ordered)
  function inferName() {
    // 1) explicit project:name key
    try {
      const k1 = 'bl:project:name:' + inst + ':' + proj;
      const v1 = local[k1] || localStorage.getItem(k1);
      if (v1) return String(v1);
    } catch(_) {}
    // 2) project:meta object
    try {
      const k2 = 'bl:project:meta:' + inst + ':' + proj;
      const v2 = local[k2] || localStorage.getItem(k2);
      if (v2) {
        try { const j = JSON.parse(v2); if (j && (j.name || j.title)) return String(j.name || j.title); } catch(_) {}
      }
    } catch(_) {}
    // 3) projects index list
    try {
      const k3 = 'bl:projects:' + inst;
      const v3 = local[k3] || localStorage.getItem(k3);
      if (v3) {
        try {
          const arr = JSON.parse(v3);
          if (Array.isArray(arr)) {
            const found = arr.find(x => String(x.id) === String(proj));
            if (found && (found.name || found.title)) return String(found.name || found.title);
          }
        } catch(_) {}
      }
    } catch(_) {}
    // 4) baratieri_* aggregate object that your app seems to use
    try {
      const possible = Object.keys(local).find(k => k.indexOf('baratieri') === 0 || k.indexOf('baratieri_') === 0);
      if (possible) {
        try {
          const j = JSON.parse(local[possible]);
          if (j && (j['n-prep1'] || j['n-prep'] || j['selProject'])) {
            if (j['n-prep1']) return String(j['n-prep1']);
            if (j['selProject']) return String(j['selProject']);
          }
        } catch(_) {}
      }
    } catch(_) {}
    // 5) naive scan for any value containing name-like fields
    try {
      for (const val of Object.values(local)) {
        if (!val) continue;
        try {
          const j = JSON.parse(val);
          if (j && (j.name || j.title || j.projectName || j['n-prep1'])) return String(j.name || j.title || j.projectName || j['n-prep1']);
        } catch(_) {
          const m = String(val).match(/\"name\"\s*:\s*\"([^"]+)\"/i);
          if (m && m[1]) return m[1];
        }
      }
    } catch(_) {}
    return null;
  }

  try {
    const guessed = inferName();
    if (guessed) meta.name = guessed;
  } catch (e) {
    console.warn('[Backup] infer name failed', e);
  }

  // candidates for asset keys (from found local keys)
  const candidates = new Set();
  for (const k of Object.keys(local)) {
    try {
      if (k.indexOf('imgs') >= 0 || k.indexOf(':imgs:') >= 0 || k.indexOf('bl:v2:imgs') === 0) { candidates.add(assetKeyFromLocalKey(k)); }
      const parts = String(k).split(':');
      if (parts.length >= 5) { candidates.add(parts.slice(4).join(':')); }
    } catch (_) { }
  }

  const images = [];
  for (const a of Array.from(candidates)) {
    if (!a) continue;
    const recs = await readImagesFromIDBForAsset(a);
    for (const r of recs) images.push(r);
  }

  return { meta, local, images };
}
  // Export all projects: collect localStorage keys for all projects (grouping by inst/proj when possible)
  async function exportAllProjects() {
    // naive approach: collect all keys and attempt to infer inst/proj groups
    const meta = { exportedAt: nowISO(), app: 'LuthierPro', appVersion: (window.LUTHIERPRO_VERSION || null) };

    const allKeys = Object.keys(localStorage || {});
    const local = {};
    for (const k of allKeys) { try { local[k] = localStorage.getItem(k); } catch (_) { } }

    // gather candidate assetKeys from local keys
    const assetCandidates = new Set();
    for (const k of Object.keys(local)) {
      try {
        if (k.indexOf('imgs') >= 0 || k.indexOf(':imgs:') >= 0 || k.indexOf('bl:v2:imgs') === 0) assetCandidates.add(assetKeyFromLocalKey(k));
        const parts = String(k).split(':');
        if (parts.length >= 5) assetCandidates.add(parts.slice(4).join(':'));
      } catch (_) {}
    }

    const images = [];
    for (const a of Array.from(assetCandidates)) {
      if (!a) continue;
      const recs = await readImagesFromIDBForAsset(a);
      for (const r of recs) images.push(r);
    }

    return { meta, local, images };
  }

  // --- importPayload (substituir a versão atual) ---
  async function importPayload(payload, { merge = true, overwrite = false, autoReload = true } = {}) {
    if (!payload || !payload.meta) throw new Error('invalid payload');
    const meta = payload.meta || {};
    const local = payload.local || {};
    const images = payload.images || [];

    // 0) helper: tenta inferir nome de projeto a partir do payload.local
    function inferProjectName(localObj, inst, proj) {
      if (!localObj) return null;
      // look for obvious keys containing name
      for (const [k, v] of Object.entries(localObj)) {
        if (!v) continue;
        const kl = String(k).toLowerCase();
        if (kl.includes('name') || kl.includes('title') || kl.includes('project')) {
          // try json parse
          try {
            const j = JSON.parse(v);
            if (j && (j.name || j.projectName || j.title)) { return String(j.name || j.projectName || j.title); }
            // if j is array, try find by id
            if (Array.isArray(j)) {
              for (const item of j) {
                try {
                  if (item && (item.id == proj || item.id == String(proj)) && (item.name || item.title)) return String(item.name || item.title);
                } catch(_) {}
              }
            }
          } catch (_) {
            // regex fallback
            const m = String(v).match(/"name"\s*:\s*"([^"]+)"/i) || String(v).match(/"projectName"\s*:\s*"([^"]+)"/i) || String(v).match(/"title"\s*:\s*"([^"]+)"/i);
            if (m && m[1]) return m[1];
          }
        } else {
          // generic scan for "name" anywhere in small JSONs
          try {
            const j2 = JSON.parse(v);
            if (j2 && (j2.name || j2.title)) return String(j2.name || j2.title);
          } catch (_) {}
        }
      }
      return null;
    }

    // 1) Write localStorage keys (merge behavior: write keys from payload)
    try {
      Object.keys(local).forEach(k => {
        try { localStorage.setItem(k, local[k]); dbg('[Backup] wrote key', k); } catch (e) { console.warn('[Backup] set localStorage failed', k, e); }
      });
    } catch (e) {
      console.warn('[Backup] error while writing localStorage', e);
    }

    // 2) Write images to IDB using blImgSave (await each to avoid race issues)
    if (window.blImgSave) {
      for (const img of images) {
        try {
          const key = img.key || ('imported::' + (Date.now()) + '::' + Math.random().toString(36).slice(2));
          await window.blImgSave(key, img.dataURL || img.data || '');
          dbg('[Backup] blImgSave ok', key);
        } catch (e) { console.warn('[Backup] blImgSave failed for', img && img.key, e); }
      }
    }

    // --- ensure instrument/project + project name/index heuristics ---
    try {
      if (meta.inst) {
        try { localStorage.setItem('bl:instrument', meta.inst); } catch (_) { }
        if (meta.proj) {
          try { localStorage.setItem('bl:project:' + meta.inst, String(meta.proj)); } catch (_) { }
        }
      }

      // infer name and write heuristics (so UI can pick it immediately)
      (function(){
        try {
          const inst = meta.inst;
          const proj = meta.proj;
          // infer name from payload.local if possible
          let inferred = null;
          try {
            if (payload.local) {
              for (const val of Object.values(payload.local)) {
                if (!val) continue;
                try {
                  const j = JSON.parse(val);
                  if (j && (j.name || j.title || j.projectName)) { inferred = String(j.name || j.title || j.projectName); break; }
                  if (Array.isArray(j)) {
                    for (const it of j) if (it && (String(it.id) === String(proj)) && (it.name || it.title)) { inferred = String(it.name || it.title); break; }
                    if (inferred) break;
                  }
                } catch(_) {
                  const m = String(val).match(/"name"\s*:\s*"([^"]+)"/i);
                  if (m && m[1]) { inferred = m[1]; break; }
                }
              }
            }
          } catch(_) {}

          const finalName = inferred || meta.name || null;
          if (finalName && inst && proj) {
            try { localStorage.setItem('bl:project:name:' + inst + ':' + proj, String(finalName)); } catch(_) {}
            try { localStorage.setItem('bl:project:meta:' + inst + ':' + proj, JSON.stringify({ id: proj, name: String(finalName), restoredAt: nowISO() })); } catch(_) {}
            try {
              const listKey = 'bl:projects:' + inst;
              let arr = [];
              try { arr = JSON.parse(localStorage.getItem(listKey) || '[]'); } catch(_) { arr = []; }
              if (!Array.isArray(arr)) arr = [];
              const ix = arr.findIndex(x => String(x.id) === String(proj));
              if (ix >= 0) arr[ix] = Object.assign({}, arr[ix], { id: proj, name: String(finalName), updatedAt: nowISO() });
              else arr.push({ id: proj, name: String(finalName), id: proj, updatedAt: nowISO() });
              localStorage.setItem(listKey, JSON.stringify(arr));
              dbg('[Backup] wrote projects index', listKey, arr);
            } catch(_) {}
          }
        } catch(e) { console.warn('[Backup] ensure name heuristics failed', e); }
      })();
    } catch(e) { console.warn('[Backup] while ensuring instrument/project heuristics', e); }

    // 5) Try to notify BL_PROJECT / runtime that data changed. If BL_PROJECT exposes a reload/refresh method, call it.
    let notified = false;
    try {
      if (window.BL_PROJECT) {
        if (typeof BL_PROJECT.reload === 'function') { await BL_PROJECT.reload(); notified = true; }
        else if (typeof BL_PROJECT.refresh === 'function') { BL_PROJECT.refresh(); notified = true; }
        else if (typeof BL_PROJECT.list === 'function') {
          window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta } }));
          notified = true;
        }
      } else {
        // dispatch a generic event so UI can listen
        window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta } }));
        notified = true;
      }
    } catch (e) {
      console.warn('[Backup] BL_PROJECT notify failed', e);
    }

    // 6) attempt to update DOM directly (best-effort) so no F5 is needed
    try {
      const inst = meta.inst; const proj = meta.proj;
      // get a possible project name from storage now
      let finalName = null;
      try {
        if (inst && proj) finalName = localStorage.getItem('bl:project:name:' + inst + ':' + proj) || (localStorage.getItem('bl:project:meta:' + inst + ':' + proj) && JSON.parse(localStorage.getItem('bl:project:meta:' + inst + ':' + proj)).name);
      } catch(_) {}
      if (!finalName && meta.name) finalName = meta.name;
      if (finalName) {
        // update known selectors
        const selectors = ['#project-title', '.project-name', '[data-project-name]'];
        for (const s of selectors) {
          try {
            const el = document.querySelector(s);
            if (el) { el.textContent = finalName; dbg('[Backup] updated DOM selector', s); }
          } catch (_) {}
        }
        // dispatch name-updated event
        window.dispatchEvent(new CustomEvent('bl:project:name-updated', { detail: { inst: inst, proj: proj, name: finalName } }));
      }
    } catch (e) {
      console.warn('[Backup] DOM update failed', e);
    }

    // 7) If it's an "export all" (meta may not contain inst/proj) or we couldn't notify the runtime, reload (if requested).
    const isExportAll = !(meta && meta.inst && meta.proj);
    if (autoReload && (isExportAll || !notified || overwrite)) {
      setTimeout(() => {
        try { location.reload(); } catch (e) { console.warn('[Backup] reload failed', e); }
      }, 700);
    }

    return { ok: true, restoredAt: (new Date()).toISOString(), meta };
  }

  // Import from File object (file = File), options same as importPayload
   async function importFromFile(file, options) {
  if (!file) throw new Error('no file');
  options = options || {};
  const txt = await file.text();
  const payload = jsonTryParse(txt);
  if (!payload) throw new Error('invalid json');

  // perform import (importPayload may itself dispatch events)
  const res = await importPayload(payload, options || {});

  // If caller explicitly requested no reload, skip it
  if (options && options.suppressReload) {
    return res;
  }

  // Otherwise force a reload (small delay so toasts/UI can show)
  // Keep delay similar to other places (700ms)
  try {
    setTimeout(function(){ 
      try { location.reload(); } catch(e) { console.warn('reload failed', e); }
    }, 700);
  } catch(e) {
    console.warn('failed to schedule reload after import', e);
  }

  return res;
}

  // convenience: import payload with default options
  async function importPayloadWithOptions(payload, opts) {
    return await importPayload(payload, opts || { merge: true });
  }

  // Export current project and trigger download
  async function exportCurrentProjectAndDownload() {
    const inst = currInst(); const proj = currProj(inst);
    const payload = await exportProject(inst, proj);
    const name = 'luthierpro-export-' + inst + '-proj' + proj + '-' + (new Date().toISOString().replace(/[:.]/g, '-')) + '.json';
    downloadJSON(payload, name);
    return payload;
  }

  // Expose API
  window.BackupRestore = window.BackupRestore || {};
  window.BackupRestore.exportProject = exportProject;
  window.BackupRestore.exportCurrentProjectAndDownload = exportCurrentProjectAndDownload;
  window.BackupRestore.exportAllProjects = exportAllProjects;
  window.BackupRestore.importPayload = importPayload;
  window.BackupRestore.importPayloadWithOptions = importPayloadWithOptions;
  window.BackupRestore.importFromFile = importFromFile;
  window.BackupRestore.promptAndImport = function () { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json'; i.addEventListener('change', async () => { if (i.files && i.files[0]) { try { await importFromFile(i.files[0], { merge: true }); alert('Import OK'); } catch (e) { alert('Import falhou: ' + (e && e.message)); } } }, { once: true }); i.click(); };

  // BACKWARDS COMPAT: exportProjectFile() — versão única que sempre força download
  window.exportProjectFile = window.exportProjectFile || (async function (inst, proj, token) {
    if (!window.BackupRestore) throw new Error('BackupRestore not loaded');
    if (inst || proj) {
      const payload = await window.BackupRestore.exportProject(inst, proj);
      try {
        const name = 'luthierpro-export-' + (inst || 'inst') + '-proj' + (proj || 'proj') + '-' + (new Date().toISOString().replace(/[:.]/g, '-')) + '.json';
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
      } catch (e) {
        console.warn('[exportProjectFile] download fallback', e);
        return payload;
      }
      return payload;
    }
    if (typeof window.BackupRestore.exportCurrentProjectAndDownload === 'function') {
      return await window.BackupRestore.exportCurrentProjectAndDownload();
    }
    // last resort
    const inst0 = (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument') || 'vcl'));
    const proj0 = (window.BL_PROJECT ? BL_PROJECT.get(inst0) : (localStorage.getItem('bl:project:' + inst0) || 'default'));
    const payload0 = await window.BackupRestore.exportProject(inst0, proj0);
    const name0 = 'luthierpro-export-' + (inst0 || 'inst') + '-proj' + (proj0 || 'proj') + '-' + (new Date().toISOString().replace(/[:.]/g, '-')) + '.json';
    const blob0 = new Blob([JSON.stringify(payload0, null, 2)], { type: 'application/json' });
    const url0 = URL.createObjectURL(blob0);
    const a0 = document.createElement('a');
    a0.href = url0; a0.download = name0;
    document.body.appendChild(a0);
    a0.click();
    a0.remove();
    setTimeout(() => URL.revokeObjectURL(url0), 500);
    return payload0;
  });

  // Ensure importProjectFile exists (definitive shim)
  window.importProjectFile = window.importProjectFile || (async function (file, options) {
    if (!file) throw new Error('Nenhum arquivo fornecido para importProjectFile()');
    // prefer BackupRestore.importFromFile if present
    if (window.BackupRestore && typeof window.BackupRestore.importFromFile === 'function') {
      return await window.BackupRestore.importFromFile(file, options || {});
    }
    // fallback to importFromFile local
    return await importFromFile(file, options || {});
  });

  // small notes in console for developer
  info('BackupRestore v1.1 patched loaded — exportProject/exportAllProjects/importFromFile available. Toggle debug with window.BL_BACKUP_DEBUG = true');

})();
