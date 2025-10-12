// api/admin-update.js — Atualização de registros (v1.5, compatível com campo texto)
import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    const { key } = req.query;
    const { id, fields } = req.body;

    if (!key || key !== process.env.ADMIN_KEY)
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    if (!id || !fields)
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });

    const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
      process.env.AIRTABLE_BASE
    );

    // ⚙️ Normaliza strings (texto puro)
    const cleanFields = {};
    for (const [k, v] of Object.entries(fields)) {
      cleanFields[k] = typeof v === "string" ? v.trim().replace(/^"+|"+$/g, "") : v;
    }

    console.log("🧩 Atualizando registro Airtable:", { id, fields: cleanFields });

    const updated = await base("licenses").update([
      {
        id,
        fields: cleanFields,
      },
    ]);

    return res.status(200).json({ ok: true, record: updated });
  } catch (err) {
    console.error("❌ Erro detalhado no admin-update:", err);
    return res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      error: err.message,
    });
  }
}
