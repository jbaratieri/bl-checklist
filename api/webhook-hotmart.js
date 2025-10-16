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
const getTx      = p => p?.data?.purchase?.transaction || p?.purchase?.transaction || ""; // idempotência

// 🔎 Mapa de PRODUCT ID → plano
const PRODUCT_PLAN_MAP = {
  6436614: "mensal",     // LuthierPro — Assinatura Mensal
  6449475: "vitalicio",  // LuthierPro — Acesso Vitalício
};

function getProductId(payload) {
  const pid =
    payload?.data?.product?.id ??
    payload?.product?.id ??
    payload?.data?.content?.products?.[0]?.id;
  return typeof pid === "string" ? parseInt(pid, 10) : pid;
}

function resolvePlanType(payload) {
  const productId = getProductId(payload);
  if (productId && PRODUCT_PLAN_MAP[productId]) return PRODUCT_PLAN_MAP[productId];

  // Fallback: se vier assinatura ativa, tratamos como mensal
  const subStatus = (payload?.data?.subscription?.status || "").toString().toUpperCase();
  if (subStatus === "ACTIVE") return "mensal";

  // Último caso: assume vitalício (pagamento único)
  return "vitalicio";
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET" || req.method === "HEAD") {
      return res.status(200).json({ ok:true, msg:"webhook-hotmart up" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, msg:"Method not allowed" });
    }

    // segurança (Hotmart)
    const tok = req.headers["x-hotmart-hottok"];
    if (!tok || tok !== HOTMART_HOTTOK) {
      return res.status(401).json({ ok:false, msg:"Invalid hottok" });
    }

    const payload = req.body || {};
    const event   = getEvent(payload);
    const status  = getStatus(payload);
    const email   = getEmail(payload);
    const name    = getName(payload);
    const tx      = (getTx(payload) || "").toString();
    if (!email) return res.status(200).json({ ok:true, msg:"No buyer email; ack only", event, status });

    const b = base();
    if (!b) return res.status(200).json({ ok:true, msg:"ack without airtable", event, status, email });

    const approved = event === "PURCHASE_APPROVED" || status === "APPROVED" || status === "ACTIVE";
    const negative = ["PURCHASE_CANCELLED","PURCHASE_REFUNDED","PURCHASE_CHARGEBACK"].includes(event)
                  || ["CANCELLED","CHARGEBACK","REFUNDED","EXPIRED","OVERDUE","INACTIVE"].includes(status);

    const now = new Date();
    const planTypeComputed = resolvePlanType(payload);

    // 🔍 Busca segura por e-mail (case-insensitive + escapa aspas simples)
    const emailNorm = email.toString().toLowerCase();
    const emailEsc  = emailNorm.replace(/'/g, "\\'");
    const formula   = `LOWER({email})='${emailEsc}'`;
    const recs = await b(AIRTABLE_TABLE).select({ filterByFormula: formula, maxRecords: 3 }).firstPage();

    // idempotência: se já processamos este transaction, não reprocessa
    if (tx && recs.length && (recs[0].get("last_transaction") || "") === tx) {
      return res.status(200).json({ ok:true, action:"noop_already_processed", email, tx });
    }

    if (approved) {
      if (recs.length) {
        // atualizar
        const r = recs[0];
        const existingCode = (r.get("code") || "").toString().trim();
        const code = existingCode ? existingCode : genCode("LP");

        // não rebaixa vitalício
        const currentPlan = (r.get("plan_type") || "").toString().toLowerCase();
        const isAlreadyVitalicio = currentPlan === "vitalicio";
        const finalPlan = isAlreadyVitalicio ? "vitalicio" : planTypeComputed;

        const fieldsToUpdate = {
          code,
          plan_type: finalPlan,
          name: name || r.get("name") || "",
          flagged: false,
          last_transaction: tx || r.get("last_transaction") || "",
          last_event_at: now.toISOString()
        };

        if (finalPlan === "mensal") {
          // estende +30 dias a partir do maior entre hoje e a expiração atual
          const prev = r.get("expires_at") ? new Date(r.get("expires_at")) : now;
          const baseDate = prev > now ? prev : now;
          fieldsToUpdate.expires_at = toDateOnly(addDays(baseDate, 30));
        } else {
          // vitalício: remove expiração
          fieldsToUpdate.expires_at = null;
        }

        await b(AIRTABLE_TABLE).update(r.id, fieldsToUpdate);
        return res.status(200).json({
          ok: true, action: "updated", email, code, plan_type: finalPlan,
          expires_at: fieldsToUpdate.expires_at || "", tx
        });
      } else {
        // criar
        const code = genCode("LP");
        const fields = {
          email,
          name: name || "",
          code,
          plan_type: planTypeComputed,
          use_count: 0,
          flagged: false,
          last_transaction: tx || "",
          last_event_at: now.toISOString()
        };
        if (planTypeComputed === "mensal") {
          fields.expires_at = toDateOnly(addDays(now, 30)); // YYYY-MM-DD
        } else {
          fields.expires_at = null; // vitalício sem expiração
        }

        await b(AIRTABLE_TABLE).create(fields);
        return res.status(200).json({
          ok: true, action: "created", email, code, plan_type: planTypeComputed,
          expires_at: fields.expires_at || "", tx
        });
      }
    }

    if (negative) {
      if (recs.length) {
        await b(AIRTABLE_TABLE).update(recs[0].id, {
          flagged: true,
          last_transaction: tx || recs[0].get("last_transaction") || "",
          last_event_at: now.toISOString()
        });
      }
      return res.status(200).json({ ok:true, action:"deactivated", email, event, status, tx });
    }

    return res.status(200).json({ ok:true, msg:"event ignored", event, status, tx });
  } catch (e) {
    console.error("webhook-hotmart error:", e);
    return res.status(200).json({ ok:true, msg:"ack with error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
