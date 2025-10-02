// checklist.js
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
      const raw = localStorage.getItem(LS_DATA);
      if (!raw) return;
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

  // ----- Helpers de estado -----
  const setSectionOpen = (sec, open) => sec.classList.toggle('open', open);
  const setStepOpen    = (step, open) => step.classList.toggle('open', open);
  const setMeasuresOpen = (block, open) => block.classList.toggle('open', open);

  // ----- Progress -----
  function updateProgress() {
    const all = $$('.chk');
    const done = all.filter(c => c.checked).length;
    const pct = Math.round((done / Math.max(1, all.length)) * 100);
    const badge = $('#progressBadge');
    const fill  = $('#progressFill');
    if (badge) badge.textContent = pct + '% concluído';
    if (fill)  fill.style.width = pct + '%';

    $$('.section').forEach(sec => {
      const checks = $$('.chk', sec);
      const d = checks.filter(c => c.checked).length;
      const t = checks.length;
      const p = sec.querySelector('.progress');
      if (p) p.textContent = `${d}/${t}`;
      if (t > 0 && d === t) sec.classList.add('done'); else sec.classList.remove('done');
    });
  }

  // ===== Persistência de imagens via IndexedDB =====
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
      }).catch(() => {});
    };
    window.blImgDelete = function (key) {
      openDB().then(db => {
        const tx = db.transaction(OS, 'readwrite');
        tx.objectStore(OS).delete(key);
      }).catch(() => {});
    };
    window.blImgListPrefix = function (prefix) {
      return openDB().then(db => new Promise((res) => {
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

  // ----- Lightbox -----
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

  // ----- ÚNICO LISTENER GLOBAL -----
  document.addEventListener('click', (e) => {
    // 0) Lightbox (img)
    const img = e.target.closest('.img-pic');
    if (img) { e.preventDefault(); openLightbox(img.src); return; }

    // 1) Clique no header da seção → toggle
    const header = e.target.closest('.section > header');
    if (header) {
      const sec = header.parentElement;
      sec.classList.toggle('open');
      return;
    }

    // 2) Expandir/Recolher tudo
    if (e.target.closest('#btnExpand, #btnExpandAll')) {
      $$('.section').forEach(s => setSectionOpen(s, true));
      return;
    }
    if (e.target.closest('#btnCollapse, #btnCollapseAll')) {
      $$('.section').forEach(s => setSectionOpen(s, false));
      return;
    }

    // 3) Imprimir
    if (e.target.closest('#btnPrint')) {
      window.print();
      return;
    }

    // 4) (Removido: botão reset global)

   // 5) Detalhe (abre/fecha a .step)
const toggleBtn = e.target.closest('.btn.toggle');
if (toggleBtn) {
  const step = toggleBtn.closest('.step');
  if (step) {
    const willOpen = !step.classList.contains('open');
    setStepOpen(step, willOpen);

    // Atualiza ícone + legenda
    const icon = toggleBtn.querySelector('.icon');
    if (icon) icon.textContent = willOpen ? '−' : '＋';
    toggleBtn.setAttribute('aria-label', willOpen ? 'Fechar detalhes' : 'Abrir detalhes');
  }
  return;
}})

// 6) Medidas (abre/fecha) - migrado para step16-measures-toggle.js

  // ----- Init -----
  loadAll();
  initAutoGrow();
  updateProgress();

  // 🔧 Patch: garante que medidas começam fechadas
  document.querySelectorAll('.measures-block').forEach(b => b.classList.remove('open'));

})();
