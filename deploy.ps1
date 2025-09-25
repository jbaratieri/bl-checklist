Write-Host "🚀 Deploy do BL Checklist para GitHub Pages..." -ForegroundColor Green

# 1) Adiciona todas as mudanças
git add .

# 2) Cria commit (mesmo se não houver mudanças, usa --allow-empty pra não falhar)
git commit -m "deploy automático" --allow-empty

# 3) Envia para o branch main
git push origin main

# 4) Faz deploy para o GitHub Pages (gh-pages)
git deploy

Write-Host "✅ Deploy concluído! Site atualizado em:" -ForegroundColor Green
Write-Host "👉 https://jbaratieri.github.io/bl-checklist/" -ForegroundColor Cyan
