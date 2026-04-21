// ======================================================================
//  step16-action-modal.js — Modal de AÇÃO DAS CORDAS
// ======================================================================

// ----------------------
//  Dados
// ----------------------
const ACTION_RANGES = [
  {
    instrument: 'Violão aço',
    low: '1ª: 1.5–2.0<br>6ª: 2.0–2.5',
    mid: '1ª: 2.0–2.5<br>6ª: 2.5–3.0',
    high: '1ª: 2.5–3.0<br>6ª: 3.0–3.5'
  },
  {
    instrument: 'Violão nylon',
    low: '1ª: 2.5–3.0<br>6ª: 3.0–3.5',
    mid: '1ª: 3.0–3.5<br>6ª: 3.5–4.0',
    high: '1ª: 3.5–4.0<br>6ª: 4.0–4.5'
  },
  {
    instrument: 'Viola caipira',
    low: '1ª: 2.0–2.5<br>5ª: 2.5–3.0',
    mid: '1ª: 2.5–3.0<br>5ª: 3.0–3.5',
    high: '1ª: 3.0–3.5<br>5ª: 3.5–4.0'
  },
  {
    instrument: 'Ukulele',
    low: '1ª: 1.5–1.8<br>4ª: 1.8–2.0',
    mid: '1ª: 1.8–2.2<br>4ª: 2.0–2.3',
    high: '1ª: 2.2–2.5<br>4ª: 2.3–2.6'
  },
  {
    instrument: 'Cavaquinho',
    low: '1ª: 1.5–1.8<br>4ª: 1.8–2.0',
    mid: '1ª: 1.8–2.2<br>4ª: 2.0–2.3',
    high: '1ª: 2.2–2.5<br>4ª: 2.3–2.6'
  }
];

// ----------------------
//  HTML
// ----------------------
function buildActionHtml() {
  let html = `
    <div class="tuning-root">
      <h3>Ação no traste 12 — em mm</h3>
      <section class="tuning-section action-table-wrap">
        <div class="tuning-table-wrap">
          <table class="measures-table action-table">
            <thead>
              <tr>
                <th>Instrumento</th>
                <th>Baixa</th>
                <th>Média</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
  `;

  ACTION_RANGES.forEach(r => {
    html += `
      <tr>
        <td>${r.instrument}</td>
        <td>${r.low}</td>
        <td>${r.mid}</td>
        <td>${r.high}</td>
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

  const title = m.querySelector('#measuresTitle');
  if (title) title.textContent = 'Ação das Cordas — referência';

  const body = m.querySelector('#measuresBody');
  if (body) {
    body.classList.remove('plant-mode');
    body.style.display = '';
    body.innerHTML = buildActionHtml();
  }

  const ft = m.querySelector('.measures-ft');
  if (ft) ft.style.display = 'none';

  if (window.measuresModal && typeof window.measuresModal.open === 'function') {
    window.measuresModal.open();
  } else if (typeof m.open === 'function') {
    m.open();
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