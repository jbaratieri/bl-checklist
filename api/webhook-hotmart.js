// `api/webhook-hotmart.js`: recebe eventos da Hotmart e atualiza/cria licencas no Airtable.
// Processa aprovacao, renovacao, cancelamento e reembolso com idempotencia por transacao.
// Atenção: endpoint financeiro critico; qualquer falha pode liberar ou bloquear clientes errado.
import Airtable from "airtable";
import crypto from "crypto";

const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";
/** Tabela do Painel OS (ex.: licences_os). Vazio = não sincroniza bônus. */
const AIRTABLE_TABLE_OS = (process.env.AIRTABLE_TABLE_OS || "").trim();

function base() {
  if (!AIRTABLE_BASE || !AIRTABLE_KEY) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}
function genCode(prefix = "LP") {
  const s = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}-${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8,12)}`;
}

function normSource(v) {
  return String(v || "").trim().toLowerCase();
}

/**
 * Bônus Painel OS: vitalício, source = bonus_metodo.
 * Não cria se já existir compra_os_direta no mesmo e-mail.
 * Idempotente por last_transaction (tx).
 */
async function syncOsBonusOnApprove(b, { email, name, tx, now }) {
  if (!AIRTABLE_TABLE_OS) return { skipped: true, reason: "no_os_table" };

  const emailNorm = email.toString().toLowerCase();
  const emailEsc = emailNorm.replace(/'/g, "\\'");
  const osRecs = await b(AIRTABLE_TABLE_OS)
    .select({ filterByFormula: `LOWER({email})='${emailEsc}'`, maxRecords: 25 })
    .firstPage();

  if (tx && osRecs.some(r => (r.get("last_transaction") || "").toString() === tx)) {
    return { skipped: true, reason: "os_tx_already" };
  }

  if (osRecs.some(r => normSource(r.get("source")) === "compra_os_direta")) {
    return { skipped: true, reason: "already_os_buyer" };
  }

  const bonusRows = osRecs.filter(r => normSource(r.get("source")) === "bonus_metodo");
  const target =
    bonusRows.find(r => !r.get("blocked")) || (bonusRows.length ? bonusRows[0] : null);

  const existingCode = target ? (target.get("code") || "").toString().trim() : "";
  const code = existingCode || genCode("OS");

  const patch = {
    email,
    name: name || (target && target.get("name")) || "",
    code,
    plan_type: "vitalicio",
    blocked: false,
    flagged: false,
    MaxDevices: 5,
    expires_at: null,
    last_transaction: tx || (target && (target.get("last_transaction") || "")) || "",
    last_event_at: now.toISOString(),
    source: "bonus_metodo"
  };

  if (target) {
    await b(AIRTABLE_TABLE_OS).update(target.id, patch);
    return { ok: true, action: "os_bonus_updated", code };
  }

  await b(AIRTABLE_TABLE_OS).create({
    ...patch,
    name: name || "",
    use_count: 0
  });
  return { ok: true, action: "os_bonus_created", code };
}

/** Reembolso/cancelamento Método: bloqueia apenas linhas OS com source bonus_metodo. */
async function syncOsBonusOnNegative(b, { email, tx, now }) {
  if (!AIRTABLE_TABLE_OS) return;

  const emailEsc = email.toString().toLowerCase().replace(/'/g, "\\'");
  const osRecs = await b(AIRTABLE_TABLE_OS)
    .select({ filterByFormula: `LOWER({email})='${emailEsc}'`, maxRecords: 25 })
    .firstPage();

  const bonusRows = osRecs.filter(r => normSource(r.get("source")) === "bonus_metodo");
  for (const r of bonusRows) {
    await b(AIRTABLE_TABLE_OS).update(r.id, {
      blocked: true,
      flagged: true,
      last_transaction: tx || (r.get("last_transaction") || "") || "",
      last_event_at: now.toISOString()
    });
  }
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
  const subStatus = (payload?.data?.subscription?.status || "").toString().toUpperCase();
  if (subStatus === "ACTIVE") return "mensal";
  return "vitalicio"; // fallback: pagamento único
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
    const recs = await b(AIRTABLE_TABLE).select({ filterByFormula: formula, maxRecords: 10 }).firstPage();

    // ⛩️ escolha do alvo: trial7 não bloqueado > primeiro não bloqueado > primeiro
    const chooseTarget = (rows) => {
      if (!rows || !rows.length) return null;
      const trial = rows.find(r => String(r.get("plan_type")||"").toLowerCase()==="trial7" && !r.get("blocked"));
      if (trial) return trial;
      const unblocked = rows.find(r => !r.get("blocked"));
      return unblocked || rows[0];
    };

    // 🪙 idempotência: licença Método já processada com este tx — reenvio Hotmart
    if (tx && recs.length && recs.some(r => (r.get("last_transaction") || "") === tx)) {
      let osSync = null;
      try {
        osSync = await syncOsBonusOnApprove(b, { email, name, tx, now });
      } catch (e) {
        console.error("syncOsBonusOnApprove (noop):", e);
      }
      return res.status(200).json({ ok: true, action: "noop_already_processed", email, tx, os_sync: osSync });
    }

    if (approved) {
      const target = chooseTarget(recs);

      if (target) {
        // atualizar (trial -> pago OU pago -> renovar)
        const existingCode = (target.get("code") || "").toString().trim();
        const code = existingCode ? existingCode : genCode("LP");

        const currentPlan = (target.get("plan_type") || "").toString().toLowerCase();
        const isAlreadyVitalicio = currentPlan === "vitalicio";
        const finalPlan = isAlreadyVitalicio ? "vitalicio" : planTypeComputed;

        const fieldsToUpdate = {
          code,
          plan_type: finalPlan,
          name: name || target.get("name") || "",
          blocked: false,               // garante desbloqueio
          flagged: false,               // limpa alerta ao virar pago/renovar
          MaxDevices: 5,                // padrão unificado
          // preserva DeviceCount/Devices/DeviceIDs manuais
          last_transaction: tx || target.get("last_transaction") || "",
          last_event_at: now.toISOString()
        };

        if (finalPlan === "mensal") {
          // estende +30 dias a partir do maior entre hoje e a expiração atual
          const prev = target.get("expires_at") ? new Date(target.get("expires_at")) : now;
          const baseDate = prev > now ? prev : now;
          fieldsToUpdate.expires_at = toDateOnly(addDays(baseDate, 30));
        } else {
          // vitalício: remove expiração
          fieldsToUpdate.expires_at = null;
        }

        await b(AIRTABLE_TABLE).update(target.id, fieldsToUpdate);
        let osSync = null;
        try {
          osSync = await syncOsBonusOnApprove(b, { email, name, tx, now });
        } catch (e) {
          console.error("syncOsBonusOnApprove:", e);
        }
        return res.status(200).json({
          ok: true,
          action: "updated",
          email,
          code,
          plan_type: finalPlan,
          expires_at: fieldsToUpdate.expires_at || "",
          tx,
          os_sync: osSync
        });
      } else {
        // criar (não havia trial/registro pra este e-mail)
        const code = genCode("LP");
        const fields = {
          email,
          name: name || "",
          code,
          plan_type: planTypeComputed,
          use_count: 0,
          blocked: false,
          flagged: false,
          MaxDevices: 5, // padrão unificado
          last_transaction: tx || "",
          last_event_at: now.toISOString()
        };
        if (planTypeComputed === "mensal") {
          fields.expires_at = toDateOnly(addDays(now, 30)); // YYYY-MM-DD
        } else {
          fields.expires_at = null; // vitalício sem expiração
        }

        await b(AIRTABLE_TABLE).create(fields);
        let osSync = null;
        try {
          osSync = await syncOsBonusOnApprove(b, { email, name, tx, now });
        } catch (e) {
          console.error("syncOsBonusOnApprove:", e);
        }
        return res.status(200).json({
          ok: true,
          action: "created",
          email,
          code,
          plan_type: planTypeComputed,
          expires_at: fields.expires_at || "",
          tx,
          os_sync: osSync
        });
      }
    }

    if (negative) {
      // cancelar/refund/chargeback => bloqueia e sinaliza
      if (recs.length) {
        const target = chooseTarget(recs);
        await b(AIRTABLE_TABLE).update(target.id, {
          blocked: true,
          flagged: true,
          last_transaction: tx || target.get("last_transaction") || "",
          last_event_at: now.toISOString()
        });
      }
      try {
        await syncOsBonusOnNegative(b, { email, tx, now });
      } catch (e) {
        console.error("syncOsBonusOnNegative:", e);
      }
      return res.status(200).json({ ok: true, action: "deactivated_blocked", email, event, status, tx });
    }

    return res.status(200).json({ ok:true, msg:"event ignored", event, status, tx });
  } catch (e) {
    console.error("webhook-hotmart error:", e);
    return res.status(200).json({ ok:true, msg:"ack with error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
