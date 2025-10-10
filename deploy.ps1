Write-Host "🚀 Iniciando deploy do BL Checklist..." -ForegroundColor Cyan

# Garante que estamos na branch main
git checkout main

# Atualiza a branch local
git pull origin main

# Adiciona todas as alterações
git add .

# Cria um commit (se não houver alterações, não quebra)
git commit -m "deploy automático - inclusão de todas as pastas com imagens do projeto" --allow-empty

# Envia para a branch main (GitHub Pages já publica direto da main)
git push origin main

Write-Host "✅ Deploy concluído!"
Write-Host "👉 Acesse em: https://jbaratieri.github.io/bl-checklist/" -ForegroundColor Green
Start-Process "https://jbaratieri.github.io/bl-checklist/"

