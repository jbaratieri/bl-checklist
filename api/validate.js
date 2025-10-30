// api/validate.js — Validação de licença com controle por deviceId
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "Método não permitido." });
  }

  try {
    const { code, deviceId } = req.body || {};
    if (!code) {
      return res.status(400).json({
        ok: false,
        msg: "Código ausente.",
        server_time: new Date().toISOString(),
      });
    }

    const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
    const AIRTABLE_KEY  = process.env.AIRTABLE_KEY;
    const TABLE = "licenses";

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const now = new Date();

    const formula = `({code}='${String(code).replace(/'/g, "\\'")}')`;
    const url =
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}` +
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
    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ ok: false, msg: "Código inválido.", server_time: now.toISOString() });
    }

    const rec = data.records[0];
    const f   = rec.fields || {};

    // plano e expiração
    const planNorm = (f.plan_type || "mensal").toString().toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const isVitalicio = planNorm === "vitalicio";

    const expDate = f.expires_at ? new Date(f.expires_at) : null;
    const expired = !isVitalicio && expDate && now > expDate;

    if (f.flagged === true) {
      return res.status(403).json({ ok: false, msg: "Acesso bloqueado. Contate o suporte.", server_time: now.toISOString() });
    }
    if (expired) {
      return res.status(403).json({ ok: false, msg: "Código expirado. Renove sua assinatura.", server_time: now.toISOString() });
    }

    // ip_history (mantém para auditoria; não decide mais por IP)
    const oldHistory = (f.ip_history || "").split(",").map(s => s.trim()).filter(Boolean);
    const ipSet = new Set(oldHistory);
    ipSet.add(ip);
    const ipList = Array.from(ipSet).slice(-20);
    const distinctCount = ipList.length;
    const autoFlagged = distinctCount >= 5; // mantém heurística, se quiser remova/ajuste

    // Parse dos campos de device
    function parseDevicesField(devField){
      if (!devField) return [];
      if (Array.isArray(devField)) return devField;
      if (typeof devField === "string") {
        try { return JSON.parse(devField); } catch { return []; }
      }
      return [];
    }

    const devices = parseDevicesField(f.Devices); // [{ deviceId, firstSeen, lastSeen, lastIp, userAgent }]
    const maxDevices = Number(f.MaxDevices || 1);
    const deviceCountStored = Number(f.DeviceCount || devices.length || 0);

    // Lógica principal: prioriza deviceId
    let shouldIncrementUseCount = false; // só incrementa em nova ativação
    let updatedDevices = devices.slice();
    let updatedDeviceCount = deviceCountStored;
    let deniedBecauseMaxDevices = false;

    if (deviceId && typeof deviceId === "string" && deviceId.trim()) {
      const trimmedId = deviceId.trim();
      const idx = updatedDevices.findIndex(d => d.deviceId === trimmedId);

      if (idx >= 0) {
        // mesmo aparelho → atualiza metadata; NÃO incrementa use_count
        updatedDevices[idx].lastSeen = now.toISOString();
        updatedDevices[idx].lastIp = ip;
        updatedDevices[idx].userAgent = ua || updatedDevices[idx].userAgent || "";
      } else {
        // novo aparelho
        if (updatedDevices.length >= maxDevices) {
          deniedBecauseMaxDevices = true;
        } else {
          updatedDevices.push({
            deviceId: trimmedId,
            firstSeen: now.toISOString(),
            lastSeen: now.toISOString(),
            lastIp: ip,
            userAgent: ua || ""
          });
          updatedDeviceCount = updatedDevices.length;
          shouldIncrementUseCount = true; // só ativa em novo device
        }
      }
    } else {
      // cliente antigo sem deviceId → compat (opcional: mantenha até todos enviarem deviceId)
      shouldIncrementUseCount = true;
    }

    const previousUseCount = Number(f.use_count || 0);
    const newUseCount = shouldIncrementUseCount ? previousUseCount + 1 : previousUseCount;
    const deviceIDs = updatedDevices.map(d => d.deviceId).filter(Boolean).join(",");

    // Se excedeu limite de aparelhos, apenas loga e nega
    if (deniedBecauseMaxDevices) {
      const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
      await fetch(patchUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          fields: {
            last_ip: ip,
            last_used: now.toISOString(),
            use_count: newUseCount,
            ip_history: ipList.join(","),
            flagged: autoFlagged || !!f.flagged,
            last_ua: ua,
          },
        }),
      });

      return res.status(403).json({
        ok: false,
        msg: "Limite de dispositivos atingido para esta licença.",
        plan: isVitalicio ? "vitalicio" : "mensal",
        deviceCount: deviceCountStored,
        maxDevices,
        server_time: now.toISOString(),
      });
    }

    // Atualiza estado normal
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
    await fetch(patchUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        fields: {
          last_ip: ip,
          last_used: now.toISOString(),
          use_count: newUseCount,
          ip_history: ipList.join(","),
          flagged: autoFlagged || !!f.flagged,
          last_ua: ua,
          DeviceCount: updatedDeviceCount,
          Devices: JSON.stringify(updatedDevices),
          DeviceIDs: deviceIDs,
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
      deviceCount: updatedDeviceCount,
      maxDevices,
      server_time: now.toISOString(),
    });
  } catch (err) {
    console.error("[Erro interno validate.js]:", err);
    return res.status(500).json({ ok: false, msg: "Erro interno no servidor.", server_time: new Date().toISOString() });
  }
}
