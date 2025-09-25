Write-Host "🚀 Iniciando deploy do BL Checklist para GitHub Pages..."

# Verifica se execução de scripts está habilitada
try {
    # Testa um comando simples em scriptblock
    $null = Invoke-Command { "test-exec-policy" } -ErrorAction Stop
}
catch {
    Write-Host "`n❌ Execução de scripts desabilitada neste sistema."
    Write-Host "👉 Para liberar TEMPORARIAMENTE nesta sessão, rode no terminal:"
    Write-Host "   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`n"
    Write-Host "👉 Ou para liberar PERMANENTE para seu usuário, rode:"
    Write-Host "   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`n"
    Write-Host "Depois, rode novamente: .\deploy.ps1"
    exit 1
}

# Fluxo de deploy
git add .
git commit -m "deploy automático" --allow-empty
git push origin main
git deploy

Write-Host "✅ Deploy concluído!"
Write-Host "🌍 Site atualizado em: https://jbaratieri.github.io/bl-checklist/"

