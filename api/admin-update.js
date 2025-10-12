// /api/admin-update.js — Atualização de registros no Airtable
import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    const { id } = req.query;
    const { fields } = req.body;

    if (!id || !fields) {
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });
    }

    const apiKey = (process.env.AIRTABLE_KEY || "").trim();
    const baseId = (process.env.AIRTABLE_BASE || "").trim();

    if (!apiKey || !baseId) {
      console.error("❌ Variáveis de ambiente ausentes:");
      console.error("AIRTABLE_KEY =", apiKey ? "✔️ presente" : "❌ ausente");
      console.error("AIRTABLE_BASE =", baseId ? "✔️ presente" : "❌ ausente");
      return res.status(500).json({ ok: false, msg: "Faltam variáveis de ambiente" });
    }

    console.log("🔑 Chave Airtable iniciando atualização:", apiKey.slice(0, 10) + "...");

    const base = new Airtable({ apiKey }).base(baseId);

    console.log("🧩 Atualizando registro Airtable:", { id, fields });

    const updated = await base("licenses").update(id, fields);

    console.log("✅ Sucesso:", updated.id);
    return res.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error("❌ Erro detalhado no admin-update:", err.message);
    return res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      error: err.message,
    });
  }
}

