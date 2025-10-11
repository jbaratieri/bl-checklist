export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Método não permitido." });
  }

  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, msg: "Código ausente." });

    const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
    const AIRTABLE_KEY = process.env.AIRTABLE_KEY;
    const TABLE = "licenses";

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const now = new Date();

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?filterByFormula={code}='${code}'`;

    const resAirtable = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
    });

    const data = await resAirtable.json();
    console.log("[Airtable resposta]:", JSON.stringify(data));

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ ok: false, msg: "Código inválido." });
    }

    const rec = data.records[0];
    const f = rec.fields;

    const plan = f.plan_type || "mensal";
    const expDate = f.expires_at ? new Date(f.expires_at) : null;
    const expired = plan !== "vitalício" && expDate && now > expDate;

    if (expired) {
      return res.status(403).json({
        ok: false,
        msg: "Código expirado. Renove sua assinatura.",
      });
    }

    // Logs e controle
    const oldHistory = (f.ip_history || "").split(",").filter(Boolean);
    const ipSet = new Set(oldHistory);
    ipSet.add(ip);
    const ipList = Array.from(ipSet);
    const distinctCount = ipList.length;
    const flagged = distinctCount >= 3;
    const useCount = (f.use_count || 0) + 1;

    // Atualiza registro no Airtable
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
    await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          last_ip: ip,
          last_used: now.toISOString(),
          use_count: useCount,
          ip_history: ipList.join(","),
          flagged,
          last_ua: ua,
        },
      }),
    });

    const msg =
      plan === "vitalício"
        ? "✅ Acesso vitalício confirmado."
        : `🪶 Acesso válido até ${expDate?.toLocaleDateString("pt-BR")}.`;

    return res.status(200).json({
      ok: true,
      msg,
      plan,
      expires: expDate || null,
      ip,
      distinct_ips: distinctCount,
      flagged,
    });
  } catch (err) {
    console.error("[Erro interno validate.js]:", err);
    return res.status(500).json({ ok: false, msg: "Erro interno no servidor." });
  }
}
