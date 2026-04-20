// ======================================================================
//  step16-action-modal.js — Modal de AÇÃO DAS CORDAS
// ======================================================================

// ----------------------
//  Dados
// ----------------------
const ACTION_RANGES = [
  { instrument: 'Violão aço', fret1: '≈ 0.4 – 1.0', fret12: '≈ 2.0 – 3.0' },
  { instrument: 'Violão nylon', fret1: '≈ 0.8 – 1.6', fret12: '≈ 2.5 – 4.5' },
  { instrument: 'Viola caipira', fret1: '≈ 0.5 – 1.0', fret12: '≈ 2.5 – 3.5' },
  { instrument: 'Ukulele', fret1: '≈ 0.3 – 0.8', fret12: '≈ 1.5 – 2.5' },
  { instrument: 'Cavaquinho', fret1: '≈ 0.3 – 0.8', fret12: '≈ 1.5 – 2.5' }
];

// ----------------------
//  HTML
// ----------------------
function buildActionHtml() {
  let html = `
    <div class="tuning-root">
      <h3>Ação típica — valores em milímetros</h3>

      <section class="tuning-section action-table-wrap">
        <div class="tuning-table-wrap">
          <table class="measures-table action-table">
            <thead>
              <tr>
                <th>Instrumento</th>
                <th>Traste 1</th>
                <th>Traste 12</th>
              </tr>
            </thead>
            <tbody>
  `;

  ACTION_RANGES.forEach(r => {
    html += `
      <tr>
        <td>${r.instrument}</td>
        <td>${r.fret1}</td>
        <td>${r.fret12}</td>
      </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>
      </section>

      <p style="font-size:.9em;color:#555">
        Valores comuns entre luthiers; ajuste varia conforme cordas e preferência.
      </p>
    </div>
  `;

  return html;
}

// ---------------------------------------------
//  Abrir modal
// ---------------------------------------------
function openActionModalViaMeasures() {

  if (typeof ensureModal !== 'function') {
    console.warn("⚠️ ensureModal() não encontrado.");
    return;
  }

  const m = ensureModal();

  const title = m.querySelector('#measuresInst');
  if (title) title.textContent = 'Ação das Cordas';

  const body = m.querySelector('#measuresBody');
  if (body) body.innerHTML = buildActionHtml();

  const ft = m.querySelector('.measures-ft');
  if (ft) ft.style.display = 'none';

  if (window.measuresModal && typeof window.measuresModal.open === 'function') {
    window.measuresModal.open();
  } else {
    m.classList.add('open');
    document.body.classList.add('modal-open');
    m.style.display = 'flex';
  }
}

// ---------------------------
//  Botão
// ---------------------------
function initActionButton() {
  const btn = document.getElementById('btnActionTable');

  if (btn) {
    btn.addEventListener('click', openActionModalViaMeasures);
    return;
  }

  const obs = new MutationObserver(() => {
    const b = document.getElementById('btnActionTable');
    if (b) {
      b.addEventListener('click', openActionModalViaMeasures);
      obs.disconnect();
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}

// init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initActionButton);
} else {
  initActionButton();
}