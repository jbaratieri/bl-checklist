// api/admin-update.js — Atualização de registros no Airtable (robusto)
// - Whitelist ampliada p/ controle de devices e bloqueio
// - Saneamento de Devices (salva como JSON)

import Airtable from "airtable";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    const { key } = req.query;
    if (!key || key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    const { id, fields } = req.body || {};
    if (!id || !fields || typeof fields !== "object") {
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });
    }

    const ALLOWED = new Set([
      "name",
      "email",
      "code",
      "plan_type",
      "expires_at",
      "flagged",
      "blocked",
      "MaxDevices",
      "DeviceCount",
      "Devices",
      "DeviceIDs",
      // se quiser permitir manutenção manual:
      // "use_count","last_used","last_ip","last_ua","ip_history"
    ]);

    const cleanFields = {};
    for (const [k, v] of Object.entries(fields)) {
      if (!ALLOWED.has(k)) continue;

      if (k === "MaxDevices") {
        const n = Number(v);
        cleanFields[k] = Number.isFinite(n) && n > 0 ? n : 2;
        continue;
      }

      if (k === "DeviceCount") {
        const n = Number(v);
        cleanFields[k] = Number.isFinite(n) && n >= 0 ? n : 0;
        continue;
      }

      if (k === "blocked" || k === "flagged") {
        cleanFields[k] = !!v;
        continue;
      }

      if (k === "Devices") {
        if (v == null || v === "") {
          cleanFields[k] = "[]";
        } else if (typeof v === "string") {
          // confia, mas tenta validar
          try { JSON.parse(v); cleanFields[k] = v; }
          catch { cleanFields[k] = "[]"; }
        } else {
          // objeto/array → serializa
          try { cleanFields[k] = JSON.stringify(v); }
          catch { cleanFields[k] = "[]"; }
        }
        continue;
      }

      if (k === "DeviceIDs") {
        cleanFields[k] = (v || "").toString();
        continue;
      }

      if (k === "plan_type") {
        const planNorm = String(v)
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");
        cleanFields.plan_type = (planNorm === "vitalicio") ? "vitalicio" : "mensal";
        continue;
      }

      if (k === "expires_at") {
        if (v === "" || v == null) cleanFields.expires_at = null;
        else cleanFields.expires_at = String(v).trim();
        continue;
      }

      if (v === null || v === undefined) {
        cleanFields[k] = null;
      } else if (typeof v === "string") {
        cleanFields[k] = v.trim().replace(/^"+|"+$/g, "");
      } else {
        cleanFields[k] = v;
      }
    }

    // regras de plano/data
    const planEff = cleanFields.plan_type;
    if (planEff) {
      const isVitalicio = planEff === "vitalicio";
      const expVal = cleanFields.expires_at;

      if (!isVitalicio) {
        if (!expVal || String(expVal).trim() === "") {
          return res.status(400).json({
            ok: false,
            msg: "Para plano mensal, informe a data de validade.",
          });
        }
      } else {
        cleanFields.expires_at = null;
      }
    } else if ("expires_at" in cleanFields && cleanFields.expires_at === "") {
      cleanFields.expires_at = null;
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
      process.env.AIRTABLE_BASE
    );

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
