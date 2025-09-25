/*! viewer.global.js — v1.0 (singleton)
   - window.openViewer(url, alt?)  → abre
   - window.closeViewer()          → fecha
   - Clique em qualquer lugar/ESC → fecha
   - Cursor zoom-out + trava scroll do body
*/
(function(){
  'use strict';
  if (window.BLViewer) return;

  function ensure() {
    var v = document.getElementById('blViewer');
    if (v) return v;

    v = document.createElement('div');
    v.id = 'blViewer';
    v.setAttribute('role','dialog');
    v.setAttribute('aria-hidden','true');
    v.style.cssText = [
      'position:fixed','inset:0','display:none',
      'background:rgba(0,0,0,.70)','z-index:9999',
      'align-items:center','justify-content:center',
      'padding:20px','cursor:zoom-out'
    ].join(';');

    v.innerHTML =
      '<div style="position:relative;max-width:95vw;max-height:95vh;">' +
        '<img id="blViewerImg" alt="" ' +
          'style="display:block;max-width:95vw;max-height:95vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.55);cursor:zoom-out" />' +
        '<button id="blViewerClose" type="button" aria-label="Fechar" ' +
          'style="position:absolute;top:-14px;right:-14px;border:0;background:#111;color:#fff;border-radius:999px;width:38px;height:38px;font-size:20px;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35)">×</button>' +
      '</div>';

    document.body.appendChild(v);

    // Fechar clicando em QUALQUER lugar (overlay, imagem ou botão)
    v.addEventListener('click', function(e){
      if (e.target === v || e.target.id === 'blViewerImg' || e.target.id === 'blViewerClose') {
        window.closeViewer();
      }
    });

    // ESC fecha (uma vez só)
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && v.style.display !== 'none') window.closeViewer();
    });

    return v;
  }

  function openViewer(url, alt){
    var v = ensure();
    var img = v.querySelector('#blViewerImg');
    img.src = url;
    img.alt = alt || '';
    v.style.display = 'flex';
    v.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }

  function closeViewer(){
    var v = document.getElementById('blViewer');
    if (!v) return;
    v.style.display = 'none';
    v.setAttribute('aria-hidden','true');
    var img = v.querySelector('#blViewerImg');
    if (img) img.src = '';
    document.body.style.overflow = '';
  }

  window.BLViewer = { open: openViewer, close: closeViewer };
  window.openViewer = openViewer;
  window.closeViewer = closeViewer;
})();
