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

  // 🔹 Carregar licenças do servidor
  async function loadLicenses(adminKey) {
    msg.textContent = "🔄 Carregando licenças...";
    msg.style.color = "#555";
    table.style.display = "none";
    reloadBtn.style.display = "none";

    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}`);
      const text = await res.text();
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
  window.loadLicenses = loadLicenses;
window.currentKey = currentKey;


  // 🔹 Renderizar tabela de licenças
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
        <td><button class="edit-btn" data-id="${rec.id}">✏️ Editar</button></td>
      `;

      tbody.appendChild(tr);
    });

    // Reanexa listeners aos botões de edição
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => startEdit(btn.dataset.id));
    });

    table.style.display = "table";
  }

  // 🔹 Iniciar edição inline
  function startEdit(id) {
    const row = document.querySelector(`button[data-id="${id}"]`)?.closest("tr");
    if (!row) return;

    const cells = row.querySelectorAll("td");
    const code = cells[1].innerText;
    const email = cells[2].innerText;
    const plan = cells[3].innerText.trim().replace("✨", "");
    const expires = cells[4].innerText.trim();

    row.innerHTML = `
      <td colspan="9">
        <strong>${code}</strong><br>
        <label>Plano: <input id="plan_${id}" value="${plan}"></label>
        <label>Expira em: <input id="exp_${id}" value="${expires}"></label>
        <button onclick="saveEdit('${id}')">💾 Salvar</button>
        <button onclick="loadLicenses(currentKey)">❌ Cancelar</button>
      </td>
    `;
  }

  // 🔹 Salvar edição (PATCH)
  window.saveEdit = async function(id) {
    const plan = document.getElementById(`plan_${id}`).value.trim();
    const exp = document.getElementById(`exp_${id}`).value.trim();

    msg.textContent = "🔄 Atualizando registro...";
    msg.style.color = "#555";

    try {
      const res = await fetch(`/api/admin-update?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: plan, expires_at: exp, key: currentKey }),
      });

      const data = await res.json();
      if (data.ok) {
        msg.textContent = "✅ Registro atualizado!";
        msg.style.color = "green";
        loadLicenses(currentKey);
      } else {
        msg.textContent = "⚠️ Falha ao atualizar.";
        msg.style.color = "red";
      }
    } catch (err) {
      console.error(err);
      msg.textContent = "❌ Erro de conexão.";
      msg.style.color = "red";
    }
  };

  // 🧩 Eventos de login e atualização
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
