// api/validate.js — Validação de licença (robusto)
export default async function handler(req, res) {
  // respostas desta rota não devem ser cacheadas
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Método não permitido." });
  }

  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ ok: false, msg: "Código ausente.", server_time: new Date().toISOString() });
    }

    const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
    const AIRTABLE_KEY  = process.env.AIRTABLE_KEY;
    const TABLE = "licenses";

    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || req.socket?.remoteAddress
      || "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const now = new Date();

    // filtro seguro (escapa aspas simples) + cache-buster + maxRecords=1
    const formula = `({code}='${String(code).replace(/'/g, "\\'")}')`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}` +
                `?filterByFormula=${encodeURIComponent(formula)}` +
                `&maxRecords=1&ts=${Date.now()}`;

    const resAirtable = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
      cache: "no-store",
    });

    if (!resAirtable.ok) {
      const text = await resAirtable.text();
      return res.status(502).json({
        ok: false,
        msg: "Falha ao consultar a base de licenças.",
        error: text,
        server_time: now.toISOString(),
      });
    }

    const data = await resAirtable.json();
    // console.log("[Airtable resposta]:", JSON.stringify(data));

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ ok: false, msg: "Código inválido.", server_time: now.toISOString() });
    }

    const rec = data.records[0];
    const f   = rec.fields || {};

    // normaliza plano (sem acento, minúsculo)
    const planNorm = (f.plan_type || "mensal")
      .toString()
      .toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, ""); // "vitalício" -> "vitalicio"
    const isVitalicio = planNorm === "vitalicio";

    const expDate = f.expires_at ? new Date(f.expires_at) : null;
    const expired = !isVitalicio && expDate && now > expDate;

    // bloqueio por flag manual
    if (f.flagged === true) {
      return res.status(403).json({
        ok: false,
        msg: "Acesso bloqueado. Contate o suporte.",
        server_time: now.toISOString(),
      });
    }

    // bloqueio por expiração
    if (expired) {
      return res.status(403).json({
        ok: false,
        msg: "Código expirado. Renove sua assinatura.",
        server_time: now.toISOString(),
      });
    }

    // ---------- Logs e controle ----------
    const oldHistory = (f.ip_history || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    // dedup + adiciona IP atual
    const ipSet = new Set(oldHistory);
    ipSet.add(ip);

    // HIGIENE: mantém só os ÚLTIMOS 20 IPs distintos
    const ipList = Array.from(ipSet).slice(-20);

    const distinctCount = ipList.length;
    // auto-flag a partir de 5 IPs distintos
    const autoFlagged = distinctCount >= 5;
    const useCount    = (f.use_count || 0) + 1;

    // Atualiza registro no Airtable
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
    await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        fields: {
          last_ip: ip,
          last_used: now.toISOString(),
          use_count: useCount,
          ip_history: ipList.join(","),
          flagged: autoFlagged || !!f.flagged, // preserva flag manual
          last_ua: ua,
        },
      }),
    });

    const msg = isVitalicio
      ? "✅ Acesso vitalício confirmado."
      : `🪶 Acesso válido até ${expDate ? expDate.toLocaleDateString("pt-BR") : "—"}.`;

    return res.status(200).json({
      ok: true,
      msg,
      plan: isVitalicio ? "vitalicio" : "mensal",
      expires: expDate || null,
      ip,
      distinct_ips: distinctCount,
      flagged: autoFlagged || !!f.flagged,
      server_time: now.toISOString(),
    });
  } catch (err) {
    console.error("[Erro interno validate.js]:", err);
    return res.status(500).json({ ok: false, msg: "Erro interno no servidor.", server_time: new Date().toISOString() });
  }
}
