// /api/airtable-ping.js — diagnóstico do Airtable (usa ADMIN_KEY)
import Airtable from "airtable";

const ADMIN_KEY     = process.env.ADMIN_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY  = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE= process.env.AIRTABLE_TABLE || "licenses";

function getBase() {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD")
      return res.status(405).json({ ok:false, msg:"Method not allowed" });

    // pode mandar por query (?key=) pra ficar fácil
    const key = req.headers["x-admin-key"] || req.query.key;
    if (!key || key !== ADMIN_KEY)
      return res.status(401).json({ ok:false, msg:"unauthorized" });

    const base = getBase();
    if (!base) {
      return res.status(200).json({
        ok: false,
        msg: "airtable env missing",
        has_AIRTABLE_BASE: !!AIRTABLE_BASE,
        has_AIRTABLE_KEY: !!AIRTABLE_KEY,
        table: AIRTABLE_TABLE
      });
    }

    // lê alguns registros pra listar campos que existem
    const recs = await base(AIRTABLE_TABLE).select({ maxRecords: 3 }).firstPage();
    const fieldSet = new Set();
    recs.forEach(r => Object.keys(r.fields).forEach(f => fieldSet.add(f)));

    return res.status(200).json({
      ok: true,
      table: AIRTABLE_TABLE,
      foundRecords: recs.length,
      fieldsSeen: Array.from(fieldSet),
      sample: recs.map(r => ({ id: r.id, fields: Object.keys(r.fields) }))
    });
  } catch (e) {
    return res.status(200).json({ ok:false, msg:"error", error: String(e) });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
