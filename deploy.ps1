# deploy.ps1 — script estável para publicar no GitHub Pages

Write-Host "🚀 Iniciando deploy do BL Checklist..." -ForegroundColor Cyan

# Adiciona todas as alterações
git add .

# Cria um commit (se não houver alterações, não quebra)
git commit -m "deploy automático" --allow-empty

# Envia para a branch main
git push origin main

# Publica no GitHub Pages (branch gh-pages com subtree)
git deploy

Write-Host "✅ Deploy concluído!"
Write-Host "👉 Acesse em: https://jbaratieri.github.io/bl-checklist/" -ForegroundColor Green
