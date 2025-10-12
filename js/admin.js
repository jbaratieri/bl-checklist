// admin.js — Painel administrativo LuthierPro v1.7.2
(() => {
  const keyInput = document.getElementById("adminKey");
  const btnLogin = document.getElementById("btnLogin");
  const msg = document.getElementById("msg");
  const table = document.getElementById("licensesTable");
  const tbody = table ? table.querySelector("tbody") : null;

  let currentKey = null;

  // 🔄 Botão de atualizar
  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "🔄 Atualizar lista";
  reloadBtn.style.display = "none";
  reloadBtn.style.marginLeft = "10px";
  document.querySelector(".admin-container")?.appendChild(reloadBtn);

  // ======== Carrega licenças ========
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

  // ======== Renderiza tabela ========
  function renderLicenses(records) {
    if (!tbody) return;
    tbody.innerHTML = "";

    records.forEach((rec, i) => {
      const f = rec.fields;
      const tr = document.createElement("tr");

      const exp = f.expires_at
        ? new Date(f.expires_at).toLocaleDateString("pt-BR")
        : "-";
      const plan = (f.plan_type || "-").trim();
      const vital = plan.toLowerCase().includes("vital") ? "✨" : "";

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><code>${f.code || "-"}</code></td>
        <td>${f.email || "-"}</td>
        <td><input id="plan_${rec.id}" type="text" value="${plan}" size="9"></td>
        <td><input id="exp_${rec.id}" type="text" value="${exp}" size="10"></td>
        <td>${f.use_count ?? 0}</td>
        <td>${f.last_used ? new Date(f.last_used).toLocaleDateString("pt-BR") : "-"}</td>
        <td>${f.flagged ? "⚠️" : "✅"}</td>
        <td><button class="edit-btn" data-id="${rec.id}">✏️ Salvar</button></td>
      `;

      tbody.appendChild(tr);
    });

    table.style.display = "table";

    // Vincula botões após renderizar
    tbody.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => saveEdit(btn.dataset.id));
    });
  }

  // ======== Editar / Salvar ========
  async function saveEdit(id) {
    if (!currentKey) {
      alert("Chave de administrador não encontrada. Faça login novamente.");
      return;
    }

    const planInput = document.getElementById(`plan_${id}`);
    const expInput = document.getElementById(`exp_${id}`);

    let plan = planInput?.value || "";
    let exp = expInput?.value || "";

    // 🔧 Normaliza plano
    plan = plan
      .replace(/["']/g, "")
      .trim()
      .toLowerCase();
    if (plan.startsWith("mens")) plan = "mensal";
    else if (plan.startsWith("vit")) plan = "vitalicio";
    else {
      alert("Tipo de plano inválido. Use apenas 'mensal' ou 'vitalicio'.");
      return;
    }

    // 🧭 Converte data DD/MM/YYYY → YYYY-MM-DD
    if (exp && exp.includes("/")) {
      const [d, m, y] = exp.split("/");
      if (d && m && y) exp = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    msg.textContent = "💾 Salvando alterações...";
    msg.style.color = "#555";

    try {
      const res = await fetch(`/api/admin-update?id=${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: plan, expires_at: exp, adminKey: currentKey }),
      });

      const text = await res.text();
      console.log("Update response:", text);
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        msg.textContent = "⚠️ Erro: resposta inesperada.";
        msg.style.color = "red";
        return;
      }

      if (data.ok) {
        msg.textContent = "✅ Registro atualizado!";
        msg.style.color = "green";
        setTimeout(() => loadLicenses(currentKey), 800);
      } else {
        msg.textContent = "❌ Erro ao atualizar: " + (data.msg || "desconhecido");
        msg.style.color = "red";
      }
    } catch (err) {
      console.error("Erro ao salvar:", err);
      msg.textContent = "❌ Falha de conexão com o servidor.";
      msg.style.color = "red";
    }
  }

  // ======== Eventos ========
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
