/* js/backup-restore.v1.js
   Export / Import (backup local) — expõe window.exportProjectFile / window.importProjectFile
*/

(function(){
  'use strict';

  // ajustar se seus caches usam outro nome (mantém compatibilidade com SW)
  const RUNTIME_CACHE = (typeof window !== 'undefined' && window.__RUNTIME_CACHE_NAME) ? window.__RUNTIME_CACHE_NAME : 'runtime-luthierpro-v2.4.2';
  // se você usa constante global diferente, ignore - o import/export tentará abrir o cache existente.

  // helpers
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  }
  function base64ToBlob(base64, type) {
    const bin = atob(base64);
    let len = bin.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: type || 'application/octet-stream' });
  }

  async function fetchAssetAsBase64(url) {
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      let resp = await cache.match(url);
      if (!resp) {
        resp = await fetch(url);
        if (!resp || !resp.ok) throw new Error('not found');
        try { await cache.put(url, resp.clone()); } catch(_) {}
      }
      const blob = await resp.blob();
      const base64 = await blobToBase64(blob);
      const type = resp.headers.get('content-type') || blob.type || 'application/octet-stream';
      return { url, base64, type };
    } catch (e) {
      try {
        const resp2 = await fetch(url);
        if (!resp2 || !resp2.ok) throw new Error('not found');
        const blob2 = await resp2.blob();
        const base642 = await blobToBase64(blob2);
        const type2 = resp2.headers.get('content-type') || blob2.type || 'application/octet-stream';
        return { url, base64: base642, type: type2 };
      } catch (err) {
        console.warn('[Backup] falha ao obter asset', url, err);
        return null;
      }
    }
  }

  // exportProjectFile (exposto)
  async function exportProjectFile(inst, proj, token, assetKey, opts = {}) {
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument') || 'vcl'));
    proj = proj || (window.BL_PROJECT ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'default');
    token = token || (window.currentDrawToken || 'root');
    assetKey = assetKey || token;

    // overlay: prefer hook se presente
    let overlayDataUrl = null;
    if (typeof window.__BL_LOAD_OVERLAY__ === 'function') {
      try {
        overlayDataUrl = await new Promise((resolve) => {
          try {
            window.__BL_LOAD_OVERLAY__(token, function(img){
              if (!img) return resolve(null);
              const c = document.createElement('canvas');
              c.width = img.naturalWidth || img.width || 1024;
              c.height = img.naturalHeight || img.height || 512;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(c.toDataURL('image/png'));
            });
          } catch (_) { resolve(null); }
        });
      } catch(_) { overlayDataUrl = null; }
    }
    // fallback localStorage keys
    if (!overlayDataUrl) {
      try {
        const STORE_PREFIX = (window.STORE_PREFIX || 'bl:v1');
        const projId = (typeof window.BL_PROJECT === 'object' && typeof BL_PROJECT.get === 'function') ? BL_PROJECT.get(inst) : proj;
        const keyNew = STORE_PREFIX + ':' + inst + ':' + projId + ':draw:' + token;
        const keyOld = STORE_PREFIX + ':' + inst + ':draw:' + token;
        overlayDataUrl = localStorage.getItem(keyNew) || localStorage.getItem(keyOld) || null;
      } catch(e){ overlayDataUrl = null; }
    }

    // candidate backgrounds: se existir função assetsFor, reutiliza-a
    let assetsList = [];
    try {
      if (typeof assetsFor === 'function') assetsList = assetsFor(inst, assetKey);
    } catch(_) { assetsList = []; }

    // reduzir duplicados e pedir base64 dos assets (opcional: limitar o número)
    const unique = [];
    const seen = {};
    for (let u of (assetsList || [])) {
      if (!seen[u]) { seen[u]=1; unique.push(u); }
    }

    const backgrounds = [];
    for (let i=0;i<unique.length;i++){
      try {
        const got = await fetchAssetAsBase64(unique[i]);
        if (got) backgrounds.push(got);
      } catch(_) {}
    }

    const payload = {
      meta: {
        exportedAt: (new Date()).toISOString(),
        inst, proj, token, assetKey,
        app: 'LuthierPro',
        appVersion: (window.APP_VERSION || null)
      },
      overlay: overlayDataUrl,
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
    console.log('[Backup] export pronto:', name);
    return name;
  }

  // importProjectFile (exposto)
  async function importProjectFile(file) {
    if (!file) throw new Error('Nenhum arquivo fornecido');
    const text = await file.text();
    let payload;
    try { payload = JSON.parse(text); } catch(e){ throw new Error('Arquivo inválido ou corrompido'); }

    const meta = payload.meta || {};
    const inst = meta.inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    const proj = meta.proj || ((typeof BL_PROJECT==='object' && BL_PROJECT.get) ? BL_PROJECT.get(inst) : (document.getElementById('selProject') && document.getElementById('selProject').value) || 'restored');
    const token = meta.token || 'restored';

    // overlay restore
    if (payload.overlay) {
      try {
        if (typeof window.__BL_SAVE_OVERLAY__ === 'function') {
          const img = new Image();
          img.onload = function(){ try { window.__BL_SAVE_OVERLAY__(token, img); } catch(_){} };
          img.src = payload.overlay;
        } else {
          // grava localStorage new + old key
          try {
            const STORE_PREFIX = (window.STORE_PREFIX || 'bl:v1');
            const keyNew = STORE_PREFIX + ':' + inst + ':' + proj + ':draw:' + token;
            const keyOld = STORE_PREFIX + ':' + inst + ':draw:' + token;
            localStorage.setItem(keyNew, payload.overlay);
            localStorage.setItem(keyOld, payload.overlay);
          } catch(e){ console.warn('[Backup] falha ao gravar overlay localStorage', e); }
        }
      } catch(e){ console.warn('[Backup] erro ao restaurar overlay', e); }
    }

    // restore backgrounds to cache
    if (Array.isArray(payload.backgrounds) && payload.backgrounds.length) {
      const cache = await caches.open(RUNTIME_CACHE).catch(()=>null);
      if (cache) {
        for (let b of payload.backgrounds) {
          try {
            const blob = base64ToBlob(b.base64, b.type);
            const resp = new Response(blob, { headers: { 'Content-Type': b.type } });
            await cache.put(new Request(b.url), resp);
            console.log('[Backup] restored asset to cache:', b.url);
          } catch(e){ console.warn('[Backup] falha ao restaurar asset', b && b.url, e); }
        }
      } else {
        console.warn('[Backup] cache não disponível para restaurar assets');
      }
    }

    // compat: also store old key
    try {
      const STORE_PREFIX = (window.STORE_PREFIX || 'bl:v1');
      const oldKey = STORE_PREFIX + ':' + inst + ':draw:' + token;
      if (payload.overlay) localStorage.setItem(oldKey, payload.overlay);
    } catch(_) {}

    console.log('[Backup] import concluído', meta);
    return meta;
  }

  // expõe globalmente
  window.exportProjectFile = exportProjectFile;
  window.importProjectFile = importProjectFile;

})();
