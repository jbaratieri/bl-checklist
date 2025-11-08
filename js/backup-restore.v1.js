/* FILE: js/backup-restore.v1.js — Backup & Restore for LuthierPro (v1.1)
   - exportProject / exportAllProjects
   - importPayload with merge/overwrite options
   - importFromFile(file, options)
   - backward-compatible exportProjectFile / importProjectFile
*/
(function () {
  'use strict';
  if (window.__BL_BACKUP_V1__) return; window.__BL_BACKUP_V1__ = true;

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

  // Export a single project: collect localStorage keys and images that match candidates
    // --- exportProject (substituir a versão atual) ---
  async function exportProject(inst, proj) {
    inst = inst || currInst(); proj = proj || currProj(inst);
    const meta = { exportedAt: nowISO(), inst, proj, app: 'LuthierPro', appVersion: (window.LUTHIERPRO_VERSION || null), name: null };

    // collect relevant local keys
    const keys = keysForProject(inst, proj);
    const local = {};
    for (const k of keys) { try { local[k] = localStorage.getItem(k); } catch (_) { } }

    // Try to infer a human-friendly project name from payload values (if present)
    function inferNameFromLocal(localObj) {
      for (const v of Object.values(localObj)) {
        if (!v) continue;
        // try parse JSON
        try {
          const p = JSON.parse(v);
          if (p && (p.name || p.projectName || p.title)) return String(p.name || p.projectName || p.title);
          // if it's an array of projects, maybe find matching id
          if (Array.isArray(p)) {
            for (const item of p) {
              try {
                if (item && (item.id == proj || item.id == String(proj)) && (item.name || item.title)) return String(item.name || item.title);
              } catch (_) {}
            }
          }
        } catch (_) {
          // not JSON, try plain text regex
          try {
            const m = String(v).match(/"name"\s*:\s*"([^"]+)"/i) || String(v).match(/"projectName"\s*:\s*"([^"]+)"/i);
            if (m && m[1]) return m[1];
          } catch (_) {}
        }
      }
      return null;
    }

    try {
      const guessed = inferNameFromLocal(local);
      if (guessed) meta.name = guessed;
      // fallback: if BL_PROJECT has metadata accessor try it
      if (!meta.name && window.BL_PROJECT && typeof BL_PROJECT.getMeta === 'function') {
        try {
          const mm = BL_PROJECT.getMeta(inst, proj);
          if (mm && (mm.name || mm.title)) meta.name = mm.name || mm.title;
        } catch (_) {}
      }
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
      } catch (_) { }
    }

    const images = [];
    for (const a of Array.from(assetCandidates)) {
      if (!a) continue;
      const recs = await readImagesFromIDBForAsset(a);
      for (const r of recs) images.push(r);
    }

    return { meta, local, images };
  }

  // Import payload — options: { merge:true, overwrite:true }
  // Behavior:
  //  - overwrite === true -> set every local key from payload (replacing)
  //  - merge === true -> for keys that are arrays (ex: images lists stored in localStorage) try to merge arrays de-duplicating by id; other keys: skip if exists
  // Images: attempt to save each image in payload.images via blImgSave (key + dataURL)
  // Import utilities: write localStorage and write images to IDB
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
      const nameCandidates = [];
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
        try { localStorage.setItem(k, local[k]); } catch (e) { console.warn('[Backup] set localStorage failed', k, e); }
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
        } catch (e) { console.warn('[Backup] blImgSave failed for', img && img.key, e); }
      }
    }

    // 3) Ensure instrument/project pointers exist (so UI knows where to look)
    try {
      if (meta.inst) {
        try { localStorage.setItem('bl:instrument', meta.inst); } catch (_) { }
        if (meta.proj) {
          try { localStorage.setItem('bl:project:' + meta.inst, String(meta.proj)); } catch (_) { }
        }
      }
    } catch (_) { }

    // 4) Infer project name if possible and write heuristic keys the UI may read
    try {
      const inst = meta.inst;
      const proj = meta.proj;
      const inferred = inferProjectName(local, inst, proj) || meta.name || null;
      if (inferred && inst && proj) {
        // heuristic key patterns (some apps check these)
        try { localStorage.setItem(`bl:project:name:${inst}:${proj}`, String(inferred)); } catch (_) {}
        try { localStorage.setItem(`bl:project:meta:${inst}:${proj}`, JSON.stringify({ id: proj, name: String(inferred), restoredAt: nowISO() })); } catch (_) {}
        // also keep an index of user-visible projects (if present)
        try {
          const listKey = 'bl:projects:list:' + inst;
          const raw = localStorage.getItem(listKey);
          let arr = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(arr)) arr = [];
          // upsert
          const exists = arr.findIndex(x => String(x.id) === String(proj));
          if (exists >= 0) arr[exists] = Object.assign({}, arr[exists], { id: proj, name: String(inferred), updatedAt: nowISO() });
          else arr.push({ id: proj, name: String(inferred), updatedAt: nowISO() });
          localStorage.setItem(listKey, JSON.stringify(arr));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[Backup] infer/write project name failed', e);
    }

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
        if (inst && proj) finalName = localStorage.getItem(`bl:project:name:${inst}:${proj}`) || localStorage.getItem(`bl:project:meta:${inst}:${proj}`) && JSON.parse(localStorage.getItem(`bl:project:meta:${inst}:${proj}`)).name;
      } catch(_) {}
      if (!finalName && meta.name) finalName = meta.name;
      if (finalName) {
        // update known selectors
        const selectors = ['#project-title', '.project-name', '[data-project-name]'];
        for (const s of selectors) {
          try {
            const el = document.querySelector(s);
            if (el) { el.textContent = finalName; console.debug('[Backup] updated DOM selector', s); }
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
    const txt = await file.text();
    const payload = jsonTryParse(txt);
    if (!payload) throw new Error('invalid json');
    const res = await importPayload(payload, options || {});
    // if overwrite requested, reload to apply (some parts of app may read at load)
    if (options && options.overwrite) {
      // small delay to let UI show a toast if desired, then reload
      setTimeout(() => location.reload(), 700);
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
  console.info('BackupRestore v1.1 loaded — exportProject/exportAllProjects/importFromFile available.');

})(); 
