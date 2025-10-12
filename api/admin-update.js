import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    // ✅ Só aceita POST
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, msg: "Método não permitido" });
    }

    // ✅ Leitura de variáveis de ambiente
    const { AIRTABLE_KEY, AIRTABLE_BASE, ADMIN_KEY } = process.env;
    if (!AIRTABLE_KEY || !AIRTABLE_BASE) {
      console.error("❌ Variáveis de ambiente ausentes");
      return res.status(500).json({ ok: false, msg: "Configuração do servidor incompleta" });
    }

    // ✅ Autenticação simples por chave administrativa
    const keyParam = req.query.key || req.headers["x-admin-key"];
    if (keyParam !== ADMIN_KEY) {
      return res.status(403).json({ ok: false, msg: "Acesso negado" });
    }

    // ✅ Extrai o corpo JSON
    const body = req.body ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body) : null;

    if (!body || !body.id || !body.fields) {
      console.error("⚠️ Corpo inválido recebido:", body);
      return res.status(400).json({ ok: false, msg: "ID e fields são obrigatórios" });
    }

    console.log("🧩 Atualizando registro Airtable:", body);

    // ✅ Configura cliente Airtable
    const base = new Airtable({ apiKey: AIRTABLE_KEY }).base(AIRTABLE_BASE);

    // 🔧 Formata campo de data (evita erro 400 por formato incorreto)
    if (body.fields.expires_at) {
      try {
        // Se vier "20/11/2025", converte pra ISO 8601 (2025-11-20)
        const [dia, mes, ano] = body.fields.expires_at.split("/");
        if (dia && mes && ano) body.fields.expires_at = `${ano}-${mes}-${dia}`;
      } catch (e) {
        console.warn("Data de expiração não precisa conversão:", body.fields.expires_at);
      }
    }

    // 🔧 Normaliza campo plan_type (evita criar opção nova)
    if (body.fields.plan_type) {
      const plan = body.fields.plan_type.toLowerCase().trim();
      body.fields.plan_type =
        plan.includes("vital") ? "vitalicio" : "mensal";
    }

    // ✅ Executa atualização
    const result = await base("licenses").update([
      { id: body.id, fields: body.fields }
    ]);

    console.log("✅ Atualizado com sucesso:", result);

    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("❌ Erro detalhado no admin-update:", err);
    return res.status(500).json({
      ok: false,
      msg: "Erro ao atualizar no Airtable",
      error: err.message || err.toString()
    });
  }
}


