// /api/trial-create.js
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
      // modo simulado (sem Airtable config)
      return res.status(200).json({ ok:true, code: genCode(), simulated:true });
    }

    // Se já existe trial para o e-mail (não bloqueado), reaproveita o código
    // (mesmo com expires_at já setado — usuário pode ter perdido o código)
    const found = await base(AIRTABLE_TABLE).select({
      maxRecords: 1,
      filterByFormula: `AND({email}="${email}", {plan_type}="trial7", NOT({blocked}))`
    }).all();

    if (found.length) {
      const r = found[0];
      const code = r.get('code');
      return res.status(200).json({ ok:true, code, msg:'already' });
    }

    // Cria novo trial
    const code = genCode();
    await base(AIRTABLE_TABLE).create({
      code,
      email,
      plan_type: 'trial7',
      blocked: false,
      MaxDevices: 2,       // seus nomes de campos
      DeviceCount: 0,      // idem
      // created_at: (se for "Created time", não setar aqui)
      expires_at: ''       // definido na primeira ativação
    });

    return res.status(200).json({ ok:true, code });
  } catch (e) {
    console.error('trial-create error:', e);
    return res.status(200).json({ ok:false, msg:'server_error' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
