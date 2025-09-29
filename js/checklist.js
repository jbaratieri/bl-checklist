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

  // ----- Sections open/close -----
  function setSectionOpen(sec, open) {
    sec.classList.toggle('open', open);
    const body = sec.querySelector(':scope > .section-body');
    if (body) {
      if (open) {
        body.removeAttribute('hidden');
        body.style.display = 'block';
      } else {
        body.setAttribute('hidden', '');
        body.style.display = 'none';
      }
    }
  }

  document.addEventListener('click', e => {
    // Clique no header da seção
    const header = e.target.closest('.section > header');
    if (header) {
      const sec = header.parentElement;
      const isOpen = sec.classList.contains('open');
      setSectionOpen(sec, !isOpen);
    }

    // Botão EXPANDIR
    if (e.target.id === 'btnExpand') {
      $$('.section').forEach(s => setSectionOpen(s, true));
    }

    // Botão RECOLHER
    if (e.target.id === 'btnCollapse') {
      $$('.section').forEach(s => setSectionOpen(s, false));
    }

    // Botão IMPRIMIR
    if (e.target.id === 'btnPrint') {
      window.print();
    }

    // Botão LIMPAR
    if (e.target.id === 'btnReset') {
      if (confirm('Remover dados salvos?')) {
        localStorage.removeItem(LS_DATA);
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
        } catch (e) {}
        location.reload();
      }
    }

    // Botões de DETALHE (+ / -)
    const toggleBtn = e.target.closest('.btn.toggle');
    if (toggleBtn) {
      const targetId = toggleBtn.dataset.target;
      const detail = document.getElementById(targetId);
      if (!detail) return;
      const isHidden = detail.hasAttribute('hidden');
      if (isHidden) {
        detail.removeAttribute('hidden');
        detail.style.display = 'block';
        toggleBtn.classList.add('active');
        const icon = toggleBtn.querySelector('.icon');
        if (icon) icon.textContent = '−';
      } else {
        detail.setAttribute('hidden', '');
        detail.style.display = 'none';
        toggleBtn.classList.remove('active');
        const icon = toggleBtn.querySelector('.icon');
        if (icon) icon.textContent = '＋';
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

  // ----- Init -----
  loadAll();
  initAutoGrow();
  updateProgress();

  // Lightbox simples
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

})();
