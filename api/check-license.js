// /api/check-license.js — verifica licença por license_key (login do app)
import Airtable from "airtable";

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";

function getBase() {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
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
      // permite testar login mesmo antes de ligar o Airtable
      return res.status(200).json({
        ok: true,
        simulated: true,
        plan_type: "mensal",
        expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        grace_days: 5
      });
    }

    const recs = await base(AIRTABLE_TABLE).select({
      filterByFormula: `{license_key} = "${license_key}"`
    }).all();

    if (!recs.length) {
      return res.status(404).json({ ok: false, msg: "license_not_found" });
    }

    const r = recs[0];
    const status     = String(r.get("status") || "").toLowerCase(); // "ativo"/"inativo"
    const plan_type  = String(r.get("plan_type") || "mensal");
    const expires_at = r.get("expires_at");
    const exp        = expires_at ? new Date(expires_at) : null;
    const now        = new Date();

    if (status !== "ativo") {
      return res.status(200).json({ ok: false, msg: "inactive", plan_type, expires_at });
    }
    if (!exp || isNaN(exp.getTime())) {
      return res.status(200).json({ ok: false, msg: "no_expiration", plan_type });
    }
    if (exp < now) {
      return res.status(200).json({ ok: false, msg: "expired", plan_type, expires_at });
    }

    return res.status(200).json({
      ok: true,
      plan_type,
      expires_at: exp.toISOString(),
      grace_days: 5
    });
  } catch (e) {
    console.error("check-license error:", e);
    return res.status(200).json({ ok: false, msg: "server_error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
