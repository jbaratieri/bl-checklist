// api/admin.js — Painel Administrativo LuthierPro (versão revisada 1.1.0, compatível com Node runtime)

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
      // 📄 Listar todas as licenças
      const r = await fetch(
        `https://api.airtable.com/v0/${base}/${table}?sort[0][field]=code`,
        { headers }
      );
      const data = await r.json();
      return res.status(200).json({ ok: true, records: data.records || [] });
    }

    if (req.method === "DELETE") {
      // 🗑️ Excluir uma licença
      const { id } = req.body;
      if (!id) return res.status(400).json({ ok: false, msg: "ID ausente" });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}/${id}`, {
        method: "DELETE",
        headers,
      });
      const result = await r.json();
      return res.status(200).json({ ok: true, result });
    }

    if (req.method === "POST") {
      // ➕ Criar nova licença
      const { code, plan, expires_at, flagged, notes } = req.body;
      if (!code) {
        return res.status(400).json({ ok: false, msg: "Código obrigatório" });
      }

      // 🔧 Garante que o plan_type seja um objeto válido (Single Select)
      const planValue = plan || "mensal";
      const body = {
        fields: {
          code,
          plan_type: { name: planValue },
          expires_at,
          flagged: !!flagged,
          notes,
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
