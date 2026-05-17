// Bloqueia acesso direto aos PDFs (use o portal /bonus-plantilhas).
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(403).json({
    ok: false,
    msg: "use_portal",
    hint: "Acesse https://metodo.luthieriabaratieri.com.br/bonus-plantilhas com seu código de licença.",
  });
}
