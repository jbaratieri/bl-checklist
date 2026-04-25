// `intro-toggle.js`: controla o botao "Ler mais/Ler menos" da introducao.
// Apenas alterna classe e texto para expandir ou recolher o bloco introdutorio.
// Atenção: simples, mas depende da estrutura HTML com `.intro` e `.intro-toggle`.
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.intro-toggle');
  if (!btn) return;

  const intro = btn.closest('.intro');
  intro.classList.toggle('expanded');

  btn.textContent = intro.classList.contains('expanded')
    ? 'Ler menos'
    : 'Ler mais';
});
