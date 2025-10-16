// /api/airtable-write-test.js — cria um registro de teste na tabela (usa ADMIN_KEY)
import Airtable from "airtable";

const ADMIN_KEY      = process.env.ADMIN_KEY;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";

function getBase() {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ ok:false, msg:"Method not allowed" });

    const key = req.headers["x-admin-key"] || req.query.key;
    if (!key || key !== ADMIN_KEY) return res.status(401).json({ ok:false, msg:"unauthorized" });

    const base = getBase();
    if (!base) return res.status(200).json({
      ok:false, msg:"airtable env missing",
      has_AIRTABLE_BASE: !!AIRTABLE_BASE,
      has_AIRTABLE_KEY:  !!AIRTABLE_KEY,
      table: AIRTABLE_TABLE
    });

    if (req.query.do !== "write") {
      return res.status(200).json({ ok:true, msg:"dry-run (passe ?do=write para criar)", table: AIRTABLE_TABLE });
    }

    const now = new Date();
    const exp = new Date(now.getTime() + 30*24*3600*1000).toISOString();

    // ⚠️ Usa exatamente os campos da sua tabela:
    // licenses: code, plan_type, expires_at, name, email, use_count, last_used, last_ip, flagged, created_at, ip_history, last_ua
    const rec = await base(AIRTABLE_TABLE).create({
      email: "diagnose@example.com",
      name:  "Diagnose Bot",
      code:  "LP-TESTE-1234-ABCD",
      plan_type: "mensal",
      expires_at: exp,
      created_at: now.toISOString(),
      use_count: 0,
      flagged: false
      // last_used/last_ip/ip_history/last_ua ficam vazios
    });

    return res.status(200).json({ ok:true, created: { id: rec.id } });
  } catch (e) {
    console.error("airtable-write-test error:", e);
    return res.status(200).json({ ok:false, msg:"create_error", error: String(e) });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
