// /api/webhook-hotmart.js — Hotmart v2 → Airtable (tabela: licenses)
import Airtable from "airtable";
import crypto from "crypto";

const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";

function base() {
  if (!AIRTABLE_BASE || !AIRTABLE_KEY) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}
function genCode(prefix = "LP") {
  const s = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}-${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,"0"), day = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

// Helpers (v2 com fallback v1)
const getEvent   = p => (p?.event || p?.EVENT || "").toString().toUpperCase();
const getStatus  = p => (p?.data?.purchase?.status || p?.data?.subscription?.status || p?.purchase?.status || "").toString().toUpperCase();
const getEmail   = p => p?.data?.buyer?.email || p?.buyer?.email || p?.email || "";
const getName    = p => (p?.data?.buyer?.name || p?.buyer?.name || "").toString();

export default async function handler(req, res) {
  try {
    if (req.method === "GET" || req.method === "HEAD") return res.status(200).json({ ok:true, msg:"webhook-hotmart up" });
    if (req.method !== "POST") return res.status(405).json({ ok:false, msg:"Method not allowed" });

    // segurança
    const tok = req.headers["x-hotmart-hottok"];
    if (!tok || tok !== HOTMART_HOTTOK) return res.status(401).json({ ok:false, msg:"Invalid hottok" });

    const payload = req.body || {};
    const event   = getEvent(payload);
    const status  = getStatus(payload);
    const email   = getEmail(payload);
    const name    = getName(payload);
    if (!email) return res.status(200).json({ ok:true, msg:"No buyer email; ack only", event, status });

    const b = base();
    if (!b) return res.status(200).json({ ok:true, msg:"ack without airtable", event, status, email });

    const approved = event === "PURCHASE_APPROVED" || status === "APPROVED" || status === "ACTIVE";
    const negative = ["PURCHASE_CANCELLED","PURCHASE_REFUNDED","PURCHASE_CHARGEBACK"].includes(event)
                  || ["CANCELLED","CHARGEBACK","REFUNDED","EXPIRED","OVERDUE","INACTIVE"].includes(status);

    const recs = await b(AIRTABLE_TABLE).select({ filterByFormula: `{email} = "${email}"` }).all();
    const now = new Date();

    if (approved) {
      if (recs.length) {
        // estender +30 dias (date-only)
        const r = recs[0];
        const prev = r.get("expires_at") ? new Date(r.get("expires_at")) : now;
        const baseDate = prev > now ? prev : now;
        const newExp = toDateOnly(addDays(baseDate, 30));
        const existingCode = r.get("code");
        const code = existingCode && String(existingCode).trim() ? existingCode : genCode("LP");

        await b(AIRTABLE_TABLE).update(r.id, {
          code,
          plan_type: "mensal",
          expires_at: newExp,   // YYYY-MM-DD
          name: name || r.get("name") || "",
          flagged: false
        });
        return res.status(200).json({ ok:true, action:"extended", email, code, expires_at:newExp });
      } else {
        // criar novo (sem created_at, é calculado na sua base)
        const code = genCode("LP");
        const exp  = toDateOnly(addDays(now, 30));
        await b(AIRTABLE_TABLE).create({
          email,
          name: name || "",
          code,
          plan_type: "mensal",
          expires_at: exp,      // YYYY-MM-DD
          use_count: 0,
          flagged: false
        });
        return res.status(200).json({ ok:true, action:"created", email, code, expires_at: exp });
      }
    }

    if (negative) {
      if (recs.length) await b(AIRTABLE_TABLE).update(recs[0].id, { flagged: true });
      return res.status(200).json({ ok:true, action:"deactivated", email, event, status });
    }

    return res.status(200).json({ ok:true, msg:"event ignored", event, status });
  } catch (e) {
    console.error("webhook-hotmart error:", e);
    return res.status(200).json({ ok:true, msg:"ack with error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
