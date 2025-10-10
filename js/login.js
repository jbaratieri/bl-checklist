document.getElementById("btn").addEventListener("click", () => {
  const code = document.getElementById("code").value.trim().toUpperCase();

  // 🔑 Lista de códigos válidos (adicione ou substitua conforme suas vendas)
  const validCodes = [
    "LP-2025-AB12",
    "LP-2025-CD34",
    "LP-2025-EF56",
    "LP-2025-GH78"
  ];

  const msg = document.getElementById("msg");

  if (validCodes.includes(code)) {
    localStorage.setItem("lp_auth", "ok");
    msg.style.color = "green";
    msg.textContent = "Acesso liberado!";
    setTimeout(() => (window.location.href = "index.html"), 800);
  } else {
    msg.textContent = "Código inválido. Verifique seu acesso.";
  }
});
