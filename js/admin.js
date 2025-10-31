// admin.js — Painel administrativo LuthierPro (v2.1 — devices & blocked)
// - Status correto: BLOQUEADO só se blocked=true (flagged é alerta)
// - Lista/edita MaxDevices e blocked
// - Gerenciar aparelhos (remover deviceId)
// - Export CSV com campos de devices/flags

(() => {
  const keyInput = document.getElementById("adminKey");
  const btnLogin  = document.getElementById("btnLogin");
  const msg       = document.getElementById("msg");
  const table     = document.getElementById("licensesTable");
  const tbody     = table ? table.querySelector("tbody") : null;

  // Toolbar
  const toolbar      = document.getElementById("adminToolbar");
  const filterStatus = document.getElementById("filterStatus");
  const searchBox    = document.getElementById("searchBox");
  const btnExport    = document.getElementById("btnExport");

  let currentKey = null;
  let cachedRecords = [];
  let currentFilter = "all";
  let currentQuery  = "";

  // 🔄 Botão de recarregar
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "🔄 Atualizar lista";
  reloadBtn.style.display = "none";
  reloadBtn.style.marginLeft = "10px";
  document.querySelector(".admin-container")?.appendChild(reloadBtn);

  // ============= Utils base =============
  const norm = s => (s || "").toString()
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "");

  function formatDateInput(dateStr) {
    if (!dateStr || dateStr === "-") return "";
    const [d, m, y] = dateStr.split("/");
    if (!y) return "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  function escapeAttr(v) {
    return String(v || "").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  }

  // Status helper
  function computeStatus(rec) {
    const f = rec.fields || {};
    const blocked = !!f.blocked;
    const planRaw = (f.plan_type || "-").toString().trim();
    const planNorm = norm(planRaw);
    const isVitalicio = planNorm === "vitalicio";
    const expDate = f.expires_at ? new Date(f.expires_at) : null;

    if (blocked) return "BLOQUEADO";
    if (!isVitalicio && expDate && Date.now() > expDate.getTime()) return "EXPIRADO";
    return "ATIVO";
  }

  // ============= Carregar/Aparecer =============
  async function loadLicenses(adminKey) {
    msg.textContent = "🔄 Carregando licenças...";
    msg.style.color = "#555";
    table.style.display = "none";
    reloadBtn.style.display = "none";
    if (toolbar) toolbar.style.display = "none";

    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(adminKey)}&_=${Date.now()}`, {
        cache: "no-store",
      });
      const text = await res.text();

      if (!res.ok) {
        msg.textContent = "⚠️ Erro ao buscar licenças. Tente novamente em alguns segundos.";
        msg.style.color = "red";
        console.error("Falha GET /api/admin:", res.status, text);
        return;
      }

      let data;
      try { data = JSON.parse(text); } catch {
        msg.textContent = "⚠️ Resposta inesperada do servidor.";
        msg.style.color = "red";
        console.error("Resposta inválida:", text);
        return;
      }

      if (!data.ok) {
        msg.textContent = `⚠️ ${data.msg || "Falha ao carregar licenças."}`;
        msg.style.color = "red";
        console.error("Payload erro:", data);
        return;
      }

      cachedRecords = data.records || [];
      msg.textContent = `✅ ${cachedRecords.length} licenças carregadas.`;
      msg.style.color = "green";

      currentKey = adminKey;
      reloadBtn.style.display = "inline-block";
      if (toolbar) toolbar.style.display = "flex";

      applyFilters();
    } catch (err) {
      msg.textContent = "❌ Sem conexão. Verifique sua internet e tente novamente.";
      msg.style.color = "red";
      console.error("Erro fetch:", err);
    }
  }

  // ============= Filtros/Busca/CSV =============
  function applyFilters() {
    let list = [...cachedRecords];

    if (currentFilter !== "all") {
      list = list.filter(r => computeStatus(r) === currentFilter);
    }

    if (currentQuery.trim() !== "") {
      const q = norm(currentQuery);
      list = list.filter(r => {
        const f = r.fields || {};
        return (
          norm(f.name).includes(q) ||
          norm(f.email).includes(q) ||
          norm(f.code).includes(q)
        );
      });
    }

    renderLicenses(list);
  }

  function exportToCSV() {
    let list = [...cachedRecords];
    if (currentFilter !== "all") list = list.filter(r => computeStatus(r) === currentFilter);
    if (currentQuery.trim() !== "") {
      const q = norm(currentQuery);
      list = list.filter(r => {
        const f = r.fields || {};
        return norm(f.name).includes(q) || norm(f.email).includes(q) || norm(f.code).includes(q);
      });
    }

    const headers = [
      "name","email","code","plan_type",
      "expires_at","created_at","use_count",
      "last_used","flagged","blocked","status",
      "DeviceCount","MaxDevices","DeviceIDs"
    ];

    const rows = list.map(rec => {
      const f = rec.fields || {};
      const status = computeStatus(rec);
      return [
        (f.name || ""),
        (f.email || ""),
        (f.code || ""),
        (f.plan_type || ""),
        (f.expires_at || ""),
        (f.created_at || rec.createdTime || ""),
        (f.use_count ?? 0),
        (f.last_used || ""),
        (f.flagged ? "true" : "false"),
        (f.blocked ? "true" : "false"),
        status,
        (f.DeviceCount ?? 0),
        (f.MaxDevices ?? 2),
        (f.DeviceIDs || "")
      ];
    });

    const csv = [headers, ...rows]
      .map(r => r.map(val => {
        const s = String(val ?? "");
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    const dt = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    a.download = `licenses-${dt}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  // ============= Render da tabela =============
  function renderLicenses(records) {
    if (!tbody) return;
    tbody.innerHTML = "";

    records.forEach((rec, i) => {
      const f = rec.fields || {};
      const tr = document.createElement("tr");

      const planRaw = (f.plan_type || "-").toString().trim();
      const planNorm = norm(planRaw);
      const isVitalicio = planNorm === "vitalicio";

      const expDate = f.expires_at ? new Date(f.expires_at) : null;
      const expStr  = expDate ? expDate.toLocaleDateString("pt-BR") : "-";
      const createdRaw = f.created_at || rec.createdTime;
      const createdStr = createdRaw ? new Date(createdRaw).toLocaleDateString("pt-BR") : "-";

      const status = computeStatus(rec);
      const badgeClass =
        status === "BLOQUEADO" ? "badge blocked" :
        status === "EXPIRADO"  ? "badge expired" :
                                  "badge active";

      const blocked = !!f.blocked;
      const flagged = !!f.flagged;
      const devCount = Number(f.DeviceCount || 0);
      const maxDevs  = Number(f.MaxDevices || 2);
      const flaggedBadge = flagged ? `<span class="mini-flag">⚑</span>` : "";

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${f.name || "-"}</td>
        <td>${f.email || "-"}</td>
        <td><code>${f.code || "-"}</code></td>
        <td>${planRaw}</td>
        <td>${expStr}</td>
        <td>${createdStr}</td>
        <td>${f.use_count ?? 0}</td>
        <td>${f.last_used ? new Date(f.last_used).toLocaleDateString("pt-BR") : "-"}</td>
        <td><span class="${badgeClass}">${status}</span> ${flaggedBadge}</td>
        <td>${devCount} / ${maxDevs}</td>
        <td>
          <button class="manage-btn" data-id="${rec.id}">🖥️ Gerenciar</button>
          <button class="edit-btn" data-id="${rec.id}">✏️ Editar</button>
          <button class="del-btn" data-id="${rec.id}" title="Excluir">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    table.style.display = "table";

    tbody.querySelectorAll(".manage-btn").forEach(btn => {
      btn.addEventListener("click", () => handleManage(btn.dataset.id));
    });
    tbody.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => startEdit(btn.dataset.id));
    });
    tbody.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", () => handleDelete(btn.dataset.id));
    });
  }

  // ============= Edição inline =============
  function startEdit(id) {
    const row = document.querySelector(`button.edit-btn[data-id="${id}"]`)?.closest("tr");
    if (!row) return;

    const rec = cachedRecords.find(r => r.id === id) || {};
    const f = rec.fields || {};
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
      <td><input id="editExp" type="date" value="${formatDateInput(expires)}"></td>
      <td colspan="3" class="inline-controls">
        <label style="margin-right:12px;">
          MaxDevices:
          <input id="editMaxDevices" type="number" min="1" max="10" step="1" style="width:64px"
                 value="${escapeAttr((f.MaxDevices ?? 2))}">
        </label>
        <label>
          <input id="editBlocked" type="checkbox" ${f.blocked ? "checked" : ""}>
          Bloqueado
        </label>
      </td>
      <td colspan="2">
        <button id="saveEdit" class="btn-save">💾 Salvar</button>
        <button id="cancelEdit" class="btn-cancel">❌ Cancelar</button>
      </td>
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
      const planSel = document.getElementById("editPlan").value;
      const expVal  = document.getElementById("editExp").value;

      if (planSel === "mensal" && !expVal) {
        msg.textContent = "⚠️ Para plano mensal, informe a data de validade.";
        msg.style.color = "red";
        return;
      }

      const fields = {
        name: document.getElementById("editName").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        plan_type: planSel,
        expires_at: (planSel === "vitalicio") ? "" : expVal,
        MaxDevices: Number(document.getElementById("editMaxDevices").value || 2),
        blocked: !!document.getElementById("editBlocked").checked,
      };
      updateRecord(id, fields);
    };

    document.getElementById("cancelEdit").onclick = () => reloadBtn.click();
  }

  // ============= Update / Delete =============
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

  // ============= Gerenciar aparelhos =============
  function parseDevices(devField) {
    if (!devField) return [];
    if (Array.isArray(devField)) return devField;
    if (typeof devField === "string") {
      try { return JSON.parse(devField); } catch { return []; }
    }
    return [];
  }

  async function handleManage(id) {
    const rec = cachedRecords.find(r => r.id === id);
    if (!rec) return;
    const f = rec.fields || {};
    const devices = parseDevices(f.Devices);
    if (!devices.length) {
      alert("Nenhum aparelho vinculado ainda.");
      return;
    }

    const lines = devices.map((d, idx) => {
      const last = d.lastSeen ? new Date(d.lastSeen).toLocaleString("pt-BR") : "-";
      const first = d.firstSeen ? new Date(d.firstSeen).toLocaleString("pt-BR") : "-";
      const ua = (d.userAgent || "").slice(0, 60);
      return `${idx+1}) ${d.deviceId}\n   first: ${first}\n   last: ${last}\n   ua: ${ua}`;
    }).join("\n\n");

    const toRemove = prompt(
      "Aparelhos vinculados:\n\n" + lines + "\n\nDigite o deviceId para REMOVER (ou deixe em branco para cancelar):"
    );
    if (!toRemove) return;

    const idx = devices.findIndex(d => d.deviceId === toRemove.trim());
    if (idx < 0) {
      alert("deviceId não encontrado.");
      return;
    }

    if (!confirm(`Remover o deviceId "${toRemove}" desta licença?`)) return;

    devices.splice(idx, 1);
    const newCount = devices.length;
    const newIDs = devices.map(d => d.deviceId).join(",");

    await updateRecord(id, {
      Devices: JSON.stringify(devices),
      DeviceCount: newCount,
      DeviceIDs: newIDs,
      flagged: (newCount > (Number(f.MaxDevices || 2))) ? true : false
    });
  }

  // ============= Criar nova licença =============
  const btnAdd   = document.getElementById("btnAdd");
  const newPlanEl= document.getElementById("newPlan");
  const newExpEl = document.getElementById("newExp");

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
      const name  = document.getElementById("newName").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const code  = document.getElementById("newCode").value.trim();
      const plan  = document.getElementById("newPlan").value.trim();
      const expires_at = document.getElementById("newExp").value.trim();

      if (!code || !name) {
        msg.textContent = "⚠️ Nome e Código são obrigatórios.";
        msg.style.color = "red";
        return;
      }
      if (plan === "mensal" && !expires_at) {
        msg.textContent = "⚠️ Para plano mensal, informe a data de validade.";
        msg.style.color = "red";
        document.getElementById("newExp")?.focus();
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
            // se quiser sobrescrever defaults de devices na criação:
            // MaxDevices: 2, blocked: false
          }),
        });

        const text = await res.text();
        const data = JSON.parse(text);

        if (data.ok) {
          msg.textContent = "✅ Licença criada com sucesso!";
          msg.style.color = "green";
          ["newName", "newEmail", "newCode", "newExp"].forEach(id => (document.getElementById(id).value = ""));;
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

  // ============= Eventos globais =============
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

  if (filterStatus) {
    filterStatus.addEventListener("change", () => {
      currentFilter = filterStatus.value;
      applyFilters();
    });
  }

  let searchT;
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      clearTimeout(searchT);
      searchT = setTimeout(() => {
        currentQuery = searchBox.value || "";
        applyFilters();
      }, 200);
    });
  }

  if (btnExport) {
    btnExport.addEventListener("click", exportToCSV);
  }
})();
