// Step 2: adiciona title aos itens do Índice com o texto completo (para tooltip ao passar o mouse)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav.toc a[href^="#"]').forEach(a => {
    if (!a.title || a.title.trim()==="") a.title = a.textContent.trim();
  });
});
