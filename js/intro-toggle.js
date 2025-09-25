// Intro "Ler mais" (funciona em desktop e mobile)
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.intro-toggle');
  if (!btn) return;

  const intro = btn.closest('.intro');
  intro.classList.toggle('expanded');

  btn.textContent = intro.classList.contains('expanded')
    ? 'Ler menos'
    : 'Ler mais';
});
