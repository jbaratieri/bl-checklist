// api/validate.js — LuthierPro License Validator (Vercel Serverless)
const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
const AIRTABLE_KEY  = process.env.AIRTABLE_KEY;
const TABLE         = 'licenses';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, msg: 'Código obrigatório.' });

    // 1️⃣ Busca o registro pelo código
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(TABLE)}?filterByFormula={code}='${code}'&maxRecords=1`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }});
    const data = await r.json();
    const rec = data.records && data.records[0];
    if (!rec) return res.status(404).json({ ok: false, msg: 'Código inválido.' });

    const f = rec.fields;
    const now = new Date();

    // 2️⃣ Verifica expiração
    if (f.plan_type !== 'vitalício' && f.expires_at && new Date(f.expires_at) < now) {
      return res.status(403).json({ ok: false, msg: 'Assinatura expirada.' });
    }

    // 3️⃣ Telemetria leve (registra IP e data)
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const useCount = (f.use_count || 0) + 1;
    const flagged = useCount >= 3 ? true : false;

    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${rec.id}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          last_ip: ip,
          last_used: now.toISOString(),
          use_count: useCount,
          flagged
        }
      })
    });

    // 4️⃣ Retorna resultado
    return res.json({
      ok: true,
      msg: f.plan_type === 'vitalício'
        ? '✅ Acesso vitalício confirmado.'
        : `🪶 Acesso válido até ${new Date(f.expires_at).toLocaleDateString('pt-BR')}.`,
      plan: f.plan_type,
      expires: f.expires_at || null
    });

  } catch (err) {
    console.error('Erro validate:', err);
    return res.status(500).json({ ok: false, msg: 'Erro no servidor.' });
  }
}
