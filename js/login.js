// ======================================================
// 🔐 login.js — LuthierPro (validação via /api/check-license)
// v2.4 — anti-loop (já incluso) + CTA de compra quando expirado + badge/remaining
// ======================================================

(function () {
  const $ = (s) => document.querySelector(s);
  const btn = $("#btn");
  const input = $("#code");
  const msg = $("#msg");
  const AFTER_LOGIN_URL = "index.html";
  const currentPage = (location.pathname || "").split("/").pop() || "index.html";

  const ctaBox = $("#ctaExpired");
  const licBadge = $("#licBadge");
  const btnBuyMonthly  = $("#btnBuyMonthly");
  const btnBuyLifetime = $("#btnBuyLifetime");

  // --- util: mensagens ---
  function show(t, ok = false) {
    if (!msg) { console.log("[login]", t); return; }
    msg.textContent = t;
    msg.style.color = ok ? "green" : "red";
  }

  // --- tracking (GTM/gtag) ---
  function track(ev, data = {}) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: ev, ...data });
      if (typeof gtag === "function") gtag("event", ev, data);
    } catch {}
  }

  // --- parse query (?reason=expired) ---
  function getQuery(key) {
    try {
      const u = new URL(location.href);
      return u.searchParams.get(key);
    } catch { return null; }
  }

  // --- datas helper (dias restantes até 23:59:59 do dia) ---
  function daysLeft(dateOnlyStr) {
    if (!dateOnlyStr) return null;
    const [y,m,d] = String(dateOnlyStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    const end = new Date(y, m-1, d, 23,59,59,999).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000*60*60*24));
    return diff;
  }

  // --- badge + CTA render ---
  function renderBadge(plan, expStr) {
    if (!licBadge) return;
    const dl = daysLeft(expStr);
    if (plan === "vitalicio") {
      licBadge.textContent = "🔐 Plano: vitalício — acesso permanente.";
      return;
    }
    if (dl !== null && dl >= 0) {
      const label = (plan === "trial7") ? "Teste (7 dias)" : "Mensal";
      licBadge.textContent = `⏳ ${label} — faltam ${dl} dia${dl===1?'':'s'}. Válido até ${expStr.split("-").reverse().join("/")}.`;
    } else if (expStr) {
      const label = (plan === "trial7") ? "Teste (7 dias)" : "Mensal";
      licBadge.textContent = `⛔ ${label} expirado em ${expStr.split("-").reverse().join("/")}.`;
    } else {
      licBadge.textContent = "";
    }
  }

  function showExpiredCTA(plan, expStr) {
    if (!ctaBox) return;
    renderBadge(plan || "trial7", expStr || "");
    ctaBox.style.display = "block";

    // tracking dos botões
    if (btnBuyMonthly) {
      btnBuyMonthly.addEventListener("click", () => {
        track("cta_buy_click", { plan: "mensal", source: "login_expired" });
      }, { once:true });
    }
    if (btnBuyLifetime) {
      btnBuyLifetime.addEventListener("click", () => {
        track("cta_buy_click", { plan: "vitalicio", source: "login_expired" });
      }, { once:true });
    }
  }

  // --- PATCH: anti-loop — ao abrir o login, limpa travas desta aba
  try {
    sessionStorage.removeItem('lp:blockHandled');
    sessionStorage.removeItem('lp:lastRedirect');
  } catch {}

  // --- se marcado como bloqueado, não redireciona pra home
  try {
    const status = localStorage.getItem('lp:status');
    if (status === 'blocked') {
      if (msg) { msg.textContent = 'Licença bloqueada. Entre com outro código.'; msg.style.color = 'red'; }
    }
  } catch {}

  // --- se veio de redirect com ?reason=expired, mostra CTA imediatamente
  try {
    const reason = getQuery("reason");
    if (reason === "expired") {
      // tenta extrair snapshot pra badge
      const raw = localStorage.getItem("lp_license");
      let plan = "mensal", exp = "";
      if (raw) {
        try {
          const lic = JSON.parse(raw);
          plan = (lic?.plan || "mensal").toLowerCase();
          exp = lic?.expires || "";
        } catch {}
      }
      show("Assinatura expirada. Escolha um plano para continuar.", false);
      showExpiredCTA(plan, exp);
    }
  } catch {}

  // --- util: deviceId persistente ---
  function getDeviceId() {
    try {
      const KEY = "lp_device_id";
      let id = localStorage.getItem(KEY);
      if (!id) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id = "dev-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
        }
        localStorage.setItem(KEY, id);
      }
      return id;
    } catch {
      return "dev-unknown";
    }
  }

  // Se já tem licença válida (inclui grace offline), pula login — EXCETO se estiver bloqueado
  try {
    const statusBlocked = localStorage.getItem('lp:status') === 'blocked';
    if (!statusBlocked) {
      const plan = (localStorage.getItem("lp_plan_type") || "").toLowerCase();
      const expStr = localStorage.getItem("lp_expires_at") || "";
      const grace = Number(localStorage.getItem("lp_grace_days") || 0);

      const goHome = () => {
        if (currentPage !== AFTER_LOGIN_URL) location.replace(AFTER_LOGIN_URL);
      };

      if (plan === "vitalicio") { goHome(); return; }

      if (expStr) {
        const [y, m, d] = expStr.split("-").map(Number);
        if (y && m && d) {
          const end = new Date(y, m - 1, d, 23, 59, 59, 999);
          end.setDate(end.getDate() + (isFinite(grace) ? grace : 0));
          if (new Date() <= end) { goHome(); return; }
        }
      }
    } else {
      if (msg) { msg.textContent = 'Acesso bloqueado. Faça login com outro código.'; msg.style.color = 'red'; }
    }
  } catch (_) { }

  // --- API: check-license ---
  async function checkLicense(license) {
    const r = await fetch("/api/check-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: license })
    });
    return r.json();
  }

  // --- fluxo de login ---
  let submitting = false;
  async function onLogin() {
    if (submitting) return;
    const code = (input?.value || "").trim().toUpperCase();
    if (!code) { show("Digite seu código de acesso."); return; }

    submitting = true;
    if (btn) btn.disabled = true;
    show("Verificando código..."); msg.style.color = "#444";

    try {
      const data = await checkLicense(code);

      if (!data || !data.ok) {
        const map = {
          license_not_found: "Código não encontrado.",
          inactive: "Licença inativa. Fale com o suporte.",
          blocked: "Acesso bloqueado. Fale com o suporte.",
          expired: "Assinatura expirada. Escolha um plano para continuar.",
          no_expiration: "Licença sem data válida. Suporte.",
          server_error: "Falha no servidor. Tente novamente."
        };

        show(map[data?.msg] || "Código inválido.");

        // 👉 se expirou, mostra CTA de compra + badge (usa dados que vieram do servidor)
        if (data?.msg === "expired") {
          const plan = (data?.plan_type || "mensal").toLowerCase();
          const exp  = data?.expires_at || "";
          // salva snapshot pra badge em outras telas também
          try {
            localStorage.setItem("lp_license", JSON.stringify({ plan, expires: exp }));
          } catch {}
          showExpiredCTA(plan, exp);
          track("license_expired_view", { plan, exp });
        }

        submitting = false;
        if (btn) btn.disabled = false;
        return;
      }

      // ✅ Sucesso: salvar para uso online/offline
      localStorage.setItem("lp_license_key", code);
      localStorage.setItem("lp_plan_type", data.plan_type || "mensal");
      localStorage.setItem("lp_expires_at", data.expires_at || "");
      localStorage.setItem("lp_grace_days", String(data.grace_days || 5));

      // compat legado
      localStorage.setItem("lp_auth", "ok");
      localStorage.setItem("lp_license", JSON.stringify({
        code,
        plan: data.plan_type || "mensal",
        expires: data.expires_at || ""
      }));
      localStorage.setItem("lp_code", code);
      localStorage.setItem("lp_last_license_check", String(Date.now()));
      try { localStorage.removeItem('lp:status'); } catch {}

      const nice = data.expires_at ? data.expires_at.split("-").reverse().join("/") : "vitalício";
      show(`Acesso autorizado! Válido até ${nice}.`, true);

      // 🔄 registra uso/binding no Airtable com deviceId
      try {
        await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, deviceId: getDeviceId() })
        });
      } catch (_) { /* ignora falha pontual */ }

      // redireciona
      setTimeout(() => {
        if (currentPage !== AFTER_LOGIN_URL) location.replace(AFTER_LOGIN_URL);
      }, 700);

    } catch (e) {
      console.error("[Login] erro:", e);
      if (!navigator.onLine) show("Sem conexão. Verifique a internet e tente novamente.");
      else show("Erro de conexão com o servidor. Tente novamente.");
      submitting = false;
      if (btn) btn.disabled = false;
    }
  }

  if (btn) btn.addEventListener("click", onLogin);
  if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") onLogin(); });

  // bônus: colar rápido
  document.addEventListener("paste", (e) => {
    if (!input?.value) {
      const t = (e.clipboardData || window.clipboardData).getData("text");
      if (t) input.value = t.trim().toUpperCase();
    }
  });
})();
