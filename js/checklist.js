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
  const setStepOpen = (step, open) => step.classList.toggle('open', open);
  const setMeasuresOpen = (block, open) => block.classList.toggle('open', open);

  // ----- Progress -----
  function updateProgress() {
    const all = $$('.chk');
    const done = all.filter(c => c.checked).length;
    const pct = Math.round((done / Math.max(1, all.length)) * 100);
    const badge = $('#progressBadge');
    const fill = $('#progressFill');
    if (badge) badge.textContent = pct + '% concluído';
    if (fill) fill.style.width = pct + '%';

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
      }).catch(() => { });
    };
    window.blImgDelete = function (key) {
      openDB().then(db => {
        const tx = db.transaction(OS, 'readwrite');
        tx.objectStore(OS).delete(key);
      }).catch(() => { });
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
    const img = e.target.closest('.img-pic');
    if (img) { e.preventDefault(); openLightbox(img.src); return; }

    const header = e.target.closest('.section > header');
    if (header) {
      const sec = header.parentElement;
      sec.classList.toggle('open');
      return;
    }

    if (e.target.closest('#btnExpand, #btnExpandAll')) {
      $$('.section').forEach(s => setSectionOpen(s, true));
      return;
    }
    if (e.target.closest('#btnCollapse, #btnCollapseAll')) {
      $$('.section').forEach(s => setSectionOpen(s, false));
      return;
    }

    if (e.target.closest('#btnPrint')) {
      window.print();
      return;
    }

    const toggleBtn = e.target.closest('.btn.toggle');
    if (toggleBtn) {
      const step = toggleBtn.closest('.step');
      if (step) {
        const willOpen = !step.classList.contains('open');
        setStepOpen(step, willOpen);
        const icon = toggleBtn.querySelector('.icon');
        if (icon) icon.textContent = willOpen ? '−' : '＋';
        toggleBtn.setAttribute('aria-label', willOpen ? 'Fechar detalhes' : 'Abrir detalhes');
      }
      return;
    }
  });

  // ----- Init -----
  loadAll();
  initAutoGrow();
  updateProgress();
  document.querySelectorAll('.measures-block').forEach(b => b.classList.remove('open'));

})();

// Controle do modal footer
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute('aria-hidden', 'false');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute('aria-hidden', 'true');
}

// // ======================================================
// 🔐 LuthierPro — Revalidação Automática de Licença (v2.3)
// ======================================================
// - Tenta revalidar 1x/dia (ou se já passou do TTL offline).
// - Usa /api/check-license (NÃO altera use_count nem Devices).
// - Só bloqueia se "blocked" OU "expired".
// - Em erro de rede, respeita janela offline (TTL).

// --- PATCH: anti-loop — redireciona para login apenas 1x por aba
function redirectToLoginOnce(reason='license_blocked') {
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem('lp:lastRedirect') || 0);
    const handled = sessionStorage.getItem('lp:blockHandled') === '1';
    if (handled || (now - last) < 3000) return; // debounce 3s
    sessionStorage.setItem('lp:blockHandled', '1');
    sessionStorage.setItem('lp:lastRedirect', String(now));
  } catch {}
  location.replace('./login.html?reason=' + encodeURIComponent(reason));
}

