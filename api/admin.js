// api/admin.js — Painel Administrativo LuthierPro (v1.8)
// - GET sem cache (no-store) e com cache-buster para Airtable
// - Ordenado por created_at desc, fallback code
export default async function handler(req, res) {
  try {
    const key = req.query.key;
    if (!key || key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    const base = process.env.AIRTABLE_BASE;
    const token = process.env.AIRTABLE_KEY;
    const table = "licenses";

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (req.method === "GET") {
      // força não cachear essa resposta
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");

      const ts = Date.now(); // cache-buster
      const url =
        `https://api.airtable.com/v0/${base}/${table}` +
        `?sort[0][field]=created_at&sort[0][direction]=desc` +
        `&sort[1][field]=code` +
        `&ts=${ts}`;

      try {
        const r = await fetch(url, { headers, cache: "no-store" });
        const text = await r.text();

        if (!r.ok) {
          // erro do Airtable / upstream
          let payload;
          try { payload = JSON.parse(text); } catch { payload = {}; }
          return res.status(502).json({
            ok: false,
            msg: "Falha ao consultar a base de licenças. Tente novamente.",
            error: payload?.error?.message || `Upstream ${r.status}`,
          });
        }

        let data;
        try { data = JSON.parse(text); } catch {
          return res.status(502).json({
            ok: false,
            msg: "Resposta inesperada do serviço de dados.",
            error: "Invalid JSON from upstream",
          });
        }

        return res.status(200).json({ ok: true, records: data.records || [] });
      } catch (e) {
        return res.status(502).json({
          ok: false,
          msg: "Serviço temporariamente indisponível. Tente novamente.",
          error: e.message,
        });
      }
    }


    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ ok: false, msg: "ID ausente" });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}/${id}`, {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      const result = await r.json();
      // resposta também marcada como não-cacheável
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      return res.status(200).json({ ok: true, result });
    }

    if (req.method === "POST") {
      const { code, plan, expires_at, flagged, name, email } = req.body;
      if (!code) return res.status(400).json({ ok: false, msg: "Código obrigatório" });
      if (!name) return res.status(400).json({ ok: false, msg: "Nome obrigatório" });

      // 🔎 checa duplicidade de code no Airtable
      try {
        const formula = `({code}='${String(code).replace(/'/g, "\\'")}')`;
        const dupUrl = `https://api.airtable.com/v0/${base}/${table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
        const dupRes = await fetch(dupUrl, { headers, cache: "no-store" });
        const dupData = await dupRes.json();
        if (dupData.records && dupData.records.length > 0) {
          return res.status(409).json({ ok: false, msg: "Código já existe. Use outro código." });
        }
      } catch (e) {
        return res.status(502).json({ ok: false, msg: "Falha ao verificar duplicidade.", error: e.message });
      }

      // 🔤 normaliza plano e aplica regra de negócio
      const planValueNorm = (plan || "mensal")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu, ""); // "vitalício" -> "vitalicio"
      const isVitalicio = planValueNorm === "vitalicio";

      // ✅ mensal DEVE ter data (backend guard)
      if (!isVitalicio && (!expires_at || String(expires_at).trim() === "")) {
        return res.status(400).json({ ok: false, msg: "Para plano mensal, informe a data de validade." });
      }

      const body = {
        fields: {
          code,
          name,
          email,
          plan_type: planValueNorm,                                     // "mensal" | "vitalicio"
          expires_at: isVitalicio ? null : String(expires_at).trim(),   // vitalício -> null
          flagged: !!flagged,
        },
      };

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}?ts=${Date.now()}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const result = await r.json();

      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");

      if (!r.ok) {
        return res.status(500).json({
          ok: false,
          msg: "Erro ao criar licença no Airtable",
          error: result.error?.message || result,
        });
      }

      return res.status(200).json({ ok: true, result });
    }



    return res.status(405).json({ ok: false, msg: "Método não permitido" });
  } catch (err) {
    console.error("💥 Erro no admin API:", err);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    return res
      .status(500)
      .json({ ok: false, msg: "Erro interno no servidor", detail: err.message });
  }
}
