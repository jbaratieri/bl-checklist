/*! load-assets.patch.js — v2.7
    - Suporta manifest JSON com lista de strings OU lista de objetos {thumb, full, caption}
    - Corrigido: base dinâmico (usa a pasta do próprio manifest.json)
    - Toggle abrir/fechar com data-label-open / data-label-close
    - Renderiza legendas (captions) abaixo das miniaturas
    - Viewer embutido caso window.openViewer não exista
    - Fecha ao clicar em QUALQUER lugar (inclusive na imagem)
    - Cursor de lupa(–) no overlay e na imagem
    - Tecla ESC fecha; bloqueio/desbloqueio do scroll do body
*/
(function(){
  'use strict';

  // ------------------------
  // Utils
  // ------------------------
  function $(sel, root){ return (root||document).querySelector(sel); }
  function el(tag, cls){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  // ------------------------
  // Viewer (fallback)
  // ------------------------
  var escListenerAttached = false;

  function ensureLocalViewer(){
    var v = $('#assetsViewer');
    if (v) return v;

    v = el('div'); 
    v.id = 'assetsViewer';
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-hidden', 'true');
    v.style.cssText = [
      'position:fixed',
      'inset:0',
      'display:none',
      'background:rgba(0,0,0,.65)',
      'z-index:3000',
      'align-items:center',
      'justify-content:center',
      'padding:20px',
      'cursor:zoom-out'
    ].join(';');

    v.innerHTML = ''+
      '<div style="position:relative;max-width:95vw;max-height:95vh;">' +
        '<img id="assetsViewerImg" alt="" ' +
          'style="display:block;max-width:95vw;max-height:95vh;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5);cursor:zoom-out" />' +
        '<button id="assetsViewerClose" type="button" aria-label="Fechar" ' +
          'style="position:absolute;top:-12px;right:-12px;border:0;background:#111;color:#fff;border-radius:999px;width:36px;height:36px;font-size:20px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)">×</button>' +
      '</div>';

    document.body.appendChild(v);

    // Fecha ao clicar no overlay, imagem ou botão
    v.addEventListener('click', function(e){
      if (e.target.id === 'assetsViewerClose' || e.target.id === 'assetsViewerImg' || e.target === v) {
        v.style.display = 'none';
        v.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });

    if (!escListenerAttached) {
      document.addEventListener('keydown', function(e){
        if (e.key === 'Escape' && v.style.display !== 'none') {
          v.style.display = 'none';
          v.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        }
      });
      escListenerAttached = true;
    }

    return v;
  }

  function openViewer(url){
    if (typeof window.openViewer === 'function') { 
      window.openViewer(url); 
      return; 
    }
    var v = ensureLocalViewer();
    var img = $('#assetsViewerImg', v);
    img.src = url;
    v.style.display = 'flex';
    v.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // ------------------------
  // Render helpers
  // ------------------------
  function createThumb(thumbUrl, caption, fullUrl){
    var t = el('div','thumb');
    t.setAttribute('data-src', fullUrl || thumbUrl);

    var img = el('img');
    img.src = thumbUrl;
    img.alt = caption || 'imagem do projeto';
    img.loading = 'lazy';
    img.decoding = 'async';
    t.appendChild(img);

    var z = el('span','zoom-ico');
    z.textContent = '🔍';
    z.style.cssText = 'position:absolute;bottom:6px;right:8px;font-size:16px;pointer-events:none;';
    t.appendChild(z);

    if (caption) {
      var cap = el('div','caption');
      cap.textContent = caption;
      cap.style.cssText = 'display:block;margin-top:4px;font-size:12px;line-height:1.3;text-align:center;color:#444;';
      t.appendChild(cap);
    }

    t.addEventListener('click', function(){
      openViewer(fullUrl || thumbUrl);
    });

    return t;
  }

  function renderList(row, base, files, captions){
    row.innerHTML = '';
    (files || []).forEach(function(item){
      let thumbUrl, fullUrl, cap = '';

      if (typeof item === 'string'){
        // formato antigo: lista de strings
        thumbUrl = item;
        fullUrl  = item;
        if (captions && captions[item]) cap = captions[item];
      }
    

      else if (item && typeof item === 'object'){
  // formato novo: {thumb, full, caption}
  thumbUrl = base + item.thumb;
  fullUrl  = base + item.full;
  cap      = item.caption || '';
}


      if (thumbUrl) row.appendChild(createThumb(thumbUrl, cap, fullUrl));
    });
  }

  // ------------------------
  // Data loading
  // ------------------------
  async function loadFromManifest(manifestUrl, fallbackBase){
    var res = await fetch(manifestUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest fetch failed: '+res.status);
    var data = await res.json();

    // base dinâmico = pasta onde está o JSON
    var base = manifestUrl.substring(0, manifestUrl.lastIndexOf('/')+1);

    var images = Array.isArray(data.images) ? data.images : [];
    return { base: base, images: images, captions: data.captions || null };
  }

  // ------------------------
  // Core handler
  // ------------------------
  async function handleBtn(btn){
    var targetSel = btn.getAttribute('data-target') || '';
    var base      = btn.getAttribute('data-assets-base') || './assets/';
    var csvAttr   = btn.getAttribute('data-assets') || '';
    var manifest  = btn.getAttribute('data-manifest') || '';
    var labelOpen = btn.getAttribute('data-label-open')  || 'Carregar imagens extras';
    var labelClose= btn.getAttribute('data-label-close') || 'Fechar imagens extras';

    var row = targetSel ? $(targetSel) : null;
    if (!row) {
      row = btn.closest('.tool-row')?.querySelector('.assets-row')
         || btn.parentElement?.querySelector('.assets-row')
         || null;
    }
    if (!row) {
      console.warn('[assets] contêiner não encontrado:', targetSel || null);
      return;
    }

    if (btn.dataset.loaded === '1') {
      row.innerHTML = '';
      btn.dataset.loaded = '0';
      btn.textContent = labelOpen;
      return;
    }

    try {
      if (manifest) {
        var data = await loadFromManifest(manifest, base);
        renderList(row, data.base, data.images, data.captions);
      } else {
        var files = csvAttr.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        if (!/\/$/.test(base)) base += '/';
        renderList(row, base, files, null);
      }
      btn.dataset.loaded = '1';
      btn.textContent = labelClose;
    } catch (e) {
      console.error('[assets] erro ao carregar imagens:', e);
      row.innerHTML = '<p style="margin:8px 0;color:#a00;">Não foi possível carregar as imagens.</p>';
      btn.dataset.loaded = '0';
      btn.textContent = labelOpen;
    }
  }

  // ------------------------
  // Delegação de eventos
  // ------------------------
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest('.btn.load-assets');
    if (!btn) return;
    ev.preventDefault();
    handleBtn(btn);
  }, true);

})();
