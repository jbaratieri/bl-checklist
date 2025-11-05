// /api/trial-create.js (fix: não enviar expires_at vazio)
import Airtable from "airtable";

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_KEY   = process.env.AIRTABLE_KEY   || process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || "licenses";

function getBase() {
  if (!AIRTABLE_KEY || !AIRTABLE_BASE) return null;
  return new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);
}

function genCode() {
  const seg = () => Math.random().toString(36).slice(2,6).toUpperCase();
  return `LP-T7-${seg()}-${seg()}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, msg:'method_not_allowed' });
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, msg:'email_required' });

    const base = getBase();
    if (!base) {
      // modo simulado
      return res.status(200).json({ ok:true, code: genCode(), simulated:true });
    }

    // Reaproveita trial existente para o e-mail (não bloqueado)
    const found = await base(AIRTABLE_TABLE).select({
      maxRecords: 1,
      filterByFormula: `AND({email}="${email}", {plan_type}="trial7", NOT({blocked}))`
    }).all();

    if (found.length) {
      const r = found[0];
      const code = r.get('code');
      return res.status(200).json({ ok:true, code, msg:'already' });
    }

    // Cria novo trial — NÃO enviar expires_at vazio
    const code = genCode();
    await base(AIRTABLE_TABLE).create({
      code,
      email,
      plan_type: 'trial7',
      blocked: false,
      MaxDevices: 2,    // seus campos numéricos
      DeviceCount: 0    // idem
      // expires_at: (omitido; será definido na 1ª validação)
    });

    return res.status(200).json({ ok:true, code });
  } catch (e) {
    console.error('trial-create error:', e?.message || e);
    // Dica: por segurança não exponho a msg completa, mas deixo um código
    return res.status(200).json({ ok:false, msg:'airtable_error' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
