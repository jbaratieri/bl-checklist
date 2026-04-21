Write-Host "🚀 Iniciando deploy do BL Checklist..." -ForegroundColor Cyan

# Nota: `git add .` respeita `.gitignore` (ex.: dev/dev-bypass.html não sobe no Git público).
# Template versionado: dev/dev-bypass.example.html — copie para dev-bypass.html localmente.

# Garante que estamos na branch main
git checkout main

# Atualiza a branch local
git pull origin main

# Adiciona todas as alterações
git add .

# Cria um commit (se não houver alterações, não quebra)
git commit -m "automático - nova versão Método Baratieri v2.5.1" --allow-empty

# Envia para a branch main (GitHub Pages já publica direto da main)
git push origin main

Write-Host "✅ Deploy concluído!"

