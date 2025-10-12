// admin.js — Painel administrativo LuthierPro
(() => {
  const keyInput = document.getElementById("adminKey");
  const btnLogin = document.getElementById("btnLogin");
  const msg = document.getElementById("msg");
  const table = document.getElementById("licensesTable");
  const tbody = table ? table.querySelector("tbody") : null;

  async function loadLicenses(adminKey) {
    msg.textContent = "🔄 Carregando licenças...";
    msg.style.color = "#555";
    table.style.display = "none";

    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}`);
      const data = await res.json();

      if (!data.ok) {
        msg.textContent = "Acesso negado ou chave inválida.";
        msg.style.color = "red";
        return;
      }

      msg.textContent = `✅ ${data.records.length} licenças carregadas.`;
      msg.style.color = "green";
      renderLicenses(data.records);
    } catch (err) {
      console.error("Erro:", err);
      msg.textContent = "Erro ao carregar licenças.";
      msg.style.color = "red";
    }
  }

  function renderLicenses(records) {
    if (!tbody) return;
    tbody.innerHTML = "";

    records.forEach((rec, i) => {
      const f = rec.fields;
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><code>${f.code || "-"}</code></td>
        <td>${f.email || "-"}</td>
        <td>${f.plan_type || "-"}</td>
        <td>${f.expires_at || "-"}</td>
        <td>${f.use_count ?? 0}</td>
        <td>${f.last_used ? new Date(f.last_used).toLocaleDateString("pt-BR") : "-"}</td>
        <td>${f.flagged ? "⚠️" : "✅"}</td>
      `;

      tbody.appendChild(tr);
    });

    table.style.display = "table";
  }

  btnLogin.addEventListener("click", () => {
    const key = keyInput.value.trim();
    if (!key) {
      msg.textContent = "Digite a senha de administrador.";
      msg.style.color = "red";
      return;
    }
    loadLicenses(key);
  });
})();
