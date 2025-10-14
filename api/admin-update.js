// api/admin-update.js — Atualização de registros no Airtable (robusto)
import Airtable from "airtable";

export default async function handler(req, res) {
  // headers anti-cache
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  try {
    // ✅ Só aceita POST
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    // ✅ Auth
    const { key } = req.query;
    if (!key || key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    // ✅ Payload básico
    const { id, fields } = req.body || {};
    if (!id || !fields || typeof fields !== "object") {
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });
    }

    // ✅ Whitelist de campos que podem ser atualizados
    const ALLOWED = new Set([
      "name",
      "email",
      "code",
      "plan_type",
      "expires_at",
      "flagged",
      // abaixo geralmente são só leitura, mas deixe se quiser permitir:
      // "use_count", "last_used", "last_ip", "last_ua", "ip_history"
    ]);

    // ⚙️ Limpeza e filtro
    const cleanFields = {};
    for (const [k, v] of Object.entries(fields)) {
      if (!ALLOWED.has(k)) continue; // ignora campos não permitidos

      if (v === null || v === undefined) {
        cleanFields[k] = null;
      } else if (typeof v === "string") {
        // remove espaços e aspas externas
        cleanFields[k] = v.trim().replace(/^"+|"+$/g, "");
      } else {
        cleanFields[k] = v;
      }
    }

    // 🔤 Normaliza plano (sem acento, minúsculo)
    if (cleanFields.plan_type != null) {
      const planNorm = String(cleanFields.plan_type)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, ""); // "vitalício" -> "vitalicio"
      cleanFields.plan_type = planNorm === "vitalicio" ? "vitalicio" : "mensal";
    }

    // 🎯 Regras de negócio:
    // - Se plano mensal → exige expires_at preenchido (não "", null, undefined)
    // - Se vitalício → força expires_at = null (não salva data)
    const planEff = cleanFields.plan_type; // pode estar ausente no update parcial
    if (planEff) {
      const isVitalicio = planEff === "vitalicio";
      const expVal = cleanFields.expires_at;

      if (!isVitalicio) {
        // mensal
        if (!expVal || String(expVal).trim() === "") {
          return res.status(400).json({
            ok: false,
            msg: "Para plano mensal, informe a data de validade.",
          });
        }
      } else {
        // vitalício
        cleanFields.expires_at = null;
      }
    } else if ("expires_at" in cleanFields && cleanFields.expires_at === "") {
      // se veio "" sem informar plan_type, considere como null
      cleanFields.expires_at = null;
    }

    // 🧪 (Opcional) Valida formato de data se quiser ser mais rígido
    // if (cleanFields.expires_at) {
    //   const dt = new Date(cleanFields.expires_at);
    //   if (isNaN(dt.getTime())) {
    //     return res.status(400).json({ ok: false, msg: "Data de validade inválida." });
    //   }
    // }

    // ✅ Atualiza no Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
      process.env.AIRTABLE_BASE
    );

    console.log("🧩 Atualizando registro Airtable:", { id, cleanFields });

    const updated = await base("licenses").update([
      {
        id,
        fields: cleanFields,
      },
    ]);

    return res.status(200).json({ ok: true, record: updated?.[0] || null });
  } catch (err) {
    console.error("❌ Erro detalhado no admin-update:", err);
    return res
      .status(500)
      .json({ ok: false, msg: "Erro ao atualizar no Airtable", error: err.message });
  }
}
