// api/admin-update.js — Atualização de registros no Airtable (versão revisada 1.2.0)

import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    // ✅ Só aceita POST
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    const { key } = req.query;
    const { id, fields } = req.body;

    // ✅ Validação de segurança
    if (!key || key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    if (!id || !fields) {
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });
    }

    // ✅ Configuração do Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
      process.env.AIRTABLE_BASE
    );

    // ⚙️ Normaliza campos e corrige selects
    const cleanFields = {};
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === "string") {
        const clean = v.trim().replace(/^"+|"+$/g, "");
        // 🔧 Corrige campo de seleção
        if (k === "plan_type") {
          cleanFields[k] = { name: clean };
        } else {
          cleanFields[k] = clean;
        }
      } else {
        cleanFields[k] = v;
      }
    }

    console.log("🧩 Atualizando registro Airtable:", { id, fields: cleanFields });

    // ✅ Executa atualização
    const updated = await base("licenses").update([
      {
        id,
        fields: cleanFields,
      },
    ]);

    return res.status(200).json({ ok: true, record: updated });
  } catch (err) {
    console.error("❌ Erro detalhado no admin-update:", err);

    // 🔍 Tratamento mais detalhado do erro do Airtable
    const errorMessage =
      err?.error?.message ||
      err?.message ||
      "Erro desconhecido ao atualizar no Airtable";

    return res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      error: errorMessage,
    });
  }
}
