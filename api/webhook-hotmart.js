// /api/webhook-hotmart.js — compatível com Hotmart Webhook v2 e Airtable com campos TEXT
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
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

// Helpers para ler payload v2 com fallback
function getEvent(payload) {
  return (payload?.event || payload?.EVENT || "").toString().toUpperCase();
}
function getStatus(payload) {
  // v2: data.purchase.status
  const v2 = payload?.data?.purchase?.status || payload?.data?.subscription?.status;
  if (v2) return String(v2).toUpperCase();
  // v1 fallback: purchase.status
  const v1 = payload?.purchase?.status;
  return v1 ? String(v1).toUpperCase() : "";
}
function getBuyerEmail(payload) {
  return payload?.data?.buyer?.email
      || payload?.buyer?.email
      || payload?.email
      || "";
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
    if (req.method !== "POST") return res.status(405).json({ ok:false, msg:"Method not allowed" });

    // Segurança: HOTTOK
    const incoming = req.headers["x-hotmart-hottok"];
    if (!incoming || incoming !== HOTMART_HOTTOK) {
      return res.status(401).json({ ok:false, msg:"Invalid hottok" });
    }

    const payload = req.body || {};
    const event = getEvent(payload);  // e.g., PURCHASE_APPROVED
    const status = getStatus(payload); // e.g., APPROVED / ACTIVE
    const buyerEmail = getBuyerEmail(payload);
    const orderId = getOrderId(payload);

    if (!buyerEmail) {
      // responde 200 pra não gerar retry infinito do Hotmart
      return res.status(200).json({ ok:true, msg:"No buyer email; ack only", event, status });
    }

    const base = getBase();
    if (!base) {
      return res.status(200).json({ ok:true, msg:"ack without airtable", event, status, buyerEmail, orderId });
    }

    // Normalizamos o "evento aprovado" (v2 manda event=PURCHASE_APPROVED; status pode ser APPROVED ou subscription ACTIVE)
    const isApproved = event === "PURCHASE_APPROVED" || status === "APPROVED" || status === "ACTIVE";

    if (isApproved) {
      const plan_type = "mensal"; // simples por enquanto (pode mapear por oferta depois)
      const now = new Date();

      // Busca por email
      const found = await base(AIRTABLE_TABLE).select({
        filterByFormula: `{email} = "${buyerEmail}"`
      }).all();

      if (found.length) {
        const r = found[0];
        const prev = r.get("expires_at") ? new Date(r.get("expires_at")) : now;
        const baseDate = prev > now ? prev : now;
        const newExp = addDays(baseDate, 30);

        // Todos TEXT no Airtable:
        await base(AIRTABLE_TABLE).update(r.id, {
          status: "ativo",
          plan_type,              // TEXT
          order_id: String(orderId || ""),
          expires_at: newExp.toISOString()
        });

        return res.status(200).json({ ok:true, action:"extended", email: buyerEmail, expires_at: newExp });
      } else {
        const license = genLicense("LP");
        const expires = addDays(now, 30);

        await base(AIRTABLE_TABLE).create({
          email: buyerEmail,
          license_key: license,   // TEXT
          plan_type,              // TEXT
          status: "ativo",        // TEXT
          order_id: String(orderId || ""),
          expires_at: expires.toISOString()
        });

        return res.status(200).json({ ok:true, action:"created", email: buyerEmail, license_key: license, expires_at: expires });
      }
    }

    // Eventos de cancel/refund/etc. (v2 ou v1)
    const isNegative = ["PURCHASE_CANCELLED","PURCHASE_REFUNDED","PURCHASE_CHARGEBACK"].includes(event)
                    || ["CANCELLED","CHARGEBACK","REFUNDED","EXPIRED","OVERDUE","INACTIVE"].includes(status);

    if (isNegative) {
      const recs = await base(AIRTABLE_TABLE).select({ filterByFormula: `{email} = "${buyerEmail}"` }).all();
      if (recs.length) {
        await base(AIRTABLE_TABLE).update(recs[0].id, { status: "inativo" }); // TEXT
      }
      return res.status(200).json({ ok:true, action:"deactivated", event, status });
    }

    // Outros → ACK
    return res.status(200).json({ ok:true, msg:"event ignored", event, status });
  } catch (err) {
    console.error("webhook-hotmart error:", err);
    return res.status(200).json({ ok:true, msg:"ack with error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
