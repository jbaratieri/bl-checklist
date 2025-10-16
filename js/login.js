// ======================================================
// 🔐 login.js — LuthierPro (validação via /api/check-license)
// v2.0 — usa campos: code (license_key), plan_type, expires_at (YYYY-MM-DD)
// ======================================================

(function(){
  const $ = (s) => document.querySelector(s);
  const btn = $("#btn");
  const input = $("#code");
  const msg = $("#msg");
  const AFTER_LOGIN_URL = "index.html";

  // Se já tem licença válida (inclui grace offline), pula login
  try {
    const plan = (localStorage.getItem("lp_plan_type") || "").toLowerCase();
    const expStr = localStorage.getItem("lp_expires_at") || "";
    const grace = Number(localStorage.getItem("lp_grace_days") || 0);

    if (plan === "vitalicio") {
      location.href = AFTER_LOGIN_URL; return;
    }
    if (expStr) {
      const [y,m,d] = expStr.split("-").map(Number);
      if (y && m && d) {
        const end = new Date(y, m-1, d, 23,59,59,999);
        end.setDate(end.getDate() + (isFinite(grace) ? grace : 0));
        if (new Date() <= end) { location.href = AFTER_LOGIN_URL; return; }
      }
    }
  } catch(_) {}

  async function checkLicense(license){
    const r = await fetch("/api/check-license", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ license_key: license })
    });
    return r.json();
  }

  function show(t, ok=false){
    msg.textContent = t;
    msg.style.color = ok ? "green" : "red";
  }

  async function onLogin(){
    const code = (input.value || "").trim().toUpperCase();
    if (!code){ show("Digite seu código de acesso."); return; }

    btn.disabled = true;
    msg.style.color = "#444";
    msg.textContent = "Verificando código...";

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
        btn.disabled = false;
        return;
      }

      // ✅ Sucesso: salvar para uso online/offline
      localStorage.setItem("lp_license_key", code);
      localStorage.setItem("lp_plan_type", data.plan_type || "mensal");
      localStorage.setItem("lp_expires_at", data.expires_at || "");
      localStorage.setItem("lp_grace_days", String(data.grace_days || 5));

      // (opcional) compat com seu formato antigo:
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

      setTimeout(()=> (window.location.href = AFTER_LOGIN_URL), 700);
    } catch (e){
      console.error("[Login] erro:", e);
      if (!navigator.onLine) show("Sem conexão. Verifique a internet e tente novamente.");
      else show("Erro de conexão com o servidor. Tente novamente.");
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", onLogin);
  input.addEventListener("keydown", e => { if (e.key === "Enter") onLogin(); });

  // bônus: colar rápido
  document.addEventListener("paste", (e) => {
    if (!input.value) {
      const t = (e.clipboardData || window.clipboardData).getData("text");
      if (t) input.value = t.trim().toUpperCase();
    }
  });
})();
