const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = path.join(__dirname, "assets/tech");

// Qualidade padrão (0–100)
const QUALITY = 80;

// Função para percorrer diretórios recursivamente
function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath);
    }
  });
}

// Converte JPG → WEBP
function convertJpgToWebp(file) {
  if (!/\.(jpg|jpeg|png)$/i.test(file)) return;

  const output = file.replace(/\.(jpg|jpeg|png)$/i, ".webp");

  sharp(file)
    .webp({ quality: QUALITY })
    .toFile(output)
    .then(() => console.log(`✅ ${path.basename(file)} → ${path.basename(output)}`))
    .catch(err => console.error(`❌ Erro em ${file}:`, err));
}

// Executa
walk(inputDir, convertJpgToWebp);
