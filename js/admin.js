// admin.js — Painel administrativo LuthierPro (v1.8)
// - GET com cache-buster e no-store
// - reload duplo após criar/editar para “pegar” eventual atraso do Airtable
(() => {
  const keyInput = document.getElementById("adminKey");
  const btnLogin = document.getElementById("btnLogin");
  const msg = document.getElementById("msg");
  const table = document.getElementById("licensesTable");
  const tbody = table ? table.querySelector("tbody") : null;

  let currentKey = null;
  let cachedRecords = [];

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
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}&_=${Date.now()}`, {
        cache: "no-store",
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        msg.textContent = "⚠️ Erro: resposta inesperada do servidor.";
        msg.style.color = "red";
        return;
      }

      if (!data.ok) {
        msg.textContent = "Acesso negado ou chave incorreta.";
        msg.style.color = "red";
        return;
      }

      cachedRecords = data.records || [];
      msg.textContent = `✅ ${cachedRecords.length} licenças carregadas.`;
      msg.style.color = "green";
      renderLicenses(cachedRecords);

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
      const f = rec.fields || {};
      const tr = document.createElement("tr");

      const exp = f.expires_at ? new Date(f.expires_at).toLocaleDateString("pt-BR") : "-";
      const createdRaw = f.created_at || rec.createdTime; // fallback
      const created = createdRaw ? new Date(createdRaw).toLocaleDateString("pt-BR") : "-";
      const plan = (f.plan_type || "-").trim();

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${f.name || "-"}</td>
        <td>${f.email || "-"}</td>
        <td><code>${f.code || "-"}</code></td>
        <td>${plan}</td>
        <td>${exp}</td>
        <td>${created}</td>
        <td>${f.use_count ?? 0}</td>
        <td>${f.last_used ? new Date(f.last_used).toLocaleDateString("pt-BR") : "-"}</td>
        <td>${f.flagged ? "⚠️" : "✅"}</td>
        <td>
          <button class="edit-btn" data-id="${rec.id}">✏️ Editar</button>
          <button class="del-btn" data-id="${rec.id}" title="Excluir">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    table.style.display = "table";

    tbody.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => startEdit(btn.dataset.id));
    });
    tbody.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", () => handleDelete(btn.dataset.id));
    });
  }

  function startEdit(id) {
    const row = document.querySelector(`button.edit-btn[data-id="${id}"]`)?.closest("tr");
    if (!row) return;

    const cells = row.querySelectorAll("td");
    const name = cells[1].innerText.trim();
    const email = cells[2].innerText.trim();
    const code = cells[3].innerText.replace(/<[^>]+>/g, "").trim();
    const plan = cells[4].innerText.trim();
    const expires = cells[5].innerText.trim();

    row.innerHTML = `
      <td>📝</td>
      <td><input id="editName" type="text" value="${escapeAttr(name)}"></td>
      <td><input id="editEmail" type="email" value="${escapeAttr(email)}"></td>
      <td><code>${code}</code></td>
      <td>
        <select id="editPlan">
          <option value="mensal" ${plan.startsWith("mensal") ? "selected" : ""}>Mensal</option>
          <option value="vitalicio" ${plan.startsWith("vital") ? "selected" : ""}>Vitalício</option>
        </select>
      </td>
      <td>
        <input id="editExp" type="date" value="${formatDateInput(expires)}">
      </td>
      <td colspan="3">
        <button id="saveEdit" class="btn-save">💾 Salvar</button>
        <button id="cancelEdit" class="btn-cancel">❌ Cancelar</button>
      </td>
      <td></td>
    `;

    const editPlanEl = document.getElementById("editPlan");
    const editExpEl  = document.getElementById("editExp");

    function toggleEditExp() {
      if (editPlanEl.value === "vitalicio") {
        editExpEl.value = "";
        editExpEl.disabled = true;
      } else {
        editExpEl.disabled = false;
      }
    }
    toggleEditExp();
    editPlanEl.addEventListener("change", toggleEditExp);

    document.getElementById("saveEdit").onclick = () => {
      const fields = {
        name: document.getElementById("editName").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        plan_type: editPlanEl.value,
        expires_at: editExpEl.disabled ? "" : editExpEl.value, // "" -> backend põe null
      };
      updateRecord(id, fields);
    };

    document.getElementById("cancelEdit").onclick = () => reloadBtn.click();
  }

  async function updateRecord(id, fields) {
    try {
      const res = await fetch(`/api/admin-update?key=${encodeURIComponent(currentKey)}&_=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ id, fields })
      });

      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch {
        msg.textContent = "⚠️ Erro: resposta inválida do servidor.";
        msg.style.color = "red"; return;
      }

      if (data.ok) {
        msg.textContent = "✅ Licença atualizada com sucesso!";
        msg.style.color = "green";
        // revalida duas vezes pra driblar eventual latência do Airtable
        reloadBtn.click();
        setTimeout(() => reloadBtn.click(), 600);
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

  async function handleDelete(id) {
    if (!confirm("Confirma excluir esta licença?")) return;
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(currentKey)}&_=${Date.now()}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.ok) {
        msg.textContent = "🗑️ Licença excluída.";
        msg.style.color = "green";
        reloadBtn.click();
        setTimeout(() => reloadBtn.click(), 600);
      } else {
        msg.textContent = "❌ Falha ao excluir.";
        msg.style.color = "red";
      }
    } catch (e) {
      console.error(e);
      msg.textContent = "❌ Erro de conexão ao excluir.";
      msg.style.color = "red";
    }
  }

  const btnAdd = document.getElementById("btnAdd");
  const newPlanEl = document.getElementById("newPlan");
  const newExpEl  = document.getElementById("newExp");

  if (newPlanEl && newExpEl) {
    function toggleNewExp() {
      if (newPlanEl.value === "vitalicio") {
        newExpEl.value = "";
        newExpEl.disabled = true;
      } else {
        newExpEl.disabled = false;
      }
    }
    toggleNewExp();
    newPlanEl.addEventListener("change", toggleNewExp);
  }

  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const name = document.getElementById("newName").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const code = document.getElementById("newCode").value.trim();
      const plan = document.getElementById("newPlan").value.trim();
      const expires_at = document.getElementById("newExp").value.trim();

      if (!code || !name) {
        msg.textContent = "⚠️ Nome e Código são obrigatórios.";
        msg.style.color = "red";
        return;
      }

      msg.textContent = "⏳ Criando nova licença...";
      msg.style.color = "#555";

      try {
        const res = await fetch(`/api/admin?key=${encodeURIComponent(currentKey)}&_=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            code,
            name,
            email,
            plan,
            expires_at, // backend transformará ""/vitalício em null
            flagged: false,
          }),
        });

        const text = await res.text();
        const data = JSON.parse(text);

        if (data.ok) {
          msg.textContent = "✅ Licença criada com sucesso!";
          msg.style.color = "green";
          ["newName", "newEmail", "newCode", "newExp"].forEach(id => (document.getElementById(id).value = ""));
          if (newExpEl) newExpEl.disabled = (newPlanEl?.value === "vitalicio");
          reloadBtn.click();
          setTimeout(() => reloadBtn.click(), 600);
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

  function formatDateInput(dateStr) {
    if (!dateStr || dateStr === "-") return "";
    const [d, m, y] = dateStr.split("/");
    if (!y) return "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  function escapeAttr(v) {
    return String(v || "").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  }

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
