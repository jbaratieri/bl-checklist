/* FILE: js/backup-restore.v1.js — Backup & Restore for LuthierPro (with exportProjectFile compatibility)
   - Exports a project (localStorage keys + images from IndexedDB) into a single JSON
   - Imports a JSON exported by this tool and restores localStorage keys + saves images to IndexedDB
   - Backwards-compatible function: exportProjectFile(inst, proj)
*/
(function(){
  'use strict';
  if (window.__BL_BACKUP_V1__) return; window.__BL_BACKUP_V1__ = true;

  // helpers
  function jsonTryParse(s){ try { return JSON.parse(s); } catch(_) { return null; } }
  function nowISO(){ return new Date().toISOString(); }
  function downloadJSON(obj, name){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name || ('luthierpro-backup-'+Date.now()+'.json');
    document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); }, 400);
  }

  // Determine current instrument & project
  function currInst(){ return (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl')); }
  function currProj(inst){ try { return (window.BL_PROJECT ? BL_PROJECT.get(inst) : (localStorage.getItem('bl:project:'+inst)||'default')); } catch(_) { return (localStorage.getItem('bl:project:'+inst)||'default'); } }

  // Build list of localStorage keys relevant for a project
  function keysForProject(inst, proj){
    const all = Object.keys(localStorage||{});
    const out = new Set();
    const pfx1 = 'bl:v2:imgs:' + inst + ':' + proj + ':';
    for (const k of all){
      if (!k) continue;
      if (k.indexOf(':'+inst+':'+proj+':') >= 0) out.add(k);
      if (k.startsWith('bl:') && k.indexOf(':'+inst+':')>=0 && k.indexOf(':'+proj+':')>=0) out.add(k);
      if (k.startsWith(pfx1)) out.add(k);
      if (k.indexOf('bl:val:'+inst+':'+proj+':')===0) out.add(k);
      if (k === ('bl:project:'+inst) || k === ('bl:instrument')) out.add(k);
    }
    // fallback: include all keys that mention the project id
    for (const k of all){ if (String(k).indexOf(':'+proj) >= 0) out.add(k); }
    return Array.from(out);
  }

  // Convert local storage key to assetKey used in IDB (reverse of keyFor)
  function assetKeyFromLocalKey(localKey){
    try { const parts = String(localKey).split(':'); if (parts.length >= 5) return parts.slice(4).join(':'); } catch(_){} return localKey;
  }

  // Read images from IDB for an assetKey prefix
  async function readImagesFromIDBForAsset(assetKey){
    const out = [];
    if (!window.blImgListPrefix) return out;
    try{
      const recs = await window.blImgListPrefix(assetKey);
      for (const r of recs){
        try{
          if (r && r.dataURL) {
            out.push({ key: r.key, dataURL: r.dataURL, addedAt: r.addedAt || Date.now() });
            continue;
          }
          if (window.blImgGet) {
            const full = await window.blImgGet(r.key);
            if (!full) continue;
            if (full.dataURL) {
              out.push({ key: r.key, dataURL: full.dataURL, addedAt: full.addedAt || Date.now() });
            } else if (full.blob){
              const dataURL = await new Promise((res, rej)=>{
                const fr = new FileReader(); fr.onload = ()=>res(fr.result); fr.onerror = ()=>rej(fr.error);
                fr.readAsDataURL(full.blob);
              });
              out.push({ key: r.key, dataURL, addedAt: full.addedAt || Date.now() });
            } else if (full.toDataURL){
              const dataURL = await full.toDataURL();
              out.push({ key: r.key, dataURL, addedAt: full.addedAt || Date.now() });
            }
          }
        }catch(e){ console.warn('[Backup] readImagesFromIDBForAsset: item failed', e); }
      }
    }catch(e){ console.warn('[Backup] blImgListPrefix failed', e); }
    return out;
  }

  // Main export: gather localStorage keys + images from IDB
  async function exportProject(inst, proj){
    inst = inst || currInst(); proj = proj || currProj(inst);
    const meta = { exportedAt: nowISO(), inst, proj, app:'LuthierPro', appVersion: (window.LUTHIERPRO_VERSION || null) };

    const keys = keysForProject(inst, proj);
    const local = {};
    for (const k of keys){ try { local[k] = localStorage.getItem(k); } catch(_){} }

    // images — scan for any local keys that are image lists
    const images = [];
    const candidates = new Set();
    for (const k of Object.keys(local)){
      try{
        if (k.indexOf('imgs')>=0 || k.indexOf(':imgs:')>=0 || k.indexOf('bl:v2:imgs')===0){ candidates.add(assetKeyFromLocalKey(k)); }
        const parts = String(k).split(':');
        if (parts.length>=4){ candidates.add(parts.slice(4).join(':')); }
      }catch(_){ }
    }

    for (const a of candidates){
      if (!a) continue;
      const recs = await readImagesFromIDBForAsset(a);
      for (const r of recs) images.push(r);
    }

    return { meta, local, images };
  }

  // Export and trigger download
  async function exportCurrentProjectAndDownload(){
    const inst = currInst(); const proj = currProj(inst);
    const payload = await exportProject(inst, proj);
    const name = 'luthierpro-export-'+inst+'-proj'+proj+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
    downloadJSON(payload, name);
    return payload;
  }

  // Import utilities: write localStorage and write images to IDB
  async function importPayload(payload, { merge = true } = {}){
    if (!payload || !payload.meta) throw new Error('invalid payload');
    const meta = payload.meta;
    const local = payload.local || {};
    const images = payload.images || [];

    // Write localStorage keys
    Object.keys(local).forEach(k => {
      try { localStorage.setItem(k, local[k]); } catch(e){ console.warn('[Backup] set localStorage failed', k, e); }
    });

    // Write images to IDB using blImgSave
    if (window.blImgSave){
      for (const img of images){
        try{
          const key = img.key || ('imported::'+(Date.now())+ '::' + Math.random().toString(36).slice(2));
          await window.blImgSave(key, img.dataURL);
        }catch(e){ console.warn('[Backup] blImgSave failed for', img.key, e); }
      }
    }

    return { ok:true, restoredAt: nowISO(), meta };
  }

  // Import from a File object (json file)
  async function importFromFile(file){
    if (!file) throw new Error('no file');
    const txt = await file.text();
    const payload = jsonTryParse(txt);
    if (!payload) throw new Error('invalid json');
    return await importPayload(payload);
  }

  // Simple UI helpers: create invisible input and import
  function promptAndImport(){
    const input = document.createElement('input'); input.type='file'; input.accept='application/json';
    input.addEventListener('change', async function(){
      if (!input.files || !input.files[0]) return; const f = input.files[0];
      try { const res = await importFromFile(f); alert('Import concluído: '+JSON.stringify(res)); }
      catch(e){ alert('Import falhou: '+(e && e.message)); console.error(e); }
    }, { once:true });
    input.click();
  }

  // Expose API
  window.BackupRestore = window.BackupRestore || {};
  window.BackupRestore.exportProject = exportProject;
  window.BackupRestore.exportCurrentProjectAndDownload = exportCurrentProjectAndDownload;
  window.BackupRestore.importPayload = importPayload;
  window.BackupRestore.importFromFile = importFromFile;
  window.BackupRestore.promptAndImport = promptAndImport;

  // BACKWARDS COMPAT: exportProjectFile() — versão única que sempre força download
window.exportProjectFile = (async function(inst, proj, token){
  if (!window.BackupRestore) throw new Error('BackupRestore not loaded');

  // Se passaram inst/proj -> obter payload e forçar download localmente
  if (inst || proj) {
    const payload = await window.BackupRestore.exportProject(inst, proj);
    try {
      const name = 'luthierpro-export-'+(inst||'inst')+'-proj'+(proj||'proj')+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 500);
    } catch (e) {
      console.warn('[exportProjectFile] download fallback', e);
      return payload;
    }
    return payload;
  }

  // Sem args -> usa a rotina que já faz o download internamente (se existir)
  if (typeof window.BackupRestore.exportCurrentProjectAndDownload === 'function') {
    return await window.BackupRestore.exportCurrentProjectAndDownload();
  }

  // Último recurso: gerar payload do projeto atual e forçar download
  const inst0 = (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
  const proj0 = (window.BL_PROJECT ? BL_PROJECT.get(inst0) : (localStorage.getItem('bl:project:'+inst0)||'default'));
  const payload0 = await window.BackupRestore.exportProject(inst0, proj0);
  const name0 = 'luthierpro-export-'+(inst0||'inst')+'-proj'+(proj0||'proj')+'-'+(new Date().toISOString().replace(/[:.]/g,'-'))+'.json';
  const blob0 = new Blob([JSON.stringify(payload0, null, 2)], { type:'application/json' });
  const url0 = URL.createObjectURL(blob0);
  const a0 = document.createElement('a');
  a0.href = url0; a0.download = name0;
  document.body.appendChild(a0);
  a0.click();
  a0.remove();
  setTimeout(()=> URL.revokeObjectURL(url0), 500);
  return payload0;
});

// Ensure importProjectFile exists (definição definitiva — sobrescreve se necessário)
window.importProjectFile = (async function(file){
  if (!file) throw new Error('Nenhum arquivo fornecido para importProjectFile()');
  if (window.BackupRestore && typeof BackupRestore.importFromFile === 'function') {
    return await BackupRestore.importFromFile(file);
  }
  if (window.importProjectFileOriginal && typeof window.importProjectFileOriginal === 'function') {
    return await window.importProjectFileOriginal(file);
  }
  throw new Error('Nenhuma função de import disponível (BackupRestore.importFromFile ausente).');
});


})();
