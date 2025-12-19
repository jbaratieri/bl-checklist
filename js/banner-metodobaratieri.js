(function () {
  const KEY = 'mb_evolution_banner_dismissed';
  const banner = document.getElementById('evolution-banner');
  const closeBtn = document.getElementById('evolution-close');

  if (!banner || !closeBtn) return;

  // só mostra se ainda não foi fechado
  if (!localStorage.getItem(KEY)) {
    banner.hidden = false;
  }

  closeBtn.addEventListener('click', () => {
    localStorage.setItem(KEY, '1');
    banner.remove();
  });
})();
