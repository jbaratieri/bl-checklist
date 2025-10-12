// api/admin.js — Painel Administrativo Seguro (LuthierPro)
// ✅ Compatível com Vercel Edge Runtime (sem node-fetch)

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { method, nextUrl } = req;
  const url = new URL(nextUrl);
  const key = url.searchParams.get("key");

  // 🔐 Verifica a senha de administrador
  if (!key || key !== process.env.ADMIN_KEY) {
    return new Response(JSON.stringify({ ok: false, msg: "Acesso negado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
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
      const r = await fetch(
        `https://api.airtable.com/v0/${base}/${table}?sort[0][field]=code`,
        { headers }
      );
      const data = await r.json();
      return new Response(JSON.stringify({ ok: true, records: data.records || [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      // 🗑️ Deletar uma licença
      const body = await req.json();
      const { id } = body;
      if (!id)
        return new Response(JSON.stringify({ ok: false, msg: "ID ausente" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}/${id}`, {
        method: "DELETE",
        headers,
      });

      const result = await r.json();
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      // ➕ Criar nova licença
      const body = await req.json();
      const { code, plan, expires_at, flagged, notes } = body;
      if (!code)
        return new Response(JSON.stringify({ ok: false, msg: "Código obrigatório" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });

      const r = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fields: { code, plan_type: plan || "mensal", expires_at, flagged: !!flagged, notes },
        }),
      });

      const result = await r.json();
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, msg: "Método não permitido" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no admin API:", err);
    return new Response(
      JSON.stringify({ ok: false, msg: "Erro interno no servidor", detail: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
