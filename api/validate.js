// api/validate.js — Validação de licença com controle por deviceId (v2 — trial livre + flagged não bloqueia)
// Políticas:
// - Conta por deviceId (não por IP)
// - TRIAL (plan_type=trial7): não conta devices; acesso ok (se não blocked/expired)
// - PAGOS (mensal/vitalício):
//     * MaxDevices padrão = 2 (duro)
//     * Soft-cap 3: permite 3º device e marca flagged=true
//     * 4º device em diante: nega (403)
// - Auto-replace se houver device "antigo" (> 90 dias sem uso)

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
    const nowISO = now.toISOString();

    // Helpers
    const daysBetween = (a, b) => {
      const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
      return Math.floor(ms / (1000 * 60 * 60 * 24));
    };

    const STALE_DAYS = 90;   // se lastSeen > 90 dias, pode substituir
    const SOFT_CAP   = 3;    // até 3 devices no total (o 3º seta flagged)
    const DEFAULT_MAX_DEVICES = 2;

    // Busca a licença
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
        server_time: nowISO,
      });
    }

    const data = await resAirtable.json();
    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ ok: false, msg: "Código inválido.", server_time: nowISO });
    }

    const rec = data.records[0];
    const f   = rec.fields || {};

    // Plano e expiração
    const planNorm = (f.plan_type || "mensal").toString().toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const isVitalicio = planNorm === "vitalicio";

    const expDate = f.expires_at ? new Date(f.expires_at) : null;
    const expired = !isVitalicio && expDate && now > expDate;

    // 🔒 Bloqueio duro
    if (f.blocked === true) {
      return res.status(403).json({
        ok: false, msg: "Acesso bloqueado. Contate o suporte.", server_time: nowISO
      });
    }

    // ⏳ Expirado (vale para trial7/mensal)
    if (expired) {
      return res.status(403).json({
        ok: false, msg: "Código expirado. Renove sua assinatura.", server_time: nowISO
      });
    }

    // Auditoria de IP (não bloqueia, só registra)
    const oldHistory = (f.ip_history || "").split(",").map(s => s.trim()).filter(Boolean);
    const ipSet = new Set(oldHistory);
    ipSet.add(ip);
    const ipList = Array.from(ipSet).slice(-20);
    const distinctCount = ipList.length;

    // Heurística antiga de auto-flag por muitos IPs (apenas sinaliza)
    const autoFlagIPs = distinctCount >= 7;

    // ===== TRIAL: não conta devices; apenas registra uso e retorna OK
    if (planNorm === "trial7") {
      const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
      await fetch(patchUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          fields: {
            last_ip: ip,
            last_used: nowISO,
            ip_history: ipList.join(","),
            last_ua: ua,
            // ⚠️ NÃO mexe em DeviceCount / Devices / DeviceIDs no trial
            flagged: !!f.flagged || autoFlagIPs // apenas marca se quiser sinalizar IP incomum
          },
        }),
      });

      return res.status(200).json({
        ok: true,
        msg: "✅ Teste ativo.",
        plan: "trial7",
        expires: expDate || null,
        ip,
        distinct_ips: distinctCount,
        flagged: !!f.flagged || autoFlagIPs,
        deviceCount: Number(f.DeviceCount || 0) || 0,
        maxDevices: Number(f.MaxDevices || 0) || DEFAULT_MAX_DEVICES,
        server_time: nowISO,
        note: "trial_does_not_count_devices"
      });
    }

    // ===== PAGOS (mensal/vitalício): aplica política de devices
    function parseDevicesField(devField){
      if (!devField) return [];
      if (Array.isArray(devField)) return devField;
      if (typeof devField === "string") {
        try { return JSON.parse(devField); } catch { return []; }
      }
      return [];
    }

    const devices = parseDevicesField(f.Devices); // [{ deviceId, firstSeen, lastSeen, lastIp, userAgent }]
    let maxDevices = Number(f.MaxDevices || DEFAULT_MAX_DEVICES);
    if (!Number.isFinite(maxDevices) || maxDevices < 1) maxDevices = DEFAULT_MAX_DEVICES;

    let updatedDevices = devices.slice();
    let deviceIDs = updatedDevices.map(d => d.deviceId).filter(Boolean);
    let deviceCountStored = Number(f.DeviceCount || updatedDevices.length || 0);
    let flagged = !!f.flagged || autoFlagIPs;

    // Lógica principal: prioriza deviceId
    let isNewActivation = false;
    let replacedDeviceId = null;

    if (deviceId && typeof deviceId === "string" && deviceId.trim()) {
      const trimmedId = deviceId.trim();
      const idx = updatedDevices.findIndex(d => d.deviceId === trimmedId);

      if (idx >= 0) {
        // Mesmo aparelho → apenas atualizar metadata
        updatedDevices[idx].lastSeen = nowISO;
        updatedDevices[idx].lastIp   = ip;
        updatedDevices[idx].userAgent = ua || updatedDevices[idx].userAgent || "";
      } else {
        // Novo aparelho tentando ativar
        if (updatedDevices.length < maxDevices) {
          // Dentro do limite "duro" (<=2)
          updatedDevices.push({
            deviceId: trimmedId,
            firstSeen: nowISO,
            lastSeen: nowISO,
            lastIp: ip,
            userAgent: ua || ""
          });
          isNewActivation = true;
        } else {
          // Limite atingido (>= maxDevices)
          // 1) tenta auto-replace por stale (> STALE_DAYS sem uso)
          const staleIndex = updatedDevices.findIndex(d => {
            const last = d.lastSeen || d.firstSeen || nowISO;
            return daysBetween(last, nowISO) > STALE_DAYS;
          });

          if (staleIndex >= 0) {
            // substitui o stale
            replacedDeviceId = updatedDevices[staleIndex].deviceId || null;
            updatedDevices.splice(staleIndex, 1, {
              deviceId: trimmedId,
              firstSeen: nowISO,
              lastSeen: nowISO,
              lastIp: ip,
              userAgent: ua || ""
            });
            // substituição legítima não precisa marcar flag adicional
            isNewActivation = true;
          } else {
            // 2) soft-cap: permite 3º device com flagged=true
            if (updatedDevices.length < SOFT_CAP) {
              updatedDevices.push({
                deviceId: trimmedId,
                firstSeen: nowISO,
                lastSeen: nowISO,
                lastIp: ip,
                userAgent: ua || ""
              });
              isNewActivation = true;
              flagged = true; // marcou tolerância
            } else {
              // 3) hard deny a partir do 4º
              const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
              await fetch(patchUrl, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                  fields: {
                    last_ip: ip,
                    last_used: nowISO,
                    ip_history: ipList.join(","),
                    last_ua: ua,
                    flagged: true // sinaliza tentativa de 4º device
                  },
                }),
              });

              return res.status(403).json({
                ok: false,
                msg: "Limite de dispositivos atingido para esta licença.",
                plan: isVitalicio ? "vitalicio" : "mensal",
                deviceCount: updatedDevices.length,
                maxDevices,
                server_time: nowISO,
              });
            }
          }
        }
      }
    } else {
      // Sem deviceId (cliente muito antigo): mantém compat — conta como uso
      isNewActivation = true;
    }

    // use_count: só incrementa em nova ativação (novo device) ou substituição
    const previousUseCount = Number(f.use_count || 0);
    const newUseCount = isNewActivation ? previousUseCount + 1 : previousUseCount;

    // Atualiza DeviceCount/IDs
    deviceIDs = updatedDevices.map(d => d.deviceId).filter(Boolean);
    deviceCountStored = updatedDevices.length;

    // Sinal de abuso por churn: 3 devices criados em 30 dias ⇒ flagged
    try {
      const createdLast30 = updatedDevices.filter(d => daysBetween(d.firstSeen || nowISO, nowISO) <= 30).length;
      if (createdLast30 >= 3) flagged = true;
    } catch { /* ignore */ }

    // Persistir
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`;
    await fetch(patchUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        fields: {
          last_ip: ip,
          last_used: nowISO,
          use_count: newUseCount,
          ip_history: ipList.join(","),
          last_ua: ua,
          flagged,
          DeviceCount: deviceCountStored,
          Devices: JSON.stringify(updatedDevices),
          DeviceIDs: deviceIDs.join(","),
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
      flagged,
      deviceReplaced: replacedDeviceId || null,
      deviceCount: deviceCountStored,
      maxDevices,
      server_time: nowISO,
    });
  } catch (err) {
    console.error("[Erro interno validate.js]:", err);
    return res.status(500).json({
      ok: false, msg: "Erro interno no servidor.", server_time: new Date().toISOString()
    });
  }
}
