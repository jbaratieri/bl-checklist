// /api/check-license.js — valida licença usando o campo `code` (fallback para `license_key`)
import Airtable from "airtable";

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";

function getBase() {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}

// Trata campo Date (sem hora) do Airtable como válido até o fim do dia local
function isNotExpired(dateOnlyStr) {
  if (!dateOnlyStr) return false;
  const [y, m, d] = String(dateOnlyStr).split("-").map(Number);
  if (!y || !m || !d) return false;
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return new Date() <= end;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET" || req.method === "HEAD") {
      return res.status(200).json({ ok: true, msg: "check-license up" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Method not allowed" });
    }

    const { license_key } = req.body || {};
    if (!license_key) {
      return res.status(400).json({ ok: false, msg: "license_key required" });
    }

    const base = getBase();
    if (!base) {
      // Permite teste mesmo sem Airtable ligado
      return res.status(200).json({
        ok: true, simulated: true, plan_type: "mensal",
        expires_at: new Date(Date.now() + 3*24*3600*1000).toISOString().slice(0,10),
        grace_days: 5
      });
    }

    // Procura por `code` primeiro; se não achar, tenta `license_key` (compatibilidade)
    let recs = await base(AIRTABLE_TABLE).select({
      filterByFormula: `{code} = "${license_key}"`
    }).all();

    if (!recs.length) {
      recs = await base(AIRTABLE_TABLE).select({
        filterByFormula: `{license_key} = "${license_key}"`
      }).all();
    }

    if (!recs.length) {
      return res.status(404).json({ ok: false, msg: "license_not_found" });
    }

    const r = recs[0];
    const plan_type  = String(r.get("plan_type") || "").toLowerCase(); // "mensal" | "vitalicio"
    const expires_at = r.get("expires_at"); // formato YYYY-MM-DD (Date-only)
    const flagged    = !!r.get("flagged");

    if (flagged) {
      return res.status(200).json({ ok: false, msg: "inactive", plan_type, expires_at });
    }

    // Vitalício ignora validade
    if (plan_type === "vitalicio") {
      return res.status(200).json({
        ok: true, plan_type: "vitalicio", expires_at: null, grace_days: 5
      });
    }

    if (!isNotExpired(expires_at)) {
      return res.status(200).json({ ok: false, msg: "expired", plan_type: plan_type || "mensal", expires_at });
    }

    return res.status(200).json({
      ok: true,
      plan_type: plan_type || "mensal",
      // retorna a mesma string date-only do Airtable
      expires_at,
      grace_days: 5
    });
  } catch (e) {
    console.error("check-license error:", e);
    return res.status(200).json({ ok: false, msg: "server_error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

