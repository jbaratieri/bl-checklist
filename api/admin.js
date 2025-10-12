// api/admin.js — Painel Administrativo Seguro (LuthierPro)
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { method } = req;
  const { key } = req.query || req.body || {};

  // 🔐 Verifica a senha de administrador (ADMIN_KEY configurada no Vercel)
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

  try {
    if (method === "GET") {
      // 📄 Listar todas as licenças
      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}?sort[0][field]=code`, { headers });
      const data = await r.json();
      return res.status(200).json({ ok: true, records: data.records || [] });
    }

    if (method === "DELETE") {
      // 🗑️ Deletar uma licença
      const { id } = req.body;
      if (!id) return res.status(400).json({ ok: false, msg: "ID ausente" });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}/${id}`, {
        method: "DELETE",
        headers,
      });

      const result = await r.json();
      return res.status(200).json({ ok: true, result });
    }

    if (method === "POST") {
      // ➕ Criar nova licença
      const { code, plan, expires_at, flagged, notes } = req.body;
      if (!code) return res.status(400).json({ ok: false, msg: "Código obrigatório" });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fields: { code, plan_type: plan || "mensal", expires_at, flagged: !!flagged, notes },
        }),
      });

      const result = await r.json();
      return res.status(201).json({ ok: true, result });
    }

    return res.status(405).json({ ok: false, msg: "Método não permitido" });
  } catch (err) {
    console.error("Erro no admin API:", err);
    return res.status(500).json({ ok: false, msg: "Erro interno no servidor" });
  }
}
