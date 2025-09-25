
(() => {
  'use strict';

  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const $ = (s, c = document) => c.querySelector(s);

  // ----- Persistence (localStorage) -----
  const LS_DATA = 'baratieri_v104_data';
  function saveAll() {
    const data = {};
    $$('.persist').forEach(el => data[el.id] = el.value);
    $$('.chk').forEach(ch => data[ch.id] = ch.checked);
    localStorage.setItem(LS_DATA, JSON.stringify(data));
  }
  function loadAll() {
    try {
      const raw = localStorage.getItem(LS_DATA); if (!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v;
      });
    } catch (e) { console.warn('restore failed', e); }
  }
  document.addEventListener('input', e => {
    if (e.target.classList.contains('persist')) saveAll();
  });
  document.addEventListener('change', e => {
    if (e.target.classList.contains('chk') || e.target.classList.contains('persist')) {
      updateProgress();
      saveAll();
    }
  });

  // Auto-grow textareas
  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  }
  function initAutoGrow() {
    $$('.auto-grow').forEach(t => {
      autoGrow(t);
      t.addEventListener('input', () => autoGrow(t));
    });
  }

  // ----- Sections open/close -----
  function setSectionOpen(sec, open) {
    sec.classList.toggle('open', open);
  }
  document.addEventListener('click', e => {
    const header = e.target.closest('.section>header');
    if (header) {
      const sec = header.parentElement;
      setSectionOpen(sec, !sec.classList.contains('open'));
    }
    const btn = e.target.closest('.btn.toggle');
    if (btn) {
      const id = btn.dataset.target;
      const step = btn.closest('.step');
      step.classList.toggle('open');
      const box = document.getElementById(id);
      if (box) box.style.display = step.classList.contains('open') ? 'block' : 'none';
    }
    if (e.target.id === 'btnExpand') {
      $$('.section').forEach(s => setSectionOpen(s, true));
    }
    if (e.target.id === 'btnCollapse') {
      $$('.section').forEach(s => setSectionOpen(s, false));
    }
    if (e.target.id === 'btnPrint') {
      window.print();
    }
    if (e.target.id === 'btnReset') {
      if (confirm('Remover dados salvos?')) {
        // Clear legacy storage
        localStorage.removeItem(LS_DATA);
        // Clear namespaced v1 storage and migration markers
        try {
          const toDelete = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (k.startsWith('bl:v1:') || k.startsWith('bl:migrated:') || k === 'bl:instrument') {
              toDelete.push(k);
            }
          }
          toDelete.forEach(k => localStorage.removeItem(k));
        } catch (e) { }
        location.reload();
      }
    }
  });

  // ----- Progress -----
  function updateProgress() {
    const all = $$('.chk');
    const done = all.filter(c => c.checked).length;
    const pct = Math.round((done / Math.max(1, all.length)) * 100);
    $('#progressBadge').textContent = pct + '% concluído';
    $('#progressFill').style.width = pct + '%';

    // Section-level
    $$('.section').forEach(sec => {
      const checks = $$('.chk', sec);
      const d = checks.filter(c => c.checked).length;
      const t = checks.length;
      const p = sec.querySelector('.progress');
      const tick = sec.querySelector('.tick');
      if (p) p.textContent = `${d}/${t}`;
      if (t > 0 && d === t) sec.classList.add('done'); else sec.classList.remove('done');
    });
  }


  // ===== Persistência de imagens via IndexedDB (leve e segura) =====
  (function () {
    const DB = 'bl-images', OS = 'images';
    function openDB() {
      return new Promise((res, rej) => {
        const rq = indexedDB.open(DB, 1);
        rq.onupgradeneeded = () => {
          const db = rq.result;
          if (!db.objectStoreNames.contains(OS)) {
            db.createObjectStore(OS, { keyPath: 'key' });
          }
        };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
    }
    window.blImgSave = function (key, dataURL) {
      openDB().then(db => {
        const tx = db.transaction(OS, 'readwrite');
        tx.objectStore(OS).put({ key, dataURL, addedAt: Date.now() });
      }).catch(() => { });
    };
    window.blImgDelete = function (key) {
      openDB().then(db => {
        const tx = db.transaction(OS, 'readwrite');
        tx.objectStore(OS).delete(key);
      }).catch(() => { });
    };
    window.blImgListPrefix = function (prefix) {
      return openDB().then(db => new Promise((res, rej) => {
        const out = [];
        const tx = db.transaction(OS, 'readonly');
        const st = tx.objectStore(OS);
        const cur = st.openCursor();
        cur.onsuccess = e => {
          const c = e.target.result;
          if (!c) { res(out); return; }
          if ((c.key || '').startsWith(prefix)) out.push(c.value);
          c.continue();
        };
        tx.onerror = () => res(out);
      })).catch(() => Promise.resolve([]));
    };
  })();

  // ----- Images per step -----
  document.addEventListener('click', e => {
    const add = e.target.closest('.add-img, .add-image');
    if (add) {
      const step = add.closest('.step');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = () => {
        const row = step.querySelector('.img-row');
        Array.from(input.files).forEach(file => {
          const fr = new FileReader();
          fr.onload = () => {
            const img = new Image();
            img.src = fr.result;
            img.style.cssText = 'max-width:140px;max-height:140px;border:1px solid #eadfce;border-radius:10px;margin:6px;background:#fff;object-fit:cover';
            const wrap = document.createElement('div');
            wrap.className = 'img-thumb';
            img.className = 'img-pic';
            img.alt = 'Imagem adicionada';
            img.loading = 'lazy';
            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'img-close';
            close.setAttribute('aria-label', 'Fechar imagem');
            close.textContent = 'FECHAR IMAGEM';
            wrap.appendChild(img);
            wrap.appendChild(close);
            try {
              const inst = localStorage.getItem('bl:instrument') || 'vcl';
              const scope = step || add.closest('.step') || document;
              const token = (scope.querySelector('.open-draw[data-subetapa]')?.getAttribute('data-subetapa')) || (scope.getAttribute && scope.getAttribute('data-step')) || (scope.id) || 'root';
              const key = inst + ':' + token + ':' + Date.now() + ':' + Math.random().toString(36).slice(2, 8);
              wrap.setAttribute('data-image-key', key);
              if (window.blImgSave) window.blImgSave(key, img.src);
            } catch (_e) { }

            row.appendChild(wrap);
          };
          fr.readAsDataURL(file);
        });
      };
      input.click();
    }
  });



  // Persistência: apagar do IndexedDB antes de remover do DOM (fase de captura)
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.img-close');
    if (!btn) return;
    const wrap = btn.closest('.img-thumb');
    const key = wrap && wrap.getAttribute('data-image-key');
    if (key && window.blImgDelete) window.blImgDelete(key);
  }, true);

  // Remover uma imagem específica (FECHAR IMAGEM)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.img-close');
    if (btn) {
      e.preventDefault();
      const thumb = btn.closest('.img-thumb');
      if (thumb) thumb.remove();
    }
  });

  // ----- Drawing modal -----
  let modal, canvas, ctx, drawing = false, penSize, penColor, last = null;
  function openDraw() {
    modal.style.display = 'flex';
  }
  function closeDraw() {
    modal.style.display = 'none';
  }
  function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  function savePNG() {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'desenho-tecnico.png'; a.click();
  }
  function startDraw(e) {
    drawing = true;
    last = getPos(e);
  }
  function endDraw() { drawing = false; last = null; }
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: x * scaleX, y: y * scaleY };
  }
  function draw(e) {
    if (!drawing) return;
    const p = getPos(e);
    ctx.strokeStyle = penColor.value;
    ctx.lineWidth = parseInt(penSize.value, 10);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    e.preventDefault();
  }
  function initDraw() {
    modal = $('#drawModal');
    const canvas = document.getElementById('drawCanvas');
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      penSize = $('#penSize'); penColor = $('#penColor');
      clearCanvas();
      $('#btnClear').addEventListener('click', clearCanvas);
      $('#btnSavePNG').addEventListener('click', savePNG);
      $('#btnCloseDraw').addEventListener('click', closeDraw);
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('mouseleave', endDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchend', endDraw);
      canvas.addEventListener('touchmove', draw, { passive: false });
    }}
    document.addEventListener('click', e => {
      const drawBtn = e.target.closest('.draw');
      if (drawBtn) openDraw();
    });

    // ----- Export Medidas (print to PDF) -----
    function exportMeasuresPDF() {
      const data = [];
      $$('.section').forEach(sec => {
        const secTitle = sec.querySelector('header h3')?.textContent?.trim() || 'Seção';
        const rows = [];
        $$('.step', sec).forEach(step => {
          const label = step.querySelector('.label')?.textContent?.trim() || 'Subetapa';
          const sid = step.querySelector('.chk')?.id || '';
          const w = document.getElementById('w-' + sid)?.value || '';
          const h = document.getElementById('h-' + sid)?.value || '';
          const t = document.getElementById('t-' + sid)?.value || '';
          if (w || h || t) { rows.push({ label, w, h, t }); }
        });
        if (rows.length) data.push({ secTitle, rows });
      });
      if (!data.length) { alert('Nenhuma medida preenchida encontrada.'); return; }
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="utf-8"><title>Medidas — Relatório</title>
      <style>
        body{font-family:system-ui,Segoe UI,Roboto,Arial;padding:16px;color:#2e2a26}
        h1{margin:0 0 6px}
        .muted{color:#666;font-size:12px;margin-bottom:12px}
        .sec{margin:12px 0 18px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
        th{background:#f7f2ea}
      </style>
    </head><body>`);
      win.document.write(`<h1>Relatório de Medidas</h1>
      <div class="muted">Gerado em ${new Date().toLocaleString()}</div>`);
      data.forEach(group => {
        win.document.write(`<div class="sec"><h3>${group.secTitle}</h3>
        <table><thead><tr><th>Subetapa</th><th>Largura (mm)</th><th>Altura (mm)</th><th>Espessura (mm)</th></tr></thead><tbody>`);
        group.rows.forEach(r => {
          win.document.write(`<tr><td>${r.label}</td><td>${r.w || ''}</td><td>${r.h || ''}</td><td>${r.t || ''}</td></tr>`);
        });
        win.document.write(`</tbody></table></div>`);
      });
      win.document.write(`</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }

    // ----- SW register -----
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
      });
    }

    // Init
    loadAll();
    initDraw();
    initAutoGrow();
    updateProgress();
    // Open all by default on first load
    $$('.section').forEach(s => s.classList.add('open'));
    document.getElementById('btnExportPDF')?.addEventListener('click', exportMeasuresPDF);

    // Lightbox simples ao clicar na miniatura
    function ensureLightbox() {
      let lb = document.getElementById('imgLightbox');
      if (lb) return lb;
      lb = document.createElement('div');
      lb.id = 'imgLightbox';
      lb.setAttribute('aria-hidden', 'true');
      lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);display:none;align-items:center;justify-content:center;z-index:2000;padding:2vw;';
      const pic = new Image();
      pic.id = 'imgLightboxPic';
      pic.style.cssText = 'max-width:96vw;max-height:96vh;box-shadow:0 10px 30px rgba(0,0,0,.5);border-radius:10px;background:#fff';
      lb.appendChild(pic);
      lb.addEventListener('click', () => { lb.style.display = 'none'; lb.setAttribute('aria-hidden', 'true'); });
      document.body.appendChild(lb);
      return lb;
    }
    function openLightbox(src) {
      const lb = ensureLightbox();
      const pic = document.getElementById('imgLightboxPic');
      pic.src = src;
      lb.style.display = 'flex';
      lb.setAttribute('aria-hidden', 'false');
    }
    document.addEventListener('click', e => {
      const img = e.target.closest('.img-pic');
      if (!img) return;
      e.preventDefault();
      openLightbox(img.src);
    });

  }) ();

