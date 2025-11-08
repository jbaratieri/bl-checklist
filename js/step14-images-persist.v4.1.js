/*! FILE: js/step14-images-persist.v4.1.js — UPDATED (v4.1 patched for IndexedDB dual-write)
   - Mantém TODO o comportamento do v3.4/v4.1
   - Agora grava em IndexedDB via window.blImgSave (se disponível) e mantém localStorage como fallback (duplo-write)
   - Leitura prioriza IDB (blImgListPrefix/blImgGet) com fallback para localStorage
   - Exclusão tenta remover tanto localStorage quanto IDB
*/
(function(){
  'use strict';

  if (window.__BL_IMG_V41_PATCHED__) return;
  window.__BL_IMG_V41_PATCHED__ = true;

  // ===== Config / helpers =====
  var STORE_PREFIX = 'bl:v2:imgs'; // mantém compatibilidade com v3
  var INST_KEY = 'bl:instrument';
  var INST_ALIAS = {
    'vcl':'vcl','violao':'vcl','violão':'vcl','guitarra-classica':'vcl','violao-classico':'vcl',
    'vla':'vla','viola':'vla','viola-caipira':'vla',
    'cav':'cav','cavaquinho':'cav',
    'ukl':'ukl','ukulele':'ukl','ukulelê':'ukl'
  };

  var CFG = {
    MAX_W: 1600,
    MAX_H: 1200,
    QUALITY: 0.8,
    MIGRATION_FLAG: 'bl:v4.1:migrated'
  };

  // --- Debug helpers (seguro mesmo se não ativado) ---
  function dbg(){ if (window.BL_DEBUG_IMAGES) try { console.debug.apply(console, arguments); } catch(_){} }
  function warn(){ if (window.BL_DEBUG_IMAGES) try { console.warn.apply(console, arguments); } catch(_){} }

  function norm(s){
    if (!s) return '';
    s = String(s).toLowerCase();
    try { s = s.normalize('NFD').replace(/\p{Diacritic}/gu,''); } catch(_) {}
    return s;
  }
  function normInst(v){
    var k = norm(v);
    return INST_ALIAS[k] || k || 'vcl';
  }
  function getInst(){
    var raw = 'vcl';
    try {
      raw = (window.BL_CTX && BL_CTX.getInst())
         || (window.BL_INSTRUMENT && BL_INSTRUMENT.get())
         || localStorage.getItem('bl:instrument')
         || 'vcl';
    } catch(_) {}
    return normInst(raw);
  }
  function getProj(inst){
    var id = null;
    try {
      if (window.BL_PROJECT && typeof BL_PROJECT.get === 'function'){
        id = BL_PROJECT.get(inst || getInst());
      }
    }catch(_){ }
    return id || 'default';
  }
  function keyFor(sub){
    if (window.BL_CTX && typeof BL_CTX.key === 'function'){
      return BL_CTX.key('imgs', sub);
    }
    var inst = getInst();
    var proj = getProj(inst);
    return STORE_PREFIX + ':' + inst + ':' + proj + ':' + sub;
  }

  // ===== DOM helpers =====
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function el(tag, cls){ var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function findRowForSub(sub){
    var btn = document.querySelector('.btn.add-image[data-subetapa="'+CSS.escape(sub)+'"]');
    if (btn){
      var wrap = btn.closest('.tool-row') || btn.parentElement;
      if (wrap){
        var prev = wrap.previousElementSibling;
        if (prev && prev.classList && prev.classList.contains('img-row')) return prev;
        var host = wrap.parentElement;
        var row = host && host.querySelector('.img-row');
        if (row) return row;
      }
    }
    var row2 = document.querySelector('.img-row[data-subetapa="'+CSS.escape(sub)+'"]');
    if (row2) return row2;
    if (btn){
      var r = el('div','img-row'); r.setAttribute('data-subetapa', sub);
      (btn.closest('.tool-row') || btn.parentElement || document.body).before(r);
      return r;
    }
    var r2 = el('div','img-row'); r2.setAttribute('data-subetapa', sub);
    document.body.appendChild(r2);
    return r2;
  }

  // ===== Viewer =====
  function openViewer(src, alt){
    if (typeof window.openViewer === 'function') {
      window.openViewer(src, alt || 'imagem do projeto');
      return;
    }
    var v = document.getElementById('imgViewer');
    if (!v) {
      v = document.createElement('div');
      v.id = 'imgViewer';
      v.style.cssText = 'position:fixed;inset:0;display:flex;background:rgba(0,0,0,.7);z-index:3000;align-items:center;justify-content:center;padding:20px;cursor:zoom-out';
      v.innerHTML = '<img id="imgViewerImg" alt="" style="display:block;max-width:95vw;max-height:95vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.55);cursor:zoom-out" />';
      document.body.appendChild(v);
      v.addEventListener('click', function(){ v.style.display='none'; document.body.style.overflow=''; });
      document.addEventListener('keydown', function(e){
        if (e.key==='Escape' && v.style.display!=='none'){ v.style.display='none'; document.body.style.overflow=''; }
      });
    }
    var img = v.querySelector('#imgViewerImg');
    img.src = src;
    img.alt = alt || 'imagem do projeto';
    v.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // ===== Persistência (legacy localStorage helpers kept for fallback) =====
  // loadListSync: leitura síncrona do localStorage (usada pela UI para render imediato)
  function loadListSync(sub){
    try {
      var raw = localStorage.getItem(keyFor(sub));
      if (!raw) return [];
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.map(function(x){
        if (typeof x === 'string') return { id: Date.now()+':'+Math.random().toString(36).slice(2), data: x, name: 'image', ts: Date.now() };
        if (x && typeof x === 'object' && x.data) return x;
        return null;
      }).filter(Boolean);
    } catch(e){ console.warn('[ImagesPersist] loadListSync failed', e); return []; }
  }
  // manter alias (sempre síncrono) para compatibilidade com código que usa loadList
  function loadList(sub){ return loadListSync(sub); }

  // --------- Helpers: compat IDB (blImgSave) + localStorage (dual-write) ----------
  function assetKeyFromLocalKey(localKey) {
    try {
      var parts = String(localKey).split(':');
      if (parts.length >= 5) return parts.slice(4).join(':');
    } catch(_) {}
    return String(localKey);
  }

  async function saveImageAssetLocalAndIDB(localKey, assetKey, list /* array [{id,data,...}] */) {
    try {
      if (window.blImgSave && Array.isArray(list)) {
        for (var i=0;i<list.length;i++){
          var item = list[i];
          if (!item || !item.data) continue;
          var storeKey = assetKey + (item.id ? ('::' + item.id) : (':anon:' + Date.now() + '-' + Math.random().toString(36).slice(2)));
          try {
            await window.blImgSave(storeKey, item.data, { src: localKey, originalId: item.id || null });
          } catch(e){
            console.warn('[ImagesPersist] blImgSave failed for', storeKey, e);
          }
        }
      }
    } catch(e){
      console.warn('[ImagesPersist] saveImageAssetLocalAndIDB error', e);
    }

    try {
      localStorage.setItem(localKey, JSON.stringify(list||[]));
    } catch(e){
      console.warn('[ImagesPersist] localStorage write failed for', localKey, e);
    }
    return true;
  }

  // nova leitura assíncrona: tenta IndexedDB primeiro (se disponível), depois fallback para localStorage
  async function loadListAsync(sub){
    try {
      var localKey = keyFor(sub);
      var assetKey = assetKeyFromLocalKey(localKey);

      if (window.blImgListPrefix && window.blImgGet) {
        try {
          var recs = await window.blImgListPrefix(assetKey);
          if (Array.isArray(recs) && recs.length) {
            var out = [];
            for (var i=0;i<recs.length;i++){
              try {
                var rec = recs[i];
                var full = await window.blImgGet(rec.key);
                if (full && (full.dataURL || full.blob || full.toDataURL)) {
                  // full may provide dataURL directly or blob; try to normalize
                  var dataUrl = full.dataURL || (full.toDataURL ? await full.toDataURL() : null);
                  if (!dataUrl && full.blob){
                    // try to convert blob to dataURL
                    dataUrl = await (new Promise((res,rej)=>{
                      try {
                        var fr = new FileReader();
                        fr.onload = function(){ res(fr.result); };
                        fr.onerror = function(){ rej(fr.error||new Error('blob->dataURL error')); };
                        fr.readAsDataURL(full.blob);
                      } catch(er){ rej(er); }
                    }));
                  }
                  var parts = String(rec.key).split('::');
                  var id = parts.length>1 ? parts.slice(1).join('::') : rec.key;
                  out.push({ id: id, data: dataUrl || '', name: (full.meta && full.meta.name) || 'image', ts: full.addedAt || Date.now() });
                }
              } catch(e){ /* skip single */ }
            }
            if (out.length) return out;
          }
        } catch(e){ console.warn('[ImagesPersist] IDB read failed', e); }
      }

      return loadListSync(sub);
    } catch(e){
      console.warn('[ImagesPersist] loadListAsync fallback error', e);
      return loadListSync(sub);
    }
  }

  // ===== Renderização (agora assíncrona e resiliente) =====
  function renderRow(sub){
    var row = findRowForSub(sub);
    row.innerHTML = '';

    (async function(){
      var list = [];
      try { list = await loadListAsync(sub); } catch(e){ list = loadListSync(sub); }

      row.innerHTML = '';
      list.forEach(function(item){
        var t = el('div','thumb');
        var img = el('img');
        img.src = item.data;
        img.alt = item.name || 'imagem';
        img.loading = 'lazy';
        t.appendChild(img);

        var close = el('button','close');
        close.textContent = '×';
        close.title = 'Excluir imagem';
        close.addEventListener('click', async function(ev){
          ev.stopPropagation();
          try {
            var curr = loadListSync(sub);
            var next = curr.filter(function(x){ return x.id !== item.id; });
            await saveList(sub, next);
            try {
              if (window.blImgListPrefix && window.blImgDelete) {
                var localKey = keyFor(sub);
                var assetKey = assetKeyFromLocalKey(localKey);
                var recs = await window.blImgListPrefix(assetKey);
                for (var r=0;r<recs.length;r++){
                  var rk = recs[r].key;
                  if (rk && rk.indexOf('::'+item.id) >= 0) {
                    try { await window.blImgDelete(rk); } catch(_){ }
                  }
                }
              }
            } catch(e){ /* ignore idb delete errors */ }
          } catch(e){ console.warn('[ImagesPersist] remove thumb failed', e); }
          renderRow(sub);
        });
        t.appendChild(close);

        t.addEventListener('click', function(){ openViewer(item.data); });
        row.appendChild(t);
      });
    })();
  }

  // ===== Compressão =====
  function readFileAsDataURL(file){
    return new Promise(function(res, rej){
      var fr = new FileReader();
      fr.onload = function(){ res(fr.result); };
      fr.onerror = function(){ rej(fr.error || new Error('read error')); };
      fr.readAsDataURL(file);
    });
  }
  function loadDataURL(dataUrl){
    return new Promise(function(res, rej){
      var img = new Image();
      img.onload = function(){ res(img); };
      img.onerror = function(){ rej(new Error('image decode error')); };
      img.src = dataUrl;
    });
  }
  function drawToCanvas(img, maxW, maxH, quality){
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var k = Math.min(maxW/iw, maxH/ih, 1);
    var w = Math.round(iw*k), h = Math.round(ih*k);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var cx = c.getContext('2d', {alpha:false});
    cx.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  }
  async function fileToDataURL(file, maxW, maxH, q){
    var data = await readFileAsDataURL(file);
    var img = await loadDataURL(data);
    return drawToCanvas(img, maxW||CFG.MAX_W, maxH||CFG.MAX_H, q||CFG.QUALITY);
  }
  async function compressDataURLIfNeeded(dataUrl){
    try{
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
      if (dataUrl.startsWith('data:image/png') || dataUrl.length > 1_600_000){
        var img = await loadDataURL(dataUrl);
        return drawToCanvas(img, CFG.MAX_W, CFG.MAX_H, CFG.QUALITY);
      }
      return dataUrl;
    }catch(e){
      console.warn('[v4.1] compressDataURLIfNeeded falhou', e);
      return dataUrl;
    }
  }

  // ===== addImagesToSubstep (usa saveList) =====
  async function addImagesToSubstep(sub, files){
    if (!files || !files.length) return;
    // lemos lista atual (rápida)
    var list = loadListSync(sub) || [];
    var added = [];
    for (var i=0;i<files.length;i++){
      var f = files[i];
      try {
        var data = await fileToDataURL(f); // compress + dataURL
        var item = { id: Date.now() + ':' + Math.random().toString(36).slice(2), data: data, name: f.name, ts: Date.now() };
        list.push(item);
        added.push(item);
      } catch(err){
        console.warn('[ImagesPersist] falha ao processar arquivo', err);
      }
    }

    // salvar localStorage + tentar persistir no IDB e aguardar
    try {
      await saveList(sub, list);
    } catch(e){
      console.warn('[ImagesPersist] saveList falhou', e);
    }

    // Re-renderiza imediatamente (garante que as thumbs caiam na UI)
    try { renderRow(sub); } catch(e){ console.warn('[ImagesPersist] renderRow falhou', e); }

    // opcional: log de debug
    dbg('[images] added', sub, added.length);

    return added;
  }

  // ===== saveList (duplo write: IDB + localStorage) =====
  function saveList(sub, list){
    try {
      localStorage.setItem(keyFor(sub), JSON.stringify(list||[]));
    } catch(e){ console.warn('[ImagesPersist] Falha ao salvar imagens no localStorage:', e); }

    // tentativa de persistir em IDB: gravar cada item como chave "<sub>::<id>"
    // retornamos uma Promise para que chamador possa aguardar se quiser.
    if (!window.blImgSave) return Promise.resolve();
    var promises = [];
    try {
      for (var i=0;i<(list||[]).length;i++){
        (function(item){
          try {
            // gerar chave previsível
            var id = item.id || (Date.now() + ':' + Math.random().toString(36).slice(2));
            var key = sub + '::' + id;
            // grava o dataURL no IDB (blImgSave)
            // blImgSave(key, dataURL) — aceita string dataURL
            promises.push(window.blImgSave(key, item.data));
          } catch(e){ /* ignora item */ }
        })(list[i]);
      }
    } catch(e){ /* ignore */ }

    // também podemos limpar entradas ORFÃs no IDB (opcional) — omitido por simplicidade
    return Promise.all(promises).catch(function(e){
      console.warn('[ImagesPersist] Alguma gravação no IDB falhou', e);
    });
  }

  // ===== Migração =====
  function estimateBytes(str){ try { return new Blob([str]).size; } catch(e){ return (str||'').length; } }
  async function migrateKey(key){
    try {
      var before = localStorage.getItem(key);
      if (!before) return {key, changed:false, savedBytes:0};
      var arr = JSON.parse(before);
      if (!Array.isArray(arr) || arr.length===0) return {key, changed:false, savedBytes:0};
      var changed=false, out=[];
      for (var i=0;i<arr.length;i++){
        var it = arr[i];
        if (typeof it === 'string'){
          var comp = await compressDataURLIfNeeded(it);
          out.push(comp);
          if (comp !== it) changed = true;
        } else if (it && typeof it==='object' && it.data){
          var comp2 = await compressDataURLIfNeeded(it.data);
          if (comp2 !== it.data){ it.data = comp2; changed = true; }
          out.push(it);
        } else {
          out.push(it);
        }
      }
      if (changed){
        var afterStr = JSON.stringify(out);
        var saved = Math.max(0, estimateBytes(before)-estimateBytes(afterStr));
        localStorage.setItem(key, afterStr);
        return {key, changed:true, savedBytes:saved};
      }
      return {key, changed:false, savedBytes:0};
    } catch(e){
      console.warn('[v4.1] migrateKey falhou', key, e);
      return {key, changed:false, savedBytes:0};
    }
  }
  async function migrateAll(){
    var keys = Object.keys(localStorage).filter(function(k){ return k.indexOf(STORE_PREFIX+':')===0; });
    var totalSaved=0, changedCount=0;
    for (var i=0;i<keys.length;i++){
      var res = await migrateKey(keys[i]);
      if (res.changed){ changedCount++; totalSaved += (res.savedBytes||0); }
    }
    var report = { at: new Date().toISOString(), keysProcessed: keys.length, changedCount: changedCount, totalSavedBytes: totalSaved };
    localStorage.setItem('bl:v4.1:migration:report', JSON.stringify(report));
    console.info('[v4.1] Migração concluída:', report);
    return report;
  }

  // ===== Picker com trava =====
  var __BL_IMG_PICKING__ = false;
  function openPickerForSub(sub){
    if (__BL_IMG_PICKING__) return;
    __BL_IMG_PICKING__ = true;

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    var cleaned = false;
    function cleanup(){
      if (cleaned) return;
      cleaned = true;
      __BL_IMG_PICKING__ = false;
      try { document.body.removeChild(input); } catch(_){ }
      window.removeEventListener('focus', onFocusBack, true);
      clearTimeout(safetyTimer);
    }
    function onFocusBack(){ setTimeout(cleanup,0); }
    window.addEventListener('focus', onFocusBack, true);
    var safetyTimer = setTimeout(cleanup, 8000);

    input.addEventListener('click', function(e){ e.stopPropagation(); });
    input.addEventListener('change', async function(){
      try{
        var files = Array.from(input.files || []);
        if (files.length){ await addImagesToSubstep(sub, files); }
      } finally {
        cleanup();
      }
    }, { once:true });

    input.click();
  }
  window.__BL_OPEN_IMG_PICKER__ = openPickerForSub;

  // ===== Listener único =====
  if (window.__BL_IMG_HANDLER__) {
    document.removeEventListener('click', window.__BL_IMG_HANDLER__, true);
  }
  window.__BL_IMG_HANDLER__ = function(ev){
    var btn = ev.target.closest('.btn.add-image');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    var sub = btn.getAttribute('data-subetapa')
      || btn.closest('[data-step]')?.getAttribute('data-step')
      || btn.closest('[id^="sec-"]')?.id
      || 'global';
    openPickerForSub(sub);
  };
  document.addEventListener('click', window.__BL_IMG_HANDLER__, true);

  // ===== Inicialização =====
  function mount(){
    var subs = new Set();
    $all('.btn.add-image').forEach(function(btn){
      var sub = btn.getAttribute('data-subetapa')
        || btn.closest('[data-step]')?.getAttribute('data-step')
        || btn.closest('[id^="sec-"]')?.id
        || 'global';
      subs.add(sub);
      findRowForSub(sub);
    });
    subs.forEach(renderRow);
  }

  if (window.BL_CTX && typeof BL_CTX.onCtx === 'function'){
    BL_CTX.onCtx(function(){ mount(); });
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // ===== API mínima =====
  window.ImagesPersist = window.ImagesPersist || {};
  window.ImagesPersist.fileToDataURL = fileToDataURL;
  window.ImagesPersist.compressDataURLIfNeeded = compressDataURLIfNeeded;
  window.ImagesPersist.migrateAll = migrateAll;
  window.ImagesPersist.keyFor = keyFor;
  window.ImagesPersist._v41 = true;

  // ===== Migração automática =====
  try {
    if (!localStorage.getItem('bl:v4.1:migrated')){
      migrateAll().finally(function(){
        localStorage.setItem('bl:v4.1:migrated', new Date().toISOString());
      });
    }
  } catch(e){
    console.warn('[v4.1] migração automática não executada', e);
  }

})();
