// admin.js — Painel administrativo LuthierPro (versão 1.4.1 revisada)
(() => {
  const keyInput = document.getElementById("adminKey");
  const btnLogin = document.getElementById("btnLogin");
  const msg = document.getElementById("msg");
  const table = document.getElementById("licensesTable");
  const tbody = table ? table.querySelector("tbody") : null;

  let currentKey = null;

  // 🔄 Botão de recarregar
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "🔄 Atualizar lista";
  reloadBtn.style.display = "none";
  reloadBtn.style.marginLeft = "10px";
  document.querySelector(".admin-container")?.appendChild(reloadBtn);

  // ==============================
  // 🔹 Carregar licenças do Airtable
  // ==============================
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

  // ==============================
  // 🔹 Renderizar tabela
  // ==============================
  function renderLicenses(records) {
    if (!tbody) return;
    tbody.innerHTML = "";

    records.forEach((rec, i) => {
      const f = rec.fields;
      const tr = document.createElement("tr");

      const exp = f.expires_at
        ? new Date(f.expires_at).toLocaleDateString("pt-BR")
        : "-";
      const plan = (f.plan_type?.name || f.plan_type || "-").trim();
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

    table.style.display = "table";

    // Liga os botões de edição
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => startEdit(btn.dataset.id));
    });
  }

  // ==============================
  // 🔹 Iniciar edição inline
  // ==============================
  function startEdit(id) {
    const row = document.querySelector(`button[data-id="${id}"]`)?.closest("tr");
    if (!row) return;

    const cells = row.querySelectorAll("td");
    const code = cells[1].innerText.trim();
    const email = cells[2].innerText.trim();
    const plan = cells[3].innerText.replace("✨", "").trim();
    const expires = cells[4].innerText.trim();

    row.innerHTML = `
      <td>📝</td>
      <td><code>${code}</code></td>
      <td>${email}</td>
      <td>
        <select id="editPlan">
          <option value="mensal" ${plan.startsWith("mensal") ? "selected" : ""}>Mensal</option>
          <option value="vitalicio" ${plan.startsWith("vital") ? "selected" : ""}>Vitalício</option>
        </select>
      </td>
      <td><input id="editExp" type="date" value="${formatDateInput(expires)}"></td>
      <td colspan="3">
        <button id="saveEdit" class="btn-save">💾 Salvar</button>
        <button id="cancelEdit" class="btn-cancel">❌ Cancelar</button>
      </td>
      <td></td>
    `;

    document.getElementById("saveEdit").onclick = () => {
      const plan_type = document.getElementById("editPlan").value;
      const expires_at = document.getElementById("editExp").value;
      updateRecord(id, { plan_type, expires_at });
    };

    document.getElementById("cancelEdit").onclick = () => reloadBtn.click();
  }

  // ==============================
  // 🔹 Atualizar registro (POST JSON)
  // ==============================
  async function updateRecord(id, fields) {
    try {
      console.log("🧩 Enviando atualização:", { id, fields });

      const res = await fetch(`/api/admin-update?key=${encodeURIComponent(currentKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, fields })
      });

      const text = await res.text();
      console.log("📩 Resposta bruta do servidor:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        msg.textContent = "⚠️ Erro: resposta inválida do servidor.";
        msg.style.color = "red";
        return;
      }

      console.log("Update response:", data);

      if (data.ok) {
        msg.textContent = "✅ Licença atualizada com sucesso!";
        msg.style.color = "green";
        reloadBtn.click();
      } else {
        msg.textContent = `❌ Falha ao atualizar: ${data.msg || data.error}`;
        msg.style.color = "red";
      }
    } catch (err) {
      console.error("Erro updateRecord:", err);
      msg.textContent = "❌ Erro de conexão ao atualizar.";
      msg.style.color = "red";
    }
  }

    // ==============================
  // 🔹 Criar nova licença
  // ==============================
  const btnAdd = document.getElementById("btnAdd");
  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const code = document.getElementById("newCode").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const plan = document.getElementById("newPlan").value.trim();
      const expires_at = document.getElementById("newExp").value.trim();

      if (!code) {
        msg.textContent = "⚠️ O campo Código é obrigatório.";
        msg.style.color = "red";
        return;
      }

      msg.textContent = "⏳ Criando nova licença...";
      msg.style.color = "#555";

      try {
        const res = await fetch(`/api/admin?key=${encodeURIComponent(currentKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            plan,
            expires_at,
            notes: email || "",
            flagged: false,
          }),
        });

        const text = await res.text();
        console.log("📩 Resposta bruta (criação):", text);
        const data = JSON.parse(text);

        if (data.ok) {
          msg.textContent = "✅ Licença criada com sucesso!";
          msg.style.color = "green";

          // limpa campos e recarrega
          document.getElementById("newCode").value = "";
          document.getElementById("newEmail").value = "";
          document.getElementById("newExp").value = "";
          reloadBtn.click();
        } else {
          msg.textContent = "❌ Falha ao criar: " + (data.error || data.msg);
          msg.style.color = "red";
        }
      } catch (err) {
        console.error("Erro ao criar:", err);
        msg.textContent = "❌ Erro de conexão ao criar licença.";
        msg.style.color = "red";
      }
    });
  }


  // ==============================
  // 🔹 Utilitários
  // ==============================
  function formatDateInput(dateStr) {
    if (!dateStr || dateStr === "-") return "";
    const [d, m, y] = dateStr.split("/");
    if (!y) return "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // ==============================
  // 🔹 Eventos
  // ==============================
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
