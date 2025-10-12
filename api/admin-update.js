// api/admin-update.js — Atualização segura no Airtable (LuthierPro)
import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_KEY,
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

    // 🔧 Monta campos válidos
    const fields = {};

    // ---- Plano ----
    if (plan_type && typeof plan_type === "string") {
      const p = plan_type.toLowerCase().trim();
      if (p.startsWith("men")) fields.plan_type = "mensal    "; // deve casar com Airtable
      else if (p.startsWith("vit")) fields.plan_type = "vitalicio";
    }

    // ---- Data ----
    if (expires_at && typeof expires_at === "string") {
      let iso = expires_at;
      if (expires_at.includes("/")) {
        const [d, m, y] = expires_at.split("/");
        if (d && m && y) iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      if (!isNaN(Date.parse(iso))) fields.expires_at = iso.split("T")[0];
    }

    console.log("🧩 Atualizando registro Airtable:", { id, fields });

    const result = await base("licenses").update([{ id, fields }]);

    console.log("✅ Sucesso:", result[0].id);
    return res.status(200).json({
      ok: true,
      msg: "Registro atualizado com sucesso",
      record: result[0],
    });
  } catch (err) {
    const errMsg =
      err?.error?.message ||
      err?.message ||
      JSON.stringify(err, Object.getOwnPropertyNames(err));

    console.error("❌ Erro detalhado no admin-update:", errMsg);
    return res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      error: errMsg,
    });
  }
}