(async () => {
  const LAST_CHECK_KEY = "lp_last_license_check"; // timestamp da ÚLTIMA validação ONLINE bem-sucedida
  const AUTH_KEY = "lp_auth";                     // "ok" quando autenticado
  const CODE_KEY = "lp_code";                     // código salvo pós-login
  const LICENSE_KEY = "lp_license";               // snapshot p/ badge

  const OFFLINE_TTL_DAYS = 5; // janela offline permitida
  const CHECK_EVERY_DAYS = 1; // revalidar 1x/dia

  const now = Date.now();
  const lastOk = parseInt(localStorage.getItem(LAST_CHECK_KEY) || "0", 10) || 0;
  const daysSinceOk = (now - lastOk) / (1000 * 60 * 60 * 24);

  // Se a licença local já está expirada, força tentativa agora
  let forceRevalidate = false;
  try {
    const rawLic = localStorage.getItem(LICENSE_KEY);
    if (rawLic) {
      const lic = JSON.parse(rawLic);
      if (lic?.expires) {
        const exp = new Date(lic.expires).getTime();
        if (!Number.isNaN(exp) && now > exp) forceRevalidate = true;
      }
    }
  } catch { }

  const shouldAttempt =
    forceRevalidate || daysSinceOk >= CHECK_EVERY_DAYS || daysSinceOk >= OFFLINE_TTL_DAYS;

  if (!shouldAttempt || localStorage.getItem(AUTH_KEY) !== "ok") return;
  const code = localStorage.getItem(CODE_KEY);
  if (!code) return;

  const banner = document.createElement("div");
  banner.textContent = "🔄 Verificando licença ativa...";
  banner.style = "position:fixed;top:0;left:0;width:100%;background:#5c3b1e;color:#fff;padding:8px;text-align:center;font-size:14px;z-index:9999;";
  document.body.appendChild(banner);

  try {
    const resp = await fetch('/api/check-license', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: code })
    });

    // Mesmo se der 4xx/5xx, NÃO bloqueie direto: pode ser intermitência
    const data = await resp.json().catch(() => ({}));

    // Atualiza relógio de última checagem SOMENTE quando ok
    if (data?.ok) {
      const serverNow = data.server_time ? Date.parse(data.server_time) : now;
      localStorage.setItem(LAST_CHECK_KEY, String(serverNow));

      // Atualiza snapshot (badge)
      localStorage.setItem(LICENSE_KEY, JSON.stringify({
        plan: data.plan_type || data.plan || 'mensal',
        expires: data.expires_at || null
      }));

      return;
    }

    // Casos duros: bloquear imediatamente
    const reason = data?.msg || '';
    if (reason === 'blocked' || reason === 'expired') {
      // PATCH: marque bloqueado e limpe credenciais mínimas
      try {
        localStorage.setItem('lp:status', 'blocked');
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(CODE_KEY);
        localStorage.removeItem(LICENSE_KEY);
      } catch {}

      alert(reason === 'blocked'
        ? "⚠️ Acesso bloqueado. Fale com o suporte."
        : "⚠️ Assinatura expirada. Faça login para renovar.");

      redirectToLoginOnce(reason); // PATCH: 1x por aba + replace
      return;
    }

    // Outros casos: logar e seguir (flagged, server_error, etc.)
    console.warn("[daily-check] status:", reason || `(HTTP ${resp.status})`);

  } catch (err) {
    // Erro de rede: só bloqueia se estourou o TTL offline
    if (daysSinceOk >= OFFLINE_TTL_DAYS) {
      // PATCH: marque bloqueado e limpe credenciais mínimas
      try {
        localStorage.setItem('lp:status', 'blocked');
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(CODE_KEY);
        localStorage.removeItem(LICENSE_KEY);
      } catch {}

      alert("⚠️ Não foi possível validar sua licença e o período offline expirou.\nConecte-se e faça login novamente.");
      redirectToLoginOnce('offline_ttl_expired'); // PATCH
    } else {
      console.warn("[LuthierPro] Revalidação falhou (rede). Mantendo acesso dentro da janela offline:", err);
    }
  } finally {
    setTimeout(() => banner.remove(), 1500);
  }
})();


// ======================================================
// 🏷️ Badge de status no rodapé (usa snapshot salvo)
// ======================================================
(() => {
  const el = document.getElementById("licenseStatus");
  if (!el) return;

  const LICENSE_KEY = "lp_license";
  const raw = localStorage.getItem(LICENSE_KEY);

  if (!raw) {
    el.textContent = "🔒 Licença não encontrada";
    el.classList.add("err");
    return;
  }

  try {
    const lic = JSON.parse(raw);
    const plan = (lic?.plan || "indefinido").toString().trim().toLowerCase();
    const expMs = lic?.expires ? new Date(lic.expires).getTime() : null;

    if (expMs && !Number.isNaN(expMs)) {
      const expStr = new Date(expMs).toLocaleDateString("pt-BR");
      if (Date.now() > expMs) {
        el.textContent = `⛔ Licença expirada (era até ${expStr})`;
        el.classList.add("err");
      } else {
        el.textContent = `🔐 Licença ativa (${plan} • até ${expStr})`;
        el.classList.add("ok");
      }
    } else {
      // sem expires ⇒ tratar como vitalício
      el.textContent = `🔐 Licença vitalícia (${plan})`;
      el.classList.add("vital");
    }
  } catch {
    el.textContent = "⚠️ Erro ao ler licença";
    el.classList.add("err");
  }
})();
