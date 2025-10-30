// ======================================================
// 🔐 login.js — LuthierPro (validação via /api/check-license)
// v2.2 — envia deviceId a /api/validate + guard anti-loop + debounce
// ======================================================

(function(){
  const $ = (s) => document.querySelector(s);
  const btn = $("#btn");
  const input = $("#code");
  const msg = $("#msg");
  const AFTER_LOGIN_URL = "index.html";
  const currentPage = (location.pathname || "").split("/").pop() || "index.html";

  // --- util: mensagens ---
  function show(t, ok=false){
    if (!msg) { console.log("[login]", t); return; }
    msg.textContent = t;
    msg.style.color = ok ? "green" : "red";
  }

  // --- util: deviceId persistente ---
  function getDeviceId(){
    try {
      const KEY = "lp_device_id";
      let id = localStorage.getItem(KEY);
      if (!id) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id = "dev-" + Date.now().toString(36) + "-" + Math.floor(Math.random()*1e6).toString(36);
        }
        localStorage.setItem(KEY, id);
      }
      return id;
    } catch {
      return "dev-unknown";
    }
  }

  // Se já tem licença válida (inclui grace offline), pula login
  try {
    const plan = (localStorage.getItem("lp_plan_type") || "").toLowerCase();
    const expStr = localStorage.getItem("lp_expires_at") || "";
    const grace = Number(localStorage.getItem("lp_grace_days") || 0);

    const goHome = () => {
      if (currentPage !== AFTER_LOGIN_URL) location.href = AFTER_LOGIN_URL;
    };

    if (plan === "vitalicio") { goHome(); return; }

    if (expStr) {
      const [y,m,d] = expStr.split("-").map(Number);
      if (y && m && d) {
        const end = new Date(y, m-1, d, 23,59,59,999);
        end.setDate(end.getDate() + (isFinite(grace) ? grace : 0));
        if (new Date() <= end) { goHome(); return; }
      }
    }
  } catch(_) {}

  // --- API: check-license ---
  async function checkLicense(license){
    const r = await fetch("/api/check-license", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ license_key: license })
    });
    return r.json();
  }

  // --- fluxo de login ---
  let submitting = false;
  async function onLogin(){
    if (submitting) return;
    const code = (input?.value || "").trim().toUpperCase();
    if (!code){ show("Digite seu código de acesso."); return; }

    submitting = true;
    if (btn) btn.disabled = true;
    show("Verificando código..."); msg.style.color = "#444";

    try {
      const data = await checkLicense(code);

      if (!data || !data.ok){
        const map = {
          license_not_found: "Código não encontrado.",
          inactive: "Licença inativa. Fale com o suporte.",
          expired: "Assinatura vencida. Renove pela Hotmart.",
          no_expiration: "Licença sem data válida. Suporte.",
          server_error: "Falha no servidor. Tente novamente."
        };
        show(map[data?.msg] || "Código inválido.");
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

      const nice = data.expires_at ? data.expires_at.split("-").reverse().join("/") : "vitalício";
      show(`Acesso autorizado! Válido até ${nice}.`, true);

      // 🔄 registra uso/binding no Airtable com deviceId (contagem por aparelho, não por IP)
      try {
        await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ code, deviceId: getDeviceId() })
        });
      } catch(_) { /* ignora falha pontual */ }

      // redireciona (evita redirect para a mesma página)
      setTimeout(() => {
        if (currentPage !== AFTER_LOGIN_URL) window.location.href = AFTER_LOGIN_URL;
      }, 700);

    } catch (e){
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
