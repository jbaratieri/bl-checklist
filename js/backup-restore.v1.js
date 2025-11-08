/* FILE: js/backup-restore.v1.js — Backup & Restore for LuthierPro (v1 - full)
   - exportProject(inst, proj) -> payload { meta, local, images }
   - exportCurrentProjectAndDownload() -> triggers download
   - exportAllProjects() -> payload with multiple projects
   - importPayload(payload, options) -> writes localStorage + images, syncs BL_PROJECT, optionally reloads
   - importFromFile(file, options) -> reads file and calls importPayload
   - Backwards compatibility: exportProjectFile(...) and importProjectFile(file)
   - Designed to work with window.blImg* helpers if present (blImgSave, blImgListPrefix, blImgGet)
*/
(function(){
  'use strict';
  if (window.__BL_BACKUP_V1__) return; window.__BL_BACKUP_V1__ = true;

  // --- Small utils
  function jsonTryParse(s){ try { return JSON.parse(s); } catch(_) { return null; } }
  function nowISO(){ return new Date().toISOString(); }
  function downloadJSON(obj, name){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name || ('luthierpro-backup-'+Date.now()+'.json');
    document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); }, 500);
  }

  // --- Current instrument/project helpers (fallback to localStorage)
  function currInst(){ return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl')); }
  function currProj(inst){
    try { return (window.BL_PROJECT ? BL_PROJECT.get(inst) : (localStorage.getItem('bl:project:'+inst)||'default')); }
    catch(_) { return (localStorage.getItem('bl:project:'+inst)||'default'); }
  }

  // --- Keys discovery for a given project (localStorage)
  function keysForProject(inst, proj){
    const all = Object.keys(localStorage||{});
    const out = new Set();
    const pfx1 = 'bl:v2:imgs:' + inst + ':' + proj + ':';
    for (const k of all){
      if (!k) continue;
      try {
        if (k.indexOf(':'+inst+':'+proj+':') >= 0) out.add(k);
        if (k.startsWith('bl:') && k.indexOf(':'+inst+':')>=0 && k.indexOf(':'+proj+':')>=0) out.add(k);
        if (k.startsWith(pfx1)) out.add(k);
        if (k.indexOf('bl:val:'+inst+':'+proj+':')===0) out.add(k);
        if (k === ('bl:project:'+inst) || k === ('bl:instrument')) out.add(k);
      } catch(_) {}
    }
    // fallback: include all keys that mention the project id
    for (const k of all){ if (String(k).indexOf(':'+proj) >= 0) out.add(k); }
    return Array.from(out);
  }

  // --- Convert a local key to an asset key used in IDB (reverse of keyFor)
  function assetKeyFromLocalKey(localKey){
    try { const parts = String(localKey).split(':'); if (parts.length >= 5) return parts.slice(4).join(':'); } catch(_){} return localKey;
  }

  // --- Read images from IDB for an assetKey prefix
  async function readImagesFromIDBForAsset(assetKey){
    const out = [];
    if (!window.blImgListPrefix) return out;
    try{
      const recs = await window.blImgListPrefix(assetKey);
      if (!Array.isArray(recs)) return out;
      for (const r of recs){
        try{
          if (!r) continue;
          // If r already has dataURL cached, prefer it
          if (r.dataURL) { out.push({ key: r.key, dataURL: r.dataURL, addedAt: r.addedAt || Date.now() }); continue; }
          // Try blImgGet for full item
          if (window.blImgGet) {
            const full = await window.blImgGet(r.key);
            if (!full) continue;
            if (full.dataURL) {
              out.push({ key: r.key, dataURL: full.dataURL, addedAt: full.addedAt || Date.now() });
              continue;
            }
            if (full.blob) {
              // convert blob to dataURL
              const dataURL = await new Promise((res, rej)=>{
                const fr = new FileReader();
                fr.onload = ()=>res(fr.result);
                fr.onerror = ()=>rej(fr.error);
                fr.readAsDataURL(full.blob);
              });
              out.push({ key: r.key, dataURL, addedAt: full.addedAt || Date.now() });
              continue;
            }
            if (typeof full.toDataURL === 'function') {
              const dataURL = await full.toDataURL();
              out.push({ key: r.key, dataURL, addedAt: full.addedAt || Date.now() });
              continue;
            }
          }
          // last resort: push basic rec record (no dataURL)
          out.push({ key: r.key, dataURL: r.dataURL || null, addedAt: r.addedAt || Date.now() });
        } catch(e){ console.warn('[Backup] readImagesFromIDBForAsset item failed', e); }
      }
    }catch(e){ console.warn('[Backup] blImgListPrefix failed', e); }
    return out;
  }

  // --- exportProject: gather localStorage keys + images from IDB
  async function exportProject(inst, proj){
    inst = inst || currInst(); proj = proj || currProj(inst);
    const meta = { exportedAt: nowISO(), inst, proj, app:'LuthierPro', appVersion: (window.LUTHIERPRO_VERSION || null) };

    // include projects map (id+name) if runtime provides it
    try {
      if (window.BL_PROJECT && typeof BL_PROJECT.list === 'function') {
        try { meta.projects = BL_PROJECT.list(inst).map(p => ({ id: p.id, name: p.name })); } catch(_) { meta.projects = null; }
      }
    } catch(_) { meta.projects = null; }

    const keys = keysForProject(inst, proj);
    const local = {};
    for (const k of keys){ try { local[k] = localStorage.getItem(k); } catch(_){} }

    // images — detect candidate asset keys and read from IDB
    const images = [];
    const candidates = new Set();
    for (const k of Object.keys(local || {})){
      try{
        if (k.indexOf('imgs')>=0 || k.indexOf(':imgs:')>=0 || k.indexOf('bl:v2:imgs')===0){ candidates.add(assetKeyFromLocalKey(k)); }
        const parts = String(k).split(':');
        if (parts.length>=5){ candidates.add(parts.slice(4).join(':')); }
      }catch(_){ }
    }

    for (const a of candidates){
      if (!a) continue;
      const recs = await readImagesFromIDBForAsset(a);
      for (const r of recs) images.push(r);
    }

    return { meta, local, images };
  }

  // --- exportCurrentProjectAndDownload ---
  async function exportCurrentProjectAndDownload(){
    const inst = currInst(); const proj = currProj(inst);
    const payload = await exportProject(inst, proj);
    const name = 'luthierpro-export-'+inst+'-proj'+proj+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
    downloadJSON(payload, name);
    return payload;
  }

  // --- exportAllProjects: discover inst/proj pairs and export each ---
  async function exportAllProjects(){
    // discover pairs from BL_PROJECT if present; otherwise scan localStorage
    const pairs = new Set();
    try {
      if (window.BL_PROJECT && typeof BL_PROJECT.listGlobal === 'function') {
        // some runtimes may offer a global listing; try it
        const all = BL_PROJECT.listGlobal();
        if (Array.isArray(all)) {
          for (const p of all){ if (p && p.inst && p.id) pairs.add(p.inst + '::' + p.id); }
        }
      }
    } catch(_) {}

    // fallback: use instruments known and BL_PROJECT.list per instrument
    try {
      if (window.BL_INSTRUMENT && typeof BL_INSTRUMENT.list === 'function') {
        const insts = BL_INSTRUMENT.list();
        if (Array.isArray(insts)) {
          for (const inst of insts) {
            try {
              const list = BL_PROJECT.list(inst);
              if (Array.isArray(list)) {
                for (const p of list) pairs.add(inst + '::' + p.id);
              }
            } catch(_) {}
          }
        }
      }
    } catch(_) {}

    // final fallback: scan localStorage for patterns "bl:v2:imgs:<inst>:<proj>:" or "bl:project:<inst>" keys
    try {
      const all = Object.keys(localStorage||{});
      for (const k of all){
        try {
          if (!k) continue;
          if (k.indexOf('bl:v2:imgs:')===0){
            const parts = k.split(':'); // bl v2 imgs inst proj sub
            if (parts.length >= 5) pairs.add(parts[3] + '::' + parts[4]);
          } else if (k.indexOf('bl:project:')===0){
            const inst = k.split(':')[2];
            const proj = localStorage.getItem(k) || 'default';
            pairs.add(inst + '::' + proj);
          } else {
            // try generic occurrences of :<inst>:<proj>:
            const m = k.match(/bl:.*:([a-z0-9_-]+):([a-z0-9_-]+):/i);
            if (m && m[1] && m[2]) pairs.add(m[1] + '::' + m[2]);
          }
        } catch(_) {}
      }
    } catch(_) {}

    // now call exportProject for each pair
    const out = { meta:{ exportedAt: nowISO(), all:true, count:0 }, projects: [] };
    for (const p of Array.from(pairs)){
      try {
        const parts = String(p).split('::');
        const inst = parts[0] || currInst();
        const proj = parts[1] || currProj(inst);
        const payload = await exportProject(inst, proj);
        out.projects.push(payload);
      } catch(e){ console.warn('[Backup] exportAllProjects item failed', e); }
    }
    out.meta.count = out.projects.length;
    return out;
  }

  // --- importPayload: write localStorage + images; sync BL_PROJECT; optional reload
  async function importPayload(payload, { merge = true, overwrite = false, autoReload = true } = {}){
    if (!payload || !payload.meta) throw new Error('invalid payload');
    const meta = payload.meta;
    const local = payload.local || {};
    const images = payload.images || [];

    // 1) Write localStorage keys (merge semantics: when merge=true, we overwrite key values by default;
    // if merge=false/overwrite=true the caller can decide — here we simply set keys from payload)
    try {
      Object.keys(local).forEach(k => {
        try { localStorage.setItem(k, local[k]); } catch(e){ console.warn('[Backup] set localStorage failed', k, e); }
      });
    } catch(e){ console.warn('[Backup] writing localStorage failed', e); }

    // 2) Write images to IDB via blImgSave (if exists)
    if (window.blImgSave){
      for (const img of images){
        try{
          const key = img.key || ('imported::'+(Date.now())+ '::' + Math.random().toString(36).slice(2));
          // accept dataURL in properties dataURL or data
          const data = img.dataURL || img.data || null;
          if (data) {
            // Some blImgSave implementations accept (key, dataURL, meta)
            try { await window.blImgSave(key, data, { src: (meta.inst ? (meta.inst + '::' + meta.proj) : undefined) }); }
            catch(e){ // fallback to simpler call
              try { await window.blImgSave(key, data); } catch(e2){ console.warn('[Backup] blImgSave failed (fallback)', e2); }
            }
          } else {
            // nothing to save (skip)
          }
        } catch(e){ console.warn('[Backup] blImgSave failed for', img && img.key, e); }
      }
    }

    // 3) Ensure standard "current" keys set (instrument + project)
    try {
      if (meta.inst) {
        try { localStorage.setItem('bl:instrument', meta.inst); } catch(_) {}
        if (meta.proj) {
          try { localStorage.setItem('bl:project:' + meta.inst, String(meta.proj)); } catch(_) {}
        }
      }
    } catch(_) {}

    // 4) Try to sync runtime BL_PROJECT if present
    let notified = false;
    try {
      if (window.BL_PROJECT) {
        // If BL_PROJECT offers reload/refresh APIs, call them
        if (typeof BL_PROJECT.reload === 'function') {
          try { await BL_PROJECT.reload(); notified = true; } catch(_) { }
        }
        if (!notified && typeof BL_PROJECT.refresh === 'function') {
          try { BL_PROJECT.refresh(); notified = true; } catch(_) {}
        }
        // try to set current project explicitly
        if (!notified && meta.inst && meta.proj && typeof BL_PROJECT.set === 'function') {
          try { BL_PROJECT.set(meta.inst, String(meta.proj), { source: 'import' }); notified = true; } catch(_) {}
        }
        // try to rebuild/rename projects if meta.projects provided
        if (meta.projects && Array.isArray(meta.projects) && meta.projects.length && typeof BL_PROJECT.rename === 'function') {
          try {
            const inst = meta.inst || currInst();
            for (const p of meta.projects) {
              try { if (p && p.id && p.name) BL_PROJECT.rename(inst, p.id, p.name); } catch(_) {}
            }
            notified = true;
          } catch(_) {}
        }
        // emit event for any listeners
        try { window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta } })); } catch(_) {}
        notified = true;
      } else {
        // no BL_PROJECT present, still emit event so other modules can react
        try { window.dispatchEvent(new CustomEvent('bl:projects-imported', { detail: { meta } })); } catch(_) {}
      }
    } catch(e){ console.warn('[Backup] BL_PROJECT notify failed', e); }

    // 5) Decide whether to reload: reload if autoReload && (exportAll OR overwrite OR not notified)
    const isExportAll = !(meta && meta.inst && meta.proj);
    if (autoReload && (isExportAll || !notified || overwrite)) {
      // short delay to give the UI a chance to show a toast
      setTimeout(()=> { try { location.reload(); } catch(e){ console.warn('[Backup] reload attempt failed', e); } }, 700);
    }

    return { ok:true, restoredAt: nowISO(), meta };
  }

  // import wrapper: file -> importPayload
  async function importFromFile(file, options){
    if (!file) throw new Error('no file');
    const txt = await file.text();
    const payload = jsonTryParse(txt);
    if (!payload) throw new Error('invalid json');
    return await importPayload(payload, options || {});
  }

  // convenience: importPayloadWithOptions (payload + options)
  async function importPayloadWithOptions(payload, options){
    return await importPayload(payload, options || {});
  }

  // --- Expose API
  window.BackupRestore = window.BackupRestore || {};
  window.BackupRestore.exportProject = exportProject;
  window.BackupRestore.exportCurrentProjectAndDownload = exportCurrentProjectAndDownload;
  window.BackupRestore.exportAllProjects = exportAllProjects;
  window.BackupRestore.importPayload = importPayload;
  window.BackupRestore.importPayloadWithOptions = importPayloadWithOptions;
  window.BackupRestore.importFromFile = importFromFile;
  window.BackupRestore.promptAndImport = function(){ // simple prompt helper
    const input = document.createElement('input'); input.type='file'; input.accept='application/json';
    input.addEventListener('change', async function(){ if (!input.files || !input.files[0]) return; try { await importFromFile(input.files[0]); alert('Import concluído'); } catch(e){ alert('Import falhou: '+(e&&e.message)); } }, { once:true });
    input.click();
  };

  // --- Backwards compat: exportProjectFile()
  window.exportProjectFile = window.exportProjectFile || (async function(inst, proj){
    if (!window.BackupRestore) throw new Error('BackupRestore not loaded');
    if (inst || proj) {
      // return payload and force download
      const payload = await window.BackupRestore.exportProject(inst, proj);
      try {
        const name = 'luthierpro-export-'+(inst||'inst')+'-proj'+(proj||'proj')+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=> URL.revokeObjectURL(url), 500);
      } catch(e){ console.warn('[exportProjectFile] download fallback', e); return payload; }
      return payload;
    } else {
      return await window.BackupRestore.exportCurrentProjectAndDownload();
    }
  });

  // --- Ensure importProjectFile exists (definitive shim)
  window.importProjectFile = window.importProjectFile || (async function(file){
    if (!file) throw new Error('Nenhum arquivo fornecido para importProjectFile()');
    if (window.BackupRestore && typeof BackupRestore.importFromFile === 'function') {
      return await BackupRestore.importFromFile(file, { overwrite: false });
    }
    if (window.importProjectFileOriginal && typeof window.importProjectFileOriginal === 'function') {
      return await window.importProjectFileOriginal(file);
    }
    throw new Error('Nenhuma função de import disponível (BackupRestore.importFromFile ausente).');
  });

  // small convenience: exportAll -> download
  window.BackupRestore.exportAllAndDownload = window.BackupRestore.exportAllAndDownload || (async function(){
    const payload = await exportAllProjects();
    const name = 'luthierpro-export-all-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
    downloadJSON(payload, name);
    return payload;
  });

  // done
  console.info('[BackupRestore] module loaded (v1)');
})();
