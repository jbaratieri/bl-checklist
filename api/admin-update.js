export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ ok: false, msg: "Método não permitido" });
  }

  const { id } = req.query;
  const { plan_type, expires_at, key } = req.body;

  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, msg: "Chave inválida" });
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/licenses/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            plan_type,
            expires_at,
          },
        }),
      }
    );

    const data = await response.json();
    if (data.id) {
      return res.status(200).json({ ok: true, msg: "Registro atualizado com sucesso" });
    } else {
      return res.status(500).json({ ok: false, msg: "Falha ao atualizar no Airtable" });
    }
  } catch (err) {
    console.error("Erro no admin-update:", err);
    return res.status(500).json({ ok: false, msg: "Erro interno no servidor" });
  }
}
