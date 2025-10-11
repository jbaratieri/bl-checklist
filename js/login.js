// login.js — versão conectada ao Airtable (via Vercel API)
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

    if (!data.ok) {
      msg.style.color = "red";
      msg.textContent = data.msg || "Código inválido.";
      return;
    }

    // ✅ Código válido — salvar status e redirecionar
    localStorage.setItem("lp_auth", "ok");
    localStorage.setItem("lp_license", JSON.stringify({
      code,
      plan: data.plan,
      expires: data.expires
    }));

    msg.style.color = "green";
    msg.textContent = data.msg;

    setTimeout(() => (window.location.href = "index.html"), 1000);

  } catch (err) {
    console.error("Erro de conexão:", err);
    msg.style.color = "red";
    msg.textContent = "Erro de conexão com o servidor. Tente novamente.";
  }
});
