// api/admin-update.js — Atualiza plano e expiração no Airtable
export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ ok: false, msg: "Método não permitido" });
  }

  const { id } = req.query;
  const { plan_type, expires_at, key } = req.body;

  if (!id) {
    return res.status(400).json({ ok: false, msg: "Faltando ID do registro" });
  }

  if (key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ ok: false, msg: "Acesso negado" });
  }

  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/licenses/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            plan_type: plan_type || undefined,
            expires_at: expires_at || undefined,
          },
        }),
      }
    );

    const data = await airtableRes.json();
    console.log("Airtable update response:", data);

    if (data.id) {
      return res.status(200).json({ ok: true, msg: "Registro atualizado com sucesso" });
    } else {
      return res.status(500).json({ ok: false, msg: "Erro ao atualizar no Airtable", data });
    }
  } catch (err) {
    console.error("Erro no admin-update.js:", err);
    return res.status(500).json({ ok: false, msg: "Erro interno no servidor" });
  }
}
