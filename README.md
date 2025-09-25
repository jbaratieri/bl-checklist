# 🎸 BL Checklist

Checklist de luteria para violão, viola caipira, cavaquinho e ukulele.  
Projeto desenvolvido para estudo e organização do processo de construção de instrumentos, rodando como **PWA** via GitHub Pages.

---

## 🚀 Deploy (atualizar o site)

Sempre que fizer alterações no projeto:

```powershell
git add .
git commit -m "atualiza imagens e ajustes"
git push origin main
git deploy

Isso publica a pasta public/ no branch gh-pages e atualiza o site:
👉 https://jbaratieri.github.io/bl-checklist/

📂 Estrutura

public/ → arquivos que vão para o GitHub Pages

assets/ → imagens, álbuns e SVGs técnicos

src/ → scripts e módulos do checklist

deploy.ps1 → script de deploy rápido

README.md → este guia

✍️ Autor: Jacir Paulo Baratieri
