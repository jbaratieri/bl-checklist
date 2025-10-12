// api/admin-update.js — Atualização de licenças Airtable (LuthierPro)
import Airtable from "airtable";

// 🔑 Inicializa conexão
const base = new Airtable({
  apiKey: process.env.AIRTABLE_KEY
}).base(process.env.AIRTABLE_BASE);

export default async function handler(req, res) {
  // Aceita apenas POST (enviado pelo painel)
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Método não permitido" });
  }

  try {
    const { id } = req.query;
    const { plan_type, expires_at, adminKey } = req.body || {};

    // 🧩 Validação básica
    if (!id) {
      return res.status(400).json({ ok: false, msg: "ID do registro ausente" });
    }

    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    // 🔧 Prepara campos válidos para atualizar
    const fields = {};

    // Normaliza tipo de plano (precisa casar com as opções do Airtable)
    if (plan_type) {
      const plan = plan_type.toLowerCase().trim();
      if (["mensal", "vitalicio"].includes(plan)) {
        fields.plan_type = plan;
      } else {
        return res.status(400).json({
          ok: false,
          msg: `Tipo de plano inválido: ${plan_type}`,
        });
      }
    }

    // Valida e converte data (ISO)
    if (expires_at) {
      const iso = new Date(expires_at);
      if (isNaN(iso.getTime())) {
        return res.status(400).json({
          ok: false,
          msg: `Data inválida: ${expires_at}`,
        });
      }
      fields.expires_at = iso.toISOString().split("T")[0];
    }

    // ⚙️ Atualiza registro no Airtable
    const updated = await base("licenses").update([
      {
        id,
        fields,
      },
    ]);

    res.status(200).json({
      ok: true,
      msg: "Registro atualizado com sucesso",
      record: updated[0],
    });
  } catch (err) {
    console.error("Erro ao atualizar registro:", err);
    res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      data: err,
    });
  }
}

