/* Step 12 — Desenho Técnico v4.3
   - Ajuste mobile: imagem ocupa mais espaço (cover no <=600px)
   - Remove botões: Resetar / Exportar / Salvar (auto-save já ativo)
   - Toolbar compacta no mobile
*/
(function(){
  'use strict';

  var INST_KEY = 'bl:instrument';
  var STORE_PREFIX = 'bl:v1';
  var FALLBACKS = ['svg','png','jpg','webp','jpeg'];

  var INST_ALIAS = {
    'vcl':'vcl','violao':'vcl','violão':'vcl','guitarra-classica':'vcl','violao-classico':'vcl',
    'vla':'vla','viola':'vla','viola-caipira':'vla',
    'cav':'cav','cavaquinho':'cav',
    'ukl':'ukl','ukulele':'ukl','ukulelê':'ukl'
  };

  function dbg(){ if (window.BL_DEBUG_DRAW) try{ console.info.apply(console, arguments); }catch(_){ } }
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

  // Modal helpers
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

  function setStatus(msg){
    var el = document.getElementById('saveStatus');
    if (!el) return;
    el.textContent = msg || '';
  }

  // 🔧 Cover no mobile, Contain no desktop
  function drawContain(ctx, img, W, H){
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var k;
    if (window.innerWidth <= 600) {
      k = Math.max(W/iw, H/ih); // cover
    } else {
      k = Math.min(W/iw, H/ih); // contain
    }
    var dw = Math.round(iw*k), dh = Math.round(ih*k);
    var dx = Math.round((W - dw)/2), dy = Math.round((H - dh)/2);
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function saveOverlayToStore(inst, token, overlay){
    var proj = getProj(inst);
    try{
      var key = storeKeyNew(inst, proj, token);
      var url = overlay.canvas.toDataURL('image/png');
      localStorage.setItem(key, url);
      var d = new Date();
      setStatus('Salvo às ' + d.toLocaleTimeString());
    }catch(e){ console.error('Falha ao salvar overlay:', e); }
  }

  var saveTimer = null;
  function autoSaveSoon(){
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      if (state.overlay && state.token && state.inst){
        saveOverlayToStore(state.inst, state.token, state.overlay);
      }
    }, 500);
  }

  function redraw(baseCtx, canvas){
    if (state.bgImg && (state.bgImg.naturalWidth || state.bgImg.width)){
      drawContain(baseCtx, state.bgImg, canvas.width, canvas.height);
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

    state.bgImg = new Image();
    state.bgImg.onload = function(){ redraw(base, canvas); };
    state.bgImg.src = assetKey;

    var sizeInput  = modal.querySelector('#drawSize');
    var colorInput = modal.querySelector('#drawColor');
    if (sizeInput){ sizeInput.value = state.size; sizeInput.oninput = () => state.size = parseInt(sizeInput.value||'4',10); }
    if (colorInput){ colorInput.value = state.color; colorInput.oninput = () => state.color = colorInput.value||'#000000'; }

    Array.prototype.forEach.call(modal.querySelectorAll('[data-tool]'), function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-tool') === state.tool);
      btn.onclick = function(){
        state.tool = btn.getAttribute('data-tool') || 'pen';
        Array.prototype.forEach.call(modal.querySelectorAll('[data-tool]'), function(b){
          b.classList.toggle('active', b===btn);
        });
      };
    });

    function pt(canvas, e){
      var rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left) * (canvas.width/rect.width),
               y: (e.clientY - rect.top)  * (canvas.height/rect.height) };
    }
    function onDown(e){ if (state.tool==='text') return; e.preventDefault(); state.drawing=true; state.last=pt(canvas,e); beginStroke(); state.overlay.ctx.moveTo(state.last.x,state.last.y); }
    function onMove(e){ if (!state.drawing) return; var p=pt(canvas,e); state.overlay.ctx.lineTo(p.x,p.y); state.overlay.ctx.stroke(); state.last=p; redraw(base,canvas); }
    function onUp(){ if (!state.drawing) return; state.drawing=false; redraw(base,canvas); autoSaveSoon(); }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);

    canvas.addEventListener('click', function(e){
      if (state.tool!=='text') return;
      var txt = prompt('Texto a inserir:'); if (!txt) return;
      var p = pt(canvas,e); var x=state.overlay.ctx;
      x.save(); x.globalCompositeOperation='source-over'; x.fillStyle=state.color;
      var px=Math.max(10,Math.round(8+state.size*2));
      x.font=px+'px Inter, Arial, sans-serif'; x.textBaseline='top'; x.fillText(txt,p.x,p.y);
      x.restore(); redraw(base,canvas); autoSaveSoon();
    });

    var btnClear = modal.querySelector('#btnClear');
    var btnClose = modal.querySelector('#btnCloseDraw');
    if (btnClear) btnClear.onclick = () => { state.overlay.ctx.clearRect(0,0,state.overlay.canvas.width,state.overlay.canvas.height); redraw(base,canvas); autoSaveSoon(); };
    if (btnClose) btnClose.onclick = () => { hideModal(modal); canvas.replaceWith(canvas.cloneNode(true)); };
  }

  document.addEventListener('click', function(e){
    var btn = e.target.closest('.open-draw, .tool-row .open-draw, .tool-row .draw, .draw');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var token = btn.getAttribute('data-subetapa') || btn.closest('[data-step]')?.dataset.step || 'root';
    var assetKey = btn.getAttribute('data-tech') || btn.getAttribute('data-asset') || token;
    openCanvasForToken(token, assetKey);
  }, true);

  window.openCanvasForToken = openCanvasForToken;
})();
