// api/admin.js — Painel Administrativo LuthierPro (v1.7)
// - plan_type TEXT
// - cria com expires_at = null quando vitalício ou vazio
// - GET ordenado por created_at desc (fallback code)

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

    // 📄 Listar (mais recentes primeiro)
    if (req.method === "GET") {
      const url =
        `https://api.airtable.com/v0/${base}/${table}` +
        `?sort[0][field]=created_at&sort[0][direction]=desc` +
        `&sort[1][field]=code`;
      const r = await fetch(url, { headers });
      const data = await r.json();
      return res.status(200).json({ ok: true, records: data.records || [] });
    }

    // 🗑️ Excluir
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ ok: false, msg: "ID ausente" });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}/${id}`, {
        method: "DELETE",
        headers,
      });
      const result = await r.json();
      return res.status(200).json({ ok: true, result });
    }

    // ➕ Criar
    if (req.method === "POST") {
      const { code, plan, expires_at, flagged, name, email } = req.body;
      if (!code) return res.status(400).json({ ok: false, msg: "Código obrigatório" });
      if (!name) return res.status(400).json({ ok: false, msg: "Nome obrigatório" });

      const planValue = (plan || "mensal").trim();
      // vitalício ou data vazia => null (limpa no Airtable)
      const expiresValue =
        planValue === "vitalicio" || !expires_at ? null : String(expires_at).trim();

      const body = {
        fields: {
          code,
          name,
          email,
          plan_type: planValue,   // TEXT
          expires_at: expiresValue,
          flagged: !!flagged,
        },
      };

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const result = await r.json();

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
    return res
      .status(500)
      .json({ ok: false, msg: "Erro interno no servidor", detail: err.message });
  }
}
