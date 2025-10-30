// api/validate.js — Validação de licença (robusto) — atualizado para deviceId
export default async function handler(req, res) {
  // respostas desta rota não devem ser cacheadas
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
    const AIRTABLE_KEY = process.env.AIRTABLE_KEY;
    const TABLE = "licenses";

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const now = new Date();

    // filtro seguro (escapa aspas simples) + cache-buster + maxRecords=1
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
      return res.status(404).json({
        ok: false,
        msg: "Código inválido.",
        server_time: now.toISOString(),
      });
    }

    const rec = data.records[0];
    const f = rec.fields || {};

    // normaliza plano (sem acento, minúsculo)
    const planNorm = (f.plan_type || "mensal")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
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

    // ---------- Preparação de campos / parsing ----------
    // ip_history antigo (string comma) -> array único
    const oldHistory = (f.ip_history || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // dedup + adiciona IP atual
    const ipSet = new Set(oldHistory);
    ipSet.add(ip);

    // HIGIENE: mantém só os ÚLTIMOS 20 IPs distintos
    const ipList = Array.from(ipSet).slice(-20);

    // parse Devices (pode ser JSON string ou já array)
    function parseDevicesField(devField) {
      if (!devField) return [];
      if (Array.isArray(devField)) return devField;
      if (typeof devField === "string") {
        try {
          return JSON.parse(devField);
        } catch (e) {
          // talvez seja uma lista de IDs simples -> tratar como vazio estrutural
          return [];
        }
      }
      return [];
    }

    const devices = parseDevicesField(f.Devices); // array de objetos { deviceId, firstSeen, lastSeen, lastIp, userAgent }
    const maxDevices = Number(f.MaxDevices || 1);
    const deviceCountStored = Number(f.DeviceCount || devices.length || 0);

    // Distinct IPs para auto-flag (mesma lógica que antes)
    const distinctCount = ipList.length;
    const autoFlagged = distinctCount >= 5;

    // ---------- Nova lógica: priorizar deviceId quando fornecido ----------
    let shouldIncrementUseCount = false; // decide se vamos aumentar use_count
    let updatedDevices = devices.slice(); // cópia para alteração
    let updatedDeviceCount = deviceCountStored;
    let deniedBecauseMaxDevices = false;

    if (deviceId && typeof deviceId === "string" && deviceId.trim()) {
      // cliente enviou deviceId -> usar device-based logic
      const trimmedId = deviceId.trim();
      const existingIndex = updatedDevices.findIndex((d) => d.deviceId === trimmedId);

      if (existingIndex >= 0) {
        // dispositivo já registrado -> apenas atualizar metadata (não incrementa use_count)
        updatedDevices[existingIndex].lastSeen = now.toISOString();
        updatedDevices[existingIndex].lastIp = ip;
        updatedDevices[existingIndex].userAgent = ua || updatedDevices[existingIndex].userAgent || "";
        // não incrementa use_count nem DeviceCount
      } else {
        // novo device tentando ativar
        if (updatedDevices.length >= maxDevices) {
          // limite atingido -> negar
          deniedBecauseMaxDevices = true;
          // registramos o acesso negado (não alteramos DeviceCount nem Devices)
        } else {
          // aceita novo device -> adicionar e incrementar DeviceCount
          const newDevice = {
            deviceId: trimmedId,
            firstSeen: now.toISOString(),
            lastSeen: now.toISOString(),
            lastIp: ip,
            userAgent: ua || "",
          };
          updatedDevices.push(newDevice);
          updatedDeviceCount = updatedDevices.length;
          // incrementa use_count porque é uma nova ativação (opcional: considera-se "uso")
          shouldIncrementUseCount = true;
        }
      }
    } else {
      // cliente NÃO enviou deviceId -> fallback ao comportamento legado (IP-based)
      // manter compatibilidade: incrementa use_count como antes
      shouldIncrementUseCount = true;
    }

    // calcula novo use_count (só incrementa quando shouldIncrementUseCount true)
    const previousUseCount = Number(f.use_count || 0);
    const newUseCount = shouldIncrementUseCount ? previousUseCount + 1 : previousUseCount;

    // DeviceIDs summary (string)
    const deviceIDs = updatedDevices.map((d) => d.deviceId).filter(Boolean).join(",");

    // ---------- Se negado por limite, atualizar somente logs e responder 403 ----------
    if (deniedBecauseMaxDevices) {
      // atualiza somente logs (ip_history, last_ip, last_used, last_ua) e flagged (mantém manual/auto)
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

    // ---------- Atualiza registro no Airtable com o novo estado ----------
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
    const patchBodyFields = {
      last_ip: ip,
      last_used: now.toISOString(),
      use_count: newUseCount,
      ip_history: ipList.join(","),
      flagged: autoFlagged || !!f.flagged,
      last_ua: ua,
      // manter/atualizar Device-related fields apenas se houver mudanças
      DeviceCount: updatedDeviceCount,
      Devices: JSON.stringify(updatedDevices),
      DeviceIDs: deviceIDs,
    };

    await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ fields: patchBodyFields }),
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
    return res.status(500).json({
      ok: false,
      msg: "Erro interno no servidor.",
      server_time: new Date().toISOString(),
    });
  }
}
