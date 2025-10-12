// api/admin-update.js — Atualização de registros no Airtable (versão 1.3.0 compatível com SDK)

import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    const { key } = req.query;
    const { id, fields } = req.body;

    if (!key || key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    if (!id || !fields) {
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });
    }

    // ✅ Instância da base
    const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
      process.env.AIRTABLE_BASE
    );

    // ⚙️ Normaliza campos
    const cleanFields = {};
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === "string") {
        const clean = v.trim().replace(/^"+|"+$/g, "");
        cleanFields[k] = clean; // 👉 SDK espera string pura
      } else {
        cleanFields[k] = v;
      }
    }

    console.log("🧩 Atualizando registro Airtable:", { id, fields: cleanFields });

    // ✅ Atualiza no Airtable
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

