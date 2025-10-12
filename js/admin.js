// admin.js — Painel administrativo LuthierPro
(() => {
  const keyInput = document.getElementById("adminKey");
  const btnLogin = document.getElementById("btnLogin");
  const msg = document.getElementById("msg");
  const table = document.getElementById("licensesTable");
  const tbody = table ? table.querySelector("tbody") : null;

  let currentKey = null;

  // 🔄 Cria botão de atualizar dinamicamente
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "🔄 Atualizar lista";
  reloadBtn.style.display = "none";
  reloadBtn.style.marginLeft = "10px";
  document.querySelector(".admin-container")?.appendChild(reloadBtn);

  async function loadLicenses(adminKey) {
    msg.textContent = "🔄 Carregando licenças...";
    msg.style.color = "#555";
    table.style.display = "none";
    reloadBtn.style.display = "none";

    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}`);
      const text = await res.text(); // <- evita crash de JSON malformado
      console.log("Raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        msg.textContent = "⚠️ Erro: resposta inesperada do servidor.";
        msg.style.color = "red";
        return;
      }

      if (!data.ok) {
        msg.textContent = "Acesso negado ou chave incorreta.";
        msg.style.color = "red";
        return;
      }

      msg.textContent = `✅ ${data.records.length} licenças carregadas.`;
      msg.style.color = "green";
      renderLicenses(data.records);

      currentKey = adminKey;
      reloadBtn.style.display = "inline-block";
    } catch (err) {
      msg.textContent = "❌ Falha de conexão com o servidor.";
      msg.style.color = "red";
      console.error("Erro:", err);
    }
  }

  function renderLicenses(records) {
    if (!tbody) return;
    tbody.innerHTML = "";

    records.forEach((rec, i) => {
      const f = rec.fields;
      const tr = document.createElement("tr");

      const exp = f.expires_at ? new Date(f.expires_at).toLocaleDateString("pt-BR") : "-";
      const plan = (f.plan_type || "-").trim();
      const vital = plan.toLowerCase().includes("vital") ? "✨" : "";

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><code>${f.code || "-"}</code></td>
        <td>${f.email || "-"}</td>
        <td>${plan} ${vital}</td>
        <td>${exp}</td>
        <td>${f.use_count ?? 0}</td>
        <td>${f.last_used ? new Date(f.last_used).toLocaleDateString("pt-BR") : "-"}</td>
        <td>${f.flagged ? "⚠️" : "✅"}</td>
      `;

      tbody.appendChild(tr);
    });

    table.style.display = "table";
  }

  // 🧩 Eventos
  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      const key = keyInput.value.trim();
      if (!key) {
        msg.textContent = "Digite a senha de administrador.";
        msg.style.color = "red";
        return;
      }
      loadLicenses(key);
    });
  }

  reloadBtn.addEventListener("click", () => {
    if (currentKey) loadLicenses(currentKey);
  });
})();
