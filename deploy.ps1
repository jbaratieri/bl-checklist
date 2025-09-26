Write-Host "🚀 Iniciando deploy do BL Checklist..." -ForegroundColor Cyan

# Adiciona todas as alterações
git add .

# Cria um commit (se não houver alterações, não quebra)
git commit -m "deploy automático" --allow-empty

# Envia para a branch main
git push origin main

Write-Host "✅ Deploy concluído!"
Write-Host "👉 Acesse em: https://jbaratieri.github.io/bl-checklist/" -ForegroundColor Green

