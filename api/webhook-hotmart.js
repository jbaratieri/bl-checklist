// /api/webhook-hotmart.js — Hotmart v2, Airtable (TEXT fields), usando AIRTABLE_BASE/AIRTABLE_KEY
import Airtable from "airtable";
import crypto from "crypto";

const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK;

// aceita ambos os pares de env vars
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";

function getBase() {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}

function genLicense(prefix = "LP") {
  const s = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}-${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}`;
}
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

// helpers p/ payload v2 (com fallback v1)
function getEvent(payload) {
  return (payload?.event || payload?.EVENT || "").toString().toUpperCase();
}
function getStatus(payload) {
  const v2 = payload?.data?.purchase?.status || payload?.data?.subscription?.status;
  if (v2) return String(v2).toUpperCase();
  const v1 = payload?.purchase?.status;
  return v1 ? String(v1).toUpperCase() : "";
}
function getBuyerEmail(payload) {
  return payload?.data?.buyer?.email || payload?.buyer?.email || payload?.email || "";
}
function getOrderId(payload) {
  return payload?.data?.purchase?.transaction
      || payload?.purchase?.transaction
      || payload?.data?.subscription?.subscriber?.code
      || payload?.transaction
      || "";
}

export default async function handler(req, res) {
  try {
    // Healthcheck amigável
    if (req.method === "GET" || req.method === "HEAD") {
      return res.status(200).json({ ok: true, msg: "webhook-hotmart up" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Method not allowed" });
    }

    // segurança: validate hottok
    const incoming = req.headers["x-hotmart-hottok"];
    if (!incoming || incoming !== HOTMART_HOTTOK) {
      return res.status(401).json({ ok: false, msg: "Invalid hottok" });
    }

    const payload = req.body || {};
    const event   = getEvent(payload);   // e.g. PURCHASE_APPROVED
    const status  = getStatus(payload);  // e.g. APPROVED / ACTIVE
    const email   = getBuyerEmail(payload);
    const orderId = getOrderId(payload);

    if (!email) {
      // ack p/ não gerar retry infinito na Hotmart
      return res.status(200).json({ ok: true, msg: "No buyer email; ack only", event, status });
    }

    const base = getBase();
    if (!base) {
      return res.status(200).json({ ok: true, msg: "ack without airtable", event, status, email, orderId });
    }

    // aprovado/ativo
    const isApproved = event === "PURCHASE_APPROVED" || status === "APPROVED" || status === "ACTIVE";
    if (isApproved) {
      const plan_type = "mensal"; // simples por enquanto
      const now = new Date();

      const found = await base(AIRTABLE_TABLE).select({
        filterByFormula: `{email} = "${email}"`
      }).all();

      if (found.length) {
        const r = found[0];
        const prev = r.get("expires_at") ? new Date(r.get("expires_at")) : now;
        const baseDate = prev > now ? prev : now;
        const newExp = addDays(baseDate, 30);

        await base(AIRTABLE_TABLE).update(r.id, {
          status: "ativo",
          plan_type,                 // TEXT
          order_id: String(orderId || ""),
          expires_at: newExp.toISOString()
        });

        return res.status(200).json({ ok: true, action: "extended", email, expires_at: newExp });
      } else {
        const license = genLicense("LP");
        const expires = addDays(now, 30);

        await base(AIRTABLE_TABLE).create({
          email,
          license_key: license,      // TEXT
          plan_type,                 // TEXT
          status: "ativo",           // TEXT
          order_id: String(orderId || ""),
          expires_at: expires.toISOString()
        });

        return res.status(200).json({ ok: true, action: "created", email, license_key: license, expires_at: expires });
      }
    }

    // negativos: cancel/refund/etc.
    const isNegative = ["PURCHASE_CANCELLED","PURCHASE_REFUNDED","PURCHASE_CHARGEBACK"].includes(event)
                    || ["CANCELLED","CHARGEBACK","REFUNDED","EXPIRED","OVERDUE","INACTIVE"].includes(status);
    if (isNegative) {
      const recs = await base(AIRTABLE_TABLE).select({ filterByFormula: `{email} = "${email}"` }).all();
      if (recs.length) await base(AIRTABLE_TABLE).update(recs[0].id, { status: "inativo" }); // TEXT
      return res.status(200).json({ ok: true, action: "deactivated", event, status });
    }

    return res.status(200).json({ ok: true, msg: "event ignored", event, status });
  } catch (err) {
    console.error("webhook-hotmart error:", err);
    // 200 para não gerar reentrega infinita na Hotmart
    return res.status(200).json({ ok: true, msg: "ack with error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
