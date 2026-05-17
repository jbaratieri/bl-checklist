// Entrega PDFs de bonus-plantilhas após validar licença (mesma regra do check-license).
import fs from "fs";
import path from "path";

const ALLOWED_FILES = [
  "Plantilla 1. Radios a usar 1..pdf",
  "Plantilla 2. Radios a usar 2..pdf",
  "Plantilla 3. Tapa de flamenca 1..pdf",
  "Plantilla 4. Tapa de flamenca 2..pdf",
  "Plantilla 5. Tapa de flamenca 3..pdf",
  "Plantilla 6. Tapa de flamenca 4..pdf",
  "Plantilla 9. Mástil, diapasón y trastes flamenca 1..pdf",
  "Plantilla 10. Mástil, diapasón y trastes 2..pdf",
  "Plantilla 11. Diferentes piezas para flamenca y clásica 1. Inclinación de la pala..pdf",
  "Plantilla 12. Diferentes piezas para flamenca y clásica 2. Inclinación de la pala..pdf",
  "Plantilla 13. Curvas del mástil clásica..pdf",
  "Plantilla 14. Diapasón clásica 1..pdf",
  "Plantilla 15. Diapasón clásica 2..pdf",
  "Plantilla 16 y 17. Mastil clásica..pdf",
  "Plantilla 18. Tacón guitarra clásica..pdf",
  "Plantilla 19, 20, 21 y 22 de clásica para imprimir en A-4.pdf",
  "Plantilla solera 1.pdf",
  "Plantilla solera 2.pdf",
  "Plantilla solera 3.pdf",
  "Plantilla solera 4.pdf",
  "Plantilla solera 5.pdf",
  "Plantilla solera 6.pdf",
  "Plantilla solera 7.pdf",
  "Plantilla solera 8.pdf",
];

const ALLOWED = new Set(ALLOWED_FILES);

function safeFileName(raw) {
  if (!raw || typeof raw !== "string") return null;
  const base = path.basename(raw.trim());
  return ALLOWED.has(base) ? base : null;
}

async function licenseOk(license_key, req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";
  const r = await fetch(`${baseUrl}/api/check-license`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key }),
  });
  const data = await r.json();
  return !!(data && data.ok);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, msg: "method_not_allowed" });
  }

  try {
    const { license_key, file } = req.body || {};
    if (!license_key) {
      return res.status(400).json({ ok: false, msg: "license_key_required" });
    }

    const name = safeFileName(file);
    if (!name) {
      return res.status(400).json({ ok: false, msg: "invalid_file" });
    }

    const allowed = await licenseOk(String(license_key).trim(), req);
    if (!allowed) {
      return res.status(403).json({ ok: false, msg: "license_invalid_or_expired" });
    }

    const filePath = path.join(process.cwd(), "bonus-plantilhas", name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, msg: "file_not_found" });
    }

    const buf = fs.readFileSync(filePath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/"/g, "")}"`);
    return res.status(200).send(buf);
  } catch (e) {
    console.error("[bonus-plantilhas-file]", e);
    return res.status(500).json({ ok: false, msg: "server_error" });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
};
