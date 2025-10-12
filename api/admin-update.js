// api/admin-update.js — Atualização de licenças (LuthierPro)
import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_KEY
}).base(process.env.AIRTABLE_BASE);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Método não permitido" });
  }

  try {
    const { id } = req.query;
    const { plan_type, expires_at, adminKey } = req.body || {};

    if (!id) return res.status(400).json({ ok: false, msg: "ID ausente" });
    if (!adminKey || adminKey !== process.env.ADMIN_KEY)
      return res.status(403).json({ ok: false, msg: "Acesso negado" });

    // 🔧 Normaliza campos
    const fields = {};

    // ---- Tipo de plano ----
    if (plan_type && typeof plan_type === "string") {
      const plan = plan_type.toLowerCase().trim();
      if (plan.startsWith("men")) fields.plan_type = "mensal    "; // deve casar com Airtable
      else if (plan.startsWith("vit")) fields.plan_type = "vitalicio";
    }

    // ---- Data de expiração ----
    if (expires_at && typeof expires_at === "string") {
      let isoDate = null;

      // Formato DD/MM/YYYY → converte
      if (expires_at.includes("/")) {
        const [d, m, y] = expires_at.split("/").map((x) => x.trim());
        if (y && m && d) isoDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      } else {
        // Formato ISO ou YYYY-MM-DD
        isoDate = expires_at.split("T")[0];
      }

      // Só define se for data válida
      if (!isNaN(Date.parse(isoDate))) {
        fields.expires_at = isoDate;
      }
    }

    console.log("🔧 Atualizando registro:", id, fields);

    // ---- Executa atualização no Airtable ----
    const updated = await base("licenses").update([{ id, fields }]);

    return res.status(200).json({
      ok: true,
      msg: "Registro atualizado com sucesso",
      record: updated[0],
    });
  } catch (err) {
    console.error("❌ Erro interno ao atualizar:", err);
    return res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      data: err?.message || err,
    });
  }
}


