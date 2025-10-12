// admin.js — painel administrativo seguro
const loginSection = document.getElementById("loginSection");
const panelSection = document.getElementById("panelSection");
const msg = document.getElementById("msg");
const tbody = document.querySelector("#licensesTable tbody");

document.getElementById("btnLogin").addEventListener("click", async () => {
  const key = document.getElementById("adminKey").value.trim();
  if (!key) {
    msg.textContent = "Informe a senha.";
    return;
  }

  msg.textContent = "Verificando...";
  const res = await fetch("/api/admin?key=" + encodeURIComponent(key));
  const data = await res.json();

  if (!data.ok) {
    msg.textContent = "Acesso negado.";
    return;
  }

  msg.textContent = "";
  loginSection.style.display = "none";
  panelSection.style.display = "block";
  renderLicenses(data.records);
});

document.getElementById("btnReload").addEventListener("click", async () => {
  const key = document.getElementById("adminKey").value.trim();
  const res = await fetch("/api/admin?key=" + encodeURIComponent(key));
  const data = await res.json();
  renderLicenses(data.records);
});

function renderLicenses(records) {
  tbody.innerHTML = "";
  for (const rec of records) {
    const f = rec.fields;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.code || "-"}</td>
      <td>${f.plan_type || "-"}</td>
      <td>${f.expires_at || "-"}</td>
      <td>${f.flagged ? "🚫" : "✅"}</td>
      <td>${f.notes || ""}</td>
      <td>
        <button onclick="deleteLicense('${rec.id}')">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function deleteLicense(id) {
  if (!confirm("Tem certeza que deseja excluir esta licença?")) return;
  const key = document.getElementById("adminKey").value.trim();
  const res = await fetch("/api/admin", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, key })
  });
  const data = await res.json();
  if (data.ok) alert("Licença removida.");
  else alert("Erro ao remover.");
}
