// /api/check-license.js — valida licença usando o campo `code` (fallback para `license_key`)
// Regras:
// - flagged = alerta (NÃO bloqueia)
// - blocked = bloqueio duro (bloqueia)
// - vitalício ignora validade
// - trial7: define expires_at = hoje+7 na 1ª validação

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

function toDateOnly(d) {
  return new Date(d).toISOString().slice(0,10); // YYYY-MM-DD
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
        ok: true,
        simulated: true,
        plan_type: "mensal",
        expires_at: toDateOnly(Date.now() + 3*24*3600*1000),
        grace_days: 5
      });
    }

    // Procura por `code` primeiro; se não achar, tenta `license_key` (compat)
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

    const r          = recs[0];
    const plan_type  = String(r.get("plan_type") || "").toLowerCase(); // "mensal" | "vitalicio" | "trial7"
    let   expires_at = r.get("expires_at"); // YYYY-MM-DD (Date-only)
    const flagged    = !!r.get("flagged");  // alerta, não bloqueia
    const blocked    = !!r.get("blocked");  // 🔒 bloqueio duro

    // 🔓 trial7: ativar validade na 1ª validação (se ainda sem data)
    if (plan_type === "trial7" && !expires_at) {
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const endStr = toDateOnly(end);
      try {
        await base(AIRTABLE_TABLE).update(r.id, { expires_at: endStr });
        expires_at = endStr; // importante atualizar a variável local
      } catch (e) {
        // se falhar a atualização, segue sem data e cairá como expired abaixo
        console.warn("trial7 activate failed:", e);
      }
    }

    // Bloqueio duro
    if (blocked) {
      return res.status(200).json({
        ok: false,
        msg: "blocked",
        plan_type,
        expires_at: expires_at || null,
        flagged
      });
    }

    // Vitalício ignora validade
    if (plan_type === "vitalicio") {
      return res.status(200).json({
        ok: true,
        plan_type: "vitalicio",
        expires_at: null,
        grace_days: 5,
        flagged
      });
    }

    // Mensal/Trial: expiração
    if (!isNotExpired(expires_at)) {
      return res.status(200).json({
        ok: false,
        msg: "expired",
        plan_type: plan_type || "mensal",
        expires_at: expires_at || null,
        flagged
      });
    }

    // OK → mesmo que flagged=true
    return res.status(200).json({
      ok: true,
      plan_type: plan_type || "mensal",
      expires_at,         // string YYYY-MM-DD
      grace_days: 5,
      flagged
    });

  } catch (e) {
    console.error("check-license error:", e);
    return res.status(200).json({ ok: false, msg: "server_error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
