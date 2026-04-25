// `step2-toc.js`: melhora o indice adicionando tooltip com o texto completo de cada item.
// Isso ajuda leitura quando o link aparece cortado visualmente.
// Atenção: depende de links `nav.toc a[href^="#"]` existentes no HTML.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav.toc a[href^="#"]').forEach(a => {
    if (!a.title || a.title.trim()==="") a.title = a.textContent.trim();
  });
});
