/* js/backup-restore.v1.js
   Export / Import (backup local) — expõe window.exportProjectFile / window.importProjectFile
   Versão: 1 (robusta: lê IndexedDB + Cache + localStorage; grava cache + localStorage no import)
*/

(function(){
  'use strict';

  // runtime cache name (definido pela página antes de carregar este script)
  const RUNTIME_CACHE_NAME = window.__RUNTIME_CACHE_NAME || ('runtime-luthierpro-v2.4.2');

  // ---------- helpers ----------
  function blobToBase64Promise(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = reject;
      fr.onload = () => {
        const res = fr.result || '';
        // result é data:*; retornamos a string inteira
        resolve(res);
      };
      fr.readAsDataURL(blob);
    });
  }
  function dataUrlToBase64(dataUrl) {
    if (!dataUrl) return null;
    const idx = dataUrl.indexOf('base64,');
    return idx >= 0 ? dataUrl.slice(idx + 7) : dataUrl;
  }
  function base64ToBlob(base64, type) {
    const bin = atob(base64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i=0;i<len;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'application/octet-stream' });
  }

  // try to read an image entry from IndexedDB (DB 'bl-images', store 'images') by hint (partial key)
  function readIndexedDBImageByHint(hint) {
    return new Promise((resolve) => {
      try {
        const DB = 'bl-images', OS = 'images';
        const req = indexedDB.open(DB, 1);
        req.onsuccess = function(){
          const db = req.result;
          const tx = db.transaction(OS, 'readonly');
          const store = tx.objectStore(OS);
          const cursorReq = store.openCursor();
          const matches = [];
          cursorReq.onsuccess = function(e){
            const cur = e.target.result;
            if (!cur) {
              if (matches.length) {
                // choose first match's dataURL if present
                const v = matches[0].value;
                resolve(v && (v.dataURL || v.dataUrl || v.base64) ? (v.dataURL || v.dataUrl || v.base64) : null);
              } else resolve(null);
              return;
            }
            const key = String(cur.key || '');
            try {
              if (!hint || (hint && key.toLowerCase().includes(String(hint).toLowerCase()))) {
                // candidate — push
                matches.push(cur);
              }
            } catch(_) {}
            cur.continue();
          };
          cursorReq.onerror = function(){ resolve(null); };
        };
        req.onerror = function(){ resolve(null); };
      } catch (e) {
        resolve(null);
      }
    });
  }

  // fetch asset from cache or network and return {url, base64, type}
  async function fetchAssetAsBase64FromUrl(url) {
    try {
      // normalize to absolute href
      const abs = (new URL(url, location.origin)).href;
      const cache = await caches.open(RUNTIME_CACHE_NAME).catch(()=>null);
      if (cache) {
        const cached = await cache.match(abs).catch(()=>null);
        if (cached) {
          try {
            const blob = await cached.blob();
            const dataUrl = await blobToBase64Promise(blob);
            const type = cached.headers.get('content-type') || blob.type || 'application/octet-stream';
            return { url: abs, base64: dataUrl.indexOf('base64,')>0 ? dataUrl.split('base64,')[1] : dataUrl, type };
          } catch(e){}
        }
      }
      // try network
      try {
        const resp = await fetch(abs);
        if (resp && resp.ok) {
          const blob = await resp.blob();
          const dataUrl = await blobToBase64Promise(blob);
          const type = resp.headers.get('content-type') || blob.type || 'application/octet-stream';
          return { url: abs, base64: dataUrl.indexOf('base64,')>0 ? dataUrl.split('base64,')[1] : dataUrl, type };
        }
      } catch(e){}
    } catch(e){}
    return null;
  }

  // ---------- EXPORT ----------
  async function exportProjectFile(inst, proj, token, assetKey, opts = {}) {
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument') || 'vcl'));
    proj = proj || (window.BL_PROJECT ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default');
    token = token || (window.currentDrawToken || 'root');
    assetKey = assetKey || token;

    console.log('[Backup] exportProjectFile start', {inst, proj, token, assetKey});

    // 1) overlay: try hook -> localStorage -> indexedDB
    let overlayDataUrl = null;
    try {
      if (typeof window.__BL_LOAD_OVERLAY__ === 'function') {
        overlayDataUrl = await new Promise((resolve) => {
          try {
            window.__BL_LOAD_OVERLAY__(token, function(img){
              if (!img) return resolve(null);
              try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || img.width || 1024;
                c.height = img.naturalHeight || img.height || 512;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
              } catch(e) { resolve(null); }
            });
          } catch(e){ resolve(null); }
        });
        if (overlayDataUrl) console.log('[Backup] overlay from __BL_LOAD_OVERLAY__');
      }
    } catch(e){ overlayDataUrl = null; }

    if (!overlayDataUrl) {
      try {
        const STORE_PREFIX = (window.STORE_PREFIX || 'bl:v1');
        const projId = (typeof window.BL_PROJECT === 'object' && typeof BL_PROJECT.get === 'function') ? BL_PROJECT.get(inst) : proj;
        const keyNew = STORE_PREFIX + ':' + inst + ':' + projId + ':draw:' + token;
        const keyOld = STORE_PREFIX + ':' + inst + ':draw:' + token;
        overlayDataUrl = localStorage.getItem(keyNew) || localStorage.getItem(keyOld) || null;
        if (overlayDataUrl) console.log('[Backup] overlay from localStorage key:', overlayDataUrl ? (keyNew) : 'none');
      } catch(e){ overlayDataUrl = null; }
    }

    if (!overlayDataUrl) {
      try {
        const fromIdb = await readIndexedDBImageByHint(token || assetKey || inst);
        if (fromIdb) {
          // if it's raw dataURL or base64, normalize to dataURL
          const s = fromIdb;
          const normal = s.indexOf('data:') === 0 ? s : ('data:image/png;base64,' + (s.indexOf('base64,')>0 ? s.split('base64,')[1] : s));
          overlayDataUrl = normal;
          console.log('[Backup] overlay from IndexedDB hint');
        }
      } catch(_) { overlayDataUrl = null; }
    }

    // 2) backgrounds: prefer assetsFor() candidates -> cache -> network -> indexedDB fallback
    const backgrounds = [];
    try {
      let candidates = [];
      if (typeof assetsFor === 'function') candidates = assetsFor(inst, assetKey) || [];
      // normalize candidate URLs to absolute and dedupe
      candidates = candidates.map(u => (new URL(u, location.origin)).href).filter((v,i,a)=>a.indexOf(v)===i);

      // try each candidate
      for (let i=0;i<candidates.length;i++){
        const cand = candidates[i];
        const got = await fetchAssetAsBase64FromUrl(cand);
        if (got) {
          backgrounds.push(got);
          // optional: break after first found if you only want main bg
          // break;
        }
      }

      // if none found, try scanning IndexedDB heuristically
      if (!backgrounds.length) {
        // scan bl-images and pick some entries (limit e.g. 12)
        try {
          const DB='bl-images', OS='images';
          const p = indexedDB.open(DB,1);
          await new Promise((resolve) => {
            p.onsuccess = function(){
              const db = p.result;
              const tx = db.transaction(OS,'readonly');
              const st = tx.objectStore(OS);
              const cur = st.openCursor();
              let count = 0;
              cur.onsuccess = function(e){
                const c = e.target.result;
                if (!c || count >= 12) { resolve(); return; }
                const key = (c.key || '').toString();
                const val = c.value || {};
                const dataURL = val.dataURL || val.dataUrl || val.base64 || null;
                if (dataURL) {
                  const b64 = dataURL.indexOf('base64,')>0 ? dataURL.split('base64,')[1] : dataURL;
                  backgrounds.push({ url: (new URL('/assets/tech/' + key, location.origin)).href, base64: b64, type: val.type || 'image/png' });
                  count++;
                }
                c.continue();
              };
              cur.onerror = function(){ resolve(); };
            };
            p.onerror = function(){ resolve(); };
          });
          if (backgrounds.length) console.log('[Backup] backgrounds from IndexedDB heuristic count=', backgrounds.length);
        } catch(e){ /* ignore */ }
      }
    } catch(e) {
      console.warn('[Backup] backgrounds gather failed', e);
    }

    const payload = {
      meta: {
        exportedAt: (new Date()).toISOString(),
        inst, proj, token, assetKey,
        app: 'LuthierPro',
        appVersion: (window.APP_VERSION || null)
      },
      overlay: overlayDataUrl || null,
      backgrounds
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const name = `luthierproj-${inst}-${proj}-${token}-${(new Date()).toISOString().replace(/[:.]/g,'-')}.luthierproj.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 30000);

    console.log('[Backup] export complete', { name, payloadSummary: { overlay: !!payload.overlay, backgrounds: payload.backgrounds.length }});
    return { name, payload };
  }

  // ---------- IMPORT ----------
  async function importProjectFile(file) {
    if (!file) throw new Error('Nenhum arquivo fornecido');
    const text = await file.text();
    let payload;
    try { payload = JSON.parse(text); } catch(e){ throw new Error('Arquivo inválido ou corrompido'); }

    console.log('[Backup] importProjectFile: meta=', payload.meta || {});

    const meta = payload.meta || {};
    const inst = meta.inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    const proj = meta.proj || ((typeof BL_PROJECT==='object' && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'restored');
    const token = meta.token || 'restored';

    // 1) restore overlay into app keys (hook or localStorage)
    let overlayRestored = false;
    if (payload.overlay) {
      try {
        if (typeof window.__BL_SAVE_OVERLAY__ === 'function') {
          const img = new Image();
          img.onload = function(){ try { window.__BL_SAVE_OVERLAY__(token, img); overlayRestored = true; console.log('[Backup] overlay saved via __BL_SAVE_OVERLAY__'); } catch(e){ console.warn('[Backup] __BL_SAVE_OVERLAY__ error', e); } };
          img.onerror = function(e){ console.warn('[Backup] overlay image load error', e); };
          img.src = payload.overlay;
          await new Promise(r => setTimeout(r, 300));
        } else {
          try {
            const STORE_PREFIX = (window.STORE_PREFIX || 'bl:v1');
            const projId = (typeof window.BL_PROJECT === 'object' && typeof BL_PROJECT.get === 'function') ? BL_PROJECT.get(inst) : proj;
            const keyNew = STORE_PREFIX + ':' + inst + ':' + projId + ':draw:' + token;
            const keyOld = STORE_PREFIX + ':' + inst + ':draw:' + token;
            localStorage.setItem(keyNew, payload.overlay);
            localStorage.setItem(keyOld, payload.overlay);
            overlayRestored = true;
            console.log('[Backup] overlay written to localStorage keys:', keyNew, keyOld);
          } catch (e) { console.warn('[Backup] localStorage overlay write failed', e); }
        }
      } catch (e) { console.warn('[Backup] overlay restore failed', e); }
    } else {
      console.warn('[Backup] payload.overlay is empty');
    }

    // 2) restore backgrounds into cache
    const restoredAssets = [];
    if (Array.isArray(payload.backgrounds) && payload.backgrounds.length) {
      try {
        const cache = await caches.open(RUNTIME_CACHE_NAME).catch(()=>null);
        for (let i=0;i<payload.backgrounds.length;i++){
          const b = payload.backgrounds[i];
          if (!b || !b.base64) continue;
          try {
            // normalize URL to same origin absolute
            let normalizedUrl;
            try { normalizedUrl = (new URL(b.url, location.origin)).href; } catch(_) {
              normalizedUrl = location.origin + (b.url.charAt(0)==='/'? b.url : ('/' + b.url));
            }
            const blob = base64ToBlob(b.base64, b.type || 'application/octet-stream');
            const resp = new Response(blob, { headers: { 'Content-Type': b.type || 'application/octet-stream' }});
            if (cache) {
              await cache.put(new Request(normalizedUrl), resp.clone());
              restoredAssets.push(normalizedUrl);
              console.log('[Backup] restored asset to cache:', normalizedUrl);
            } else {
              console.warn('[Backup] cache not available to restore asset:', normalizedUrl);
            }
          } catch (e) { console.warn('[Backup] failed to restore asset', b && b.url, e); }
        }
      } catch (e) {
        console.warn('[Backup] cannot open cache', RUNTIME_CACHE_NAME, e);
      }
    } else {
      console.warn('[Backup] payload.backgrounds empty or missing');
    }

    // 3) record debug index of restored assets in localStorage for easier inspection
    try {
      const indexKey = 'bl:backup:assetsIndex:' + (meta.inst || inst) + ':' + (meta.proj || proj) + ':' + (meta.token || token);
      localStorage.setItem(indexKey, JSON.stringify({ restoredAt: Date.now(), assets: restoredAssets }));
      console.log('[Backup] assets index saved', indexKey);
    } catch(e){}

    // 4) compat: old overlay key
    try {
      const STORE_PREFIX = (window.STORE_PREFIX || 'bl:v1');
      const oldKey = STORE_PREFIX + ':' + inst + ':draw:' + token;
      if (payload.overlay) localStorage.setItem(oldKey, payload.overlay);
    } catch(_) {}

    console.log('[Backup] import finished overlayRestored=', overlayRestored, 'restoredAssetsCount=', restoredAssets.length);

    // 5) notify SW and reload
    try {
      const metaMsg = { type: 'BR_RESTORED', meta: { inst, proj, token, restoredAssetsCount: restoredAssets.length } };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(metaMsg);
        // await BR_DONE (timeout)
        const waitForDone = new Promise((resolve) => {
          const onMsg = (e) => {
            try {
              if (e.data && e.data.type === 'BR_DONE') {
                navigator.serviceWorker.removeEventListener('message', onMsg);
                resolve(true);
              }
            } catch(_) {}
          };
          navigator.serviceWorker.addEventListener('message', onMsg);
          setTimeout(() => { try{ navigator.serviceWorker.removeEventListener('message', onMsg);}catch(_){}; resolve(false); }, 2500);
        });
        const ok = await waitForDone;
        setTimeout(() => location.reload(), ok ? 150 : 600);
        return { inst, proj, token, restoredAssets };
      }
    } catch (e) {
      console.warn('[Backup] failed to notify SW', e);
    }

    // fallback reload
    setTimeout(() => location.reload(), 500);
    return { inst, proj, token, restoredAssets };
  }

  // ---------- expose ----------
  window.exportProjectFile = exportProjectFile;
  window.importProjectFile = importProjectFile;

  console.log('[Backup] backup-restore.v1.js loaded — runtime cache:', RUNTIME_CACHE_NAME);

})();
