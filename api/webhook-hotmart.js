import Airtable from "airtable";
import crypto from "crypto";

const {
  AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE = "licenses",
  HOTMART_HOTTOK
} = process.env;

function getBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return null;
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}
function genLicense(prefix = "LP") {
  const s = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}-${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}`;
}
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate()+days); return d; }

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, msg:"Method not allowed" });
    const incoming = req.headers["x-hotmart-hottok"];
    if (!incoming || incoming !== process.env.HOTMART_HOTTOK) {
      return res.status(401).json({ ok:false, msg:"Invalid hottok" });
    }

    const payload = req.body || {};
    const status = (payload?.purchase?.status || payload?.status || "").toUpperCase();
    const buyerEmail = payload?.buyer?.email || payload?.email || "";
    const orderId = payload?.purchase?.transaction || payload?.purchase?.order?.id || payload?.transaction || "";

    if (!buyerEmail) return res.status(200).json({ ok:true, msg:"No buyer email; ack only" });

    const base = getBase();
    if (!base) return res.status(200).json({ ok:true, msg:"ack without airtable", status, buyerEmail, orderId });

    if (status === "APPROVED") {
      const plan_type = "mensal";
      const now = new Date();
      const records = await base(AIRTABLE_TABLE).select({ filterByFormula: `{email} = "${buyerEmail}"` }).all();

      if (records.length) {
        const r = records[0];
        const prev = r.get("expires_at") ? new Date(r.get("expires_at")) : now;
        const baseDate = prev > now ? prev : now;
        const newExp = addDays(baseDate, 30);
        await base(AIRTABLE_TABLE).update(r.id, {
          status: "ativo", plan_type, order_id: orderId, expires_at: newExp.toISOString()
        });
        return res.status(200).json({ ok:true, action:"extended", email: buyerEmail, expires_at: newExp });
      } else {
        const license = genLicense("LP");
        const expires = addDays(now, 30);
        await base(AIRTABLE_TABLE).create({
          email: buyerEmail, license_key: license, plan_type, status: "ativo", order_id: orderId, expires_at: expires.toISOString()
        });
        return res.status(200).json({ ok:true, action:"created", email: buyerEmail, license_key: license, expires_at: expires });
      }
    }

    if (["CANCELLED","CHARGEBACK","REFUNDED","EXPIRED","OVERDUE"].includes(status)) {
      const recs = await base(AIRTABLE_TABLE).select({ filterByFormula: `{email} = "${buyerEmail}"` }).all();
      if (recs.length) await base(AIRTABLE_TABLE).update(recs[0].id, { status: "inativo" });
      return res.status(200).json({ ok:true, action:"deactivated", status });
    }

    return res.status(200).json({ ok:true, msg:"event ignored", status });
  } catch (err) {
    console.error("webhook-hotmart error:", err);
    return res.status(200).json({ ok:true, msg:"ack with error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
