/* Step 12 — Desenho Técnico v4.4
   - UI simplificada (sem Resetar/Exportar/Salvar; auto-save ativo)
   - Mobile usa "cover" (imagem ocupa mais o canvas)
   - RESTAURA assets discovery + fallbacks e overlay restore
*/
(function(){
  'use strict';

  var INST_KEY = 'bl:instrument';
  var STORE_PREFIX = 'bl:v1';
  var FALLBACKS = ['webp','svg','png','jpg','jpeg'];

  var INST_ALIAS = {
    'vcl':'vcl','violao':'vcl','violão':'vcl','guitarra-classica':'vcl','violao-classico':'vcl',
    'vla':'vla','viola':'vla','viola-caipira':'vla',
    'cav':'cav','cavaquinho':'cav',
    'ukl':'ukl','ukulele':'ukl','ukulelê':'ukl'
  };

  function dbg(){ if (window.BL_DEBUG_DRAW) try{ console.info.apply(console, arguments); }catch(_){ } }
  function warn(){ if (window.BL_DEBUG_DRAW) try{ console.warn.apply(console, arguments); }catch(_){ } }

  function normInst(code){
    if (!code) return 'vcl';
    var k = String(code).toLowerCase();
    try{ k = k.normalize('NFD').replace(/\p{Diacritic}/gu,''); }catch(_){ }
    return INST_ALIAS[k] || k;
  }

  function getInst(){
    var raw = 'vcl';
    try {
      raw = (window.BL_CTX && BL_CTX.getInst())
         || (window.BL_INSTRUMENT && BL_INSTRUMENT.get())
         || localStorage.getItem(INST_KEY)
         || 'vcl';
    } catch(_){}
    return normInst(raw);
  }

  function getProj(inst){
    var id = null;
    try {
      if (window.BL_PROJECT && typeof BL_PROJECT.get === 'function'){
        id = BL_PROJECT.get(inst || getInst());
      }
    }catch(_){}
    return id || 'default';
  }

  function storeKeyNew(inst, proj, token){
    return STORE_PREFIX + ':' + inst + ':' + proj + ':draw:' + token;
  }
  function storeKeyOld(inst, token){
    return STORE_PREFIX + ':' + inst + ':draw:' + token;
  }

  // ---------- Bases e resolução de assets ----------
  function basesForAssets(){
    var bases = [];
    try{
      if (window.BL_TECH_CFG && typeof BL_TECH_CFG.base === 'string'){
        var b = BL_TECH_CFG.base.trim();
        if (b && !/\/$/.test(b)) b += '/';
        if (b) bases.push(b);
      }
    }catch(_){}

    if (location.protocol !== 'file:'){
      try{
        var link = document.querySelector('link[rel="manifest"]');
        if (link){
          var href = link.getAttribute('href') || '';
          if (href && !/^[a-z]+:/i.test(href)){
            var a = document.createElement('a'); a.href = href; href = a.getAttribute('href');
          }
          var pub = href.replace(/manifest\.json.*$/,'');
          if (pub && !/\/$/.test(pub)) pub += '/';
          if (pub) bases.push(pub + 'assets/tech/');
        }
      }catch(_){}
    }

    // colocar a versão mais provável no topo para reduzir 404s
    bases.push('/assets/tech/');
    bases.push('assets/tech/');
    bases.push('../public/assets/tech/');

    // remover duplicatas mantendo a ordem mas garantindo que '/assets/tech/' venha primeiro
    var seen = {}, out = [];
    for (var i=0;i<bases.length;i++){
      var k = String(bases[i]||'').toLowerCase();
      if (k && !seen[k]){ seen[k]=1; out.push(bases[i]); }
    }
    // se houver variações com e sem barra, normalize a saída (não obrigatório, apenas higiene)
    for (var j=0;j<out.length;j++){
      if (out[j] && !/\/$/.test(out[j])) out[j] = out[j];
    }
    return out;
  }

  // não tenta "__body": usa somente o nome exato ou path explícito
  function assetsFor(inst, keyOrPath){
    if (/[\\/]/.test(keyOrPath) || /\.\w{2,5}$/.test(keyOrPath)){
      return [keyOrPath]; // já é caminho/arquivo com extensão
    }
    var names = [keyOrPath];
    var exts  = FALLBACKS.slice();
    var bases = basesForAssets();
    var list  = [];
    for (var b=0;b<bases.length;b++){
      for (var n=0;n<names.length;n++){
        for (var e=0;e<exts.length;e++){
          var base = bases[b];
          if (/assets\/tech\/$/i.test(base)){
            list.push(base + inst + '/' + names[n] + '.' + exts[e]);
          } else {
            list.push(base + names[n] + '.' + exts[e]);
          }
        }
      }
    }
    return list;
  }

  // ---------- Overlay: salvar / carregar ----------
  function setStatus(msg){
    var el = document.getElementById('saveStatus');
    if (!el) return;
    el.textContent = msg || '';
  }

  function saveOverlayToStore(inst, token, overlay){
  var proj = getProj(inst);
  try{
    var key = storeKeyNew(inst, proj, token);
    var url = overlay.canvas.toDataURL('image/png');

    // tentativa assíncrona de salvar no IDB (fire & forget)
    (async function(){
      try {
        // storeKey para overlays: <token>::overlay  (mantemos simples)
        var storeKey = (token ? token : 'draw') + '::overlay';
        if (window.blImgSave) {
          await window.blImgSave(storeKey, url, { overlay: true, inst: inst, proj: proj, token: token, addedAt: Date.now() });
          dbg && dbg('[draw] overlay saved to IDB', storeKey);
        }
      } catch(e){
        warn && warn('[draw] overlay save to IDB failed', e);
      }
    })();

    // manter compat (localStorage) para fallback
    try {
      localStorage.setItem(key, url);
      var d = new Date();
      setStatus('Salvo às ' + d.toLocaleTimeString());
    } catch(e){
      console.error('Falha ao salvar overlay no localStorage:', e);
    }
  }catch(e){ console.error('Falha ao salvar overlay:', e); }
}


  function tryLoad(keys, overlay, done){
    if (!keys.length) return done && done(false);
    var key = keys.shift();
    try{
      var v = localStorage.getItem(key);
      if (!v) return tryLoad(keys, overlay, done);
      var img = new Image();
      img.onload = function(){
        overlay.ctx.clearRect(0,0,overlay.canvas.width, overlay.canvas.height);
        overlay.ctx.drawImage(img, 0, 0);
        done && done(true);
      };
      img.onerror = function(){ tryLoad(keys, overlay, done); };
      img.src = v;
    }catch(e){
      tryLoad(keys, overlay, done);
    }
  }

  function loadOverlayFromStore(inst, token, overlay, done){
  var proj = getProj(inst);
  var keys = [storeKeyNew(inst, proj, token), storeKeyOld(inst, token)];

  // tentativa IDB primeiro (se helpers existirem)
  (async function(){
    try {
      if (window.blImgListPrefix && window.blImgGet) {
        var assetPrefix = (token ? token : 'draw'); // usamos mesmo prefixo do save
        try {
          var recs = await window.blImgListPrefix(assetPrefix);
          if (Array.isArray(recs) && recs.length) {
            // preferir o rec que termina com ::overlay
            var found = recs.find(r => r.key && r.key.indexOf('::overlay')>=0) || recs[0];
            if (found) {
              try {
                var full = await window.blImgGet(found.key);
                if (full && full.toDataURL) {
                  var dataUrl = await full.toDataURL();
                  var img = new Image();
                  img.onload = function(){
                    overlay.ctx.clearRect(0,0,overlay.canvas.width, overlay.canvas.height);
                    overlay.ctx.drawImage(img, 0, 0);
                    done && done(true);
                  };
                  img.onerror = function(){ proceedToLocal(); };
                  img.src = dataUrl;
                  return;
                }
              } catch(e){ /* continue to local */ }
            }
          }
        } catch(e){ /* ignore IDB read errors, fallback to local */ }
      }
    } catch(e){ /* ignore */ }

    // fallback para leitura por localStorage (comportamento anterior)
    function proceedToLocal(){
      tryLoad(keys, overlay, done);
    }
    proceedToLocal();
  })();
}


  var saveTimer = null;
  function autoSaveSoon(){
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      if (state.overlay && state.token && state.inst){
        if (typeof window.__BL_SAVE_OVERLAY__ === 'function'){
          try { window.__BL_SAVE_OVERLAY__(state.token, state.overlay.canvas); return; } catch(_){}
        }
        saveOverlayToStore(state.inst, state.token, state.overlay);
      }
    }, 500);
  }

  // ---------- Canvas helpers ----------
  function drawContainOrCover(ctx, img, W, H){
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var k = (window.innerWidth <= 600) ? Math.max(W/iw, H/ih) : Math.min(W/iw, H/ih); // mobile=cover, desktop=contain
    var dw = Math.round(iw*k), dh = Math.round(ih*k);
    var dx = Math.round((W - dw)/2), dy = Math.round((H - dh)/2);
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function messageOverlay(ctx, W, H, text){
    ctx.save();
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#333';
    ctx.font = '20px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, Math.round(W/2), Math.round(H/2));
    ctx.restore();
  }

  function redraw(baseCtx, canvas){
    if (state.bgImg && (state.bgImg.naturalWidth || state.bgImg.width)){
      drawContainOrCover(baseCtx, state.bgImg, canvas.width, canvas.height);
    } else {
      baseCtx.fillStyle = '#fff'; baseCtx.fillRect(0,0,canvas.width, canvas.height);
    }
    if (state.overlay) baseCtx.drawImage(state.overlay.canvas, 0, 0);
  }

  function beginStroke(){
    var x = state.overlay.ctx;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.lineWidth = state.size;
    if (state.tool === 'eraser'){
      x.globalCompositeOperation = 'destination-out';
      x.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = state.color;
    }
    x.beginPath();
  }

  var state = {
    token: null,
    assetKey: null,
    inst:  null,
    bgImg: null,
    overlay: null,
    tool: 'pen',
    size: 4,
    color: '#2e2a26',
    drawing: false,
    last: null
  };

  // ---------- Modal ----------
  function ensureModal(){
    var modal = document.querySelector('#drawModal') || document.querySelector('#draw-modal');
    if (!modal){
      modal = document.createElement('div');
      modal.id = 'drawModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    modal.setAttribute('aria-hidden','true');
    modal.setAttribute('inert','');
    modal.style.display = 'none';

    modal.innerHTML = ''
      + '<div class="dialog">'
      + '  <div class="title">Desenho Técnico</div>'
      + '  <div class="toolbar">'
      + '    <div class="group">'
      + '      <button type="button" data-tool="pen" class="active">Lápis</button>'
      + '      <button type="button" data-tool="eraser">Borracha</button>'
      + '      <button type="button" data-tool="text">Texto</button>'
      + '    </div>'
      + '    <div class="group">'
      + '      <label>Cor</label>'
      + '      <input type="color" id="drawColor" value="#2e2a26" />'
      + '    </div>'
      + '    <div class="group">'
      + '      <label>Espessura</label>'
      + '      <input type="range" min="1" max="24" step="1" value="4" id="drawSize" />'
      + '    </div>'
      + '    <div class="group" id="saveStatus" style="margin-left:auto;font-size:12px;color:#2a6;"></div>'
      + '  </div>'
      + '  <div class="canvas-wrap">'
      + '    <canvas id="drawCanvas" width="1700" height="800"></canvas>'
      + '  </div>'
      + '  <div class="actions">'
      + '    <div class="left">'
      + '      <button type="button" id="btnClear">Limpar</button>'
      + '    </div>'
      + '    <div class="right">'
      + '      <button type="button" id="btnCloseDraw">Fechar</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    return modal;
  }

  function showModal(modal){
    modal.removeAttribute('aria-hidden');
    modal.removeAttribute('inert');
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function hideModal(modal){
    try{
      if (document.activeElement && modal.contains(document.activeElement)){
        document.activeElement.blur();
      }
    }catch(_){}
    modal.setAttribute('aria-hidden','true');
    modal.setAttribute('inert','');
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  // ---------- Fluxo principal ----------
  function openCanvasForToken(token, assetKey){
    state.token = token;
    state.assetKey = assetKey || token;
    state.inst  = getInst();
    var modal   = ensureModal();

    showModal(modal);

    var canvas = modal.querySelector('#drawCanvas');
    var base   = canvas.getContext('2d');
    setStatus('');

    state.overlay = (function(){
      var c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
      var x = c.getContext('2d'); x.clearRect(0,0,c.width,c.height);
      return {canvas:c, ctx:x};
    })();

    // Carrega o fundo com fallback de caminhos/extensões
    state.bgImg = new Image();
    var srcs = assetsFor(state.inst, state.assetKey);
    var idx  = 0;

    state.bgImg.onload = function(){
      redraw(base, canvas);
      // tenta restaurar overlay salvo
      var restore = function(found){ redraw(base, canvas); setStatus(found ? 'Anotações restauradas' : ''); };
      if (typeof window.__BL_LOAD_OVERLAY__ === 'function'){
        try { window.__BL_LOAD_OVERLAY__(state.token, function(img){
          if (img){ state.overlay.ctx.drawImage(img,0,0); restore(true); }
          else restore(false);
        }); }
        catch(_){ loadOverlayFromStore(state.inst, state.token, state.overlay, restore); }
      } else {
        loadOverlayFromStore(state.inst, state.token, state.overlay, restore);
      }
    };
    state.bgImg.onerror = function(){
      idx++;
      if (idx < srcs.length){
        state.bgImg.src = srcs[idx];
      } else {
        // acabou os fallbacks
        messageOverlay(base, canvas.width, canvas.height, 'Arquivo não encontrado: ' + state.assetKey);
        var restore = function(found){ redraw(base, canvas); setStatus(found ? 'Anotações restauradas' : ''); };
        loadOverlayFromStore(state.inst, state.token, state.overlay, restore);
      }
    };
    if (location.protocol !== 'file:'){
      state.bgImg.referrerPolicy = 'no-referrer';
      state.bgImg.crossOrigin = 'anonymous';
    }
    state.bgImg.src = srcs[0];
    dbg('[draw] tentando assets:', srcs);

    // Controles
    var sizeInput  = modal.querySelector('#drawSize');
    var colorInput = modal.querySelector('#drawColor');
    if (sizeInput){ sizeInput.value = state.size; sizeInput.oninput = function(){ state.size = parseInt(sizeInput.value||'4',10); }; }
    if (colorInput){ colorInput.value = state.color; colorInput.oninput = function(){ state.color = colorInput.value||'#000000'; }; }

    Array.prototype.forEach.call(modal.querySelectorAll('[data-tool]'), function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-tool') === state.tool);
      btn.onclick = function(){
        state.tool = btn.getAttribute('data-tool') || 'pen';
        Array.prototype.forEach.call(modal.querySelectorAll('[data-tool]'), function(b){
          b.classList.toggle('active', b===btn);
        });
      };
    });

    // Desenho
    function pt(canvas, e){
      var rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) * (canvas.width/rect.width),
               y: (e.clientY - rect.top)  * (canvas.height/rect.height) };
    }
    function onDown(e){
      if (state.tool === 'text') return;
      e.preventDefault();
      canvas.setPointerCapture && e.pointerId && canvas.setPointerCapture(e.pointerId);
      state.drawing = true; state.last = pt(canvas, e);
      beginStroke();
      state.overlay.ctx.moveTo(state.last.x, state.last.y);
    }
    function onMove(e){
      if (!state.drawing) return;
      var p = pt(canvas, e);
      state.overlay.ctx.lineTo(p.x, p.y);
      state.overlay.ctx.stroke();
      state.last = p;
      redraw(base, canvas);
    }
    function onUp(){
      if (!state.drawing) return;
      state.drawing = false; state.last = null;
      redraw(base, canvas);
      autoSaveSoon();
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);

    // Texto
    function onClickForText(e){
      if (state.tool !== 'text') return;
      var txt = prompt('Texto a inserir:');
      if (!txt) return;
      var p = pt(canvas, e);
      var x = state.overlay.ctx;
      x.save();
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = state.color;
      var px = Math.max(10, Math.round(8 + state.size * 2));
      x.font = px + 'px Inter, Arial, sans-serif';
      x.textBaseline = 'top';
      x.fillText(txt, p.x, p.y);
      x.restore();
      redraw(base, canvas);
      autoSaveSoon();
    }
    canvas.addEventListener('click', onClickForText);

    // Ações
    var btnClear = modal.querySelector('#btnClear');
    var btnClose = modal.querySelector('#btnCloseDraw') || modal.querySelector('#btnClose');

    function doSave(){
      if (state.overlay && state.token && state.inst){
        if (typeof window.__BL_SAVE_OVERLAY__ === 'function'){
          try { window.__BL_SAVE_OVERLAY__(state.token, state.overlay.canvas); return; } catch(_){}
        }
        saveOverlayToStore(state.inst, state.token, state.overlay);
      }
    }

    if (btnClear) btnClear.onclick = function(){
      state.overlay.ctx.clearRect(0,0,state.overlay.canvas.width,state.overlay.canvas.height);
      redraw(base, canvas);
      autoSaveSoon();
    };

    function cleanup(){
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
      canvas.removeEventListener('click', onClickForText);
      window.removeEventListener('keydown', onKey);
      modal.removeEventListener('click', modalClick);
    }

    if (btnClose) btnClose.onclick = function(){
      doSave();
      hideModal(modal);
      cleanup();
    };

    // atalhos: Ctrl+S e ESC; clique fora fecha
    function onKey(e){
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')){ e.preventDefault(); doSave(); }
      if (e.key === 'Escape'){ btnClose && btnClose.click(); }
    }
    window.addEventListener('keydown', onKey);

    function modalClick(e){ if (e.target === modal){ doSave(); btnClose && btnClose.click(); } }
    modal.addEventListener('click', modalClick);
  }

  // Abrir pelo botão .open-draw / .draw
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.open-draw, .tool-row .open-draw, .tool-row .draw, .draw');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var token = btn.getAttribute('data-subetapa');
    if (!token){
      var step = btn.closest('[data-step]');
      if (step) token = step.getAttribute('data-step');
      if (!token){
        var sec = btn.closest('[id^="sec-"]');
        token = sec ? sec.id : 'root';
      }
    }
    var assetKey = btn.getAttribute('data-tech') || btn.getAttribute('data-asset') || token;
    openCanvasForToken(token, assetKey);
  }, true);

  window.openCanvasForToken = openCanvasForToken;
})();
