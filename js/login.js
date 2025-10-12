// ======================================================
// 🔐 login.js — LuthierPro (conectado ao Airtable via Vercel API)
// v1.3 — compatível com verificação semanal e controle Hotmart
// ======================================================

document.getElementById("btn").addEventListener("click", async () => {
  const code = document.getElementById("code").value.trim().toUpperCase();
  const msg = document.getElementById("msg");

  if (!code) {
    msg.textContent = "Digite seu código de acesso.";
    msg.style.color = "red";
    return;
  }

  msg.style.color = "#444";
  msg.textContent = "Verificando código...";

  try {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const data = await res.json();
    console.log("[Login] Resposta do servidor:", data);

    // 🔹 Compatível com 'ok' booleano ou string
    if (data.ok !== true && data.ok !== "true") {
      msg.style.color = "red";
      msg.textContent = data.msg || "Código inválido.";
      return;
    }

    // ✅ Código válido — salvar status e informações de licença
    localStorage.setItem("lp_auth", "ok");
    localStorage.setItem("lp_license", JSON.stringify({
      code,
      plan: data.plan,
      expires: data.expires
    }));

    // 🔹 Registrar código e data da última verificação
    localStorage.setItem("lp_code", code);
    localStorage.setItem("lp_last_license_check", String(Date.now()));

    // Feedback ao usuário
    msg.style.color = "green";
    msg.textContent = data.msg || "Acesso autorizado com sucesso!";

    // Redireciona após pequeno delay
    setTimeout(() => (window.location.href = "index.html"), 1000);

  } catch (err) {
    console.error("[Login] Erro de conexão:", err);
    msg.style.color = "red";

    if (!navigator.onLine) {
      msg.textContent = "Sem conexão. Verifique sua internet e tente novamente.";
    } else {
      msg.textContent = "Erro de conexão com o servidor. Tente novamente.";
    }
  }
});
