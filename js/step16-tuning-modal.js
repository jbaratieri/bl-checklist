// ======================================================================
//  step16-tuning-modal.js — Modal de AFINAÇÃO (usa measuresModal)
// ======================================================================

// ----------------------
//  Dados
// ----------------------
const TUNINGS = [
  {
    instrument: 'Viola caipira (do 5º para o 1º par)',
    examples: [
      { name: 'Cebolão em Ré', tuning: 'A D F# A D' },
      { name: 'Cebolão em Mi', tuning: 'B E G# B E' },
      { name: 'Rio Abaixo', tuning: 'G D G B D' }
    ]
  },
  {
    instrument: 'Violão (da 6ª para a 1ª corda)',
    examples: [
      { name: 'Standard', tuning: 'E A D G B E' }
    ]
  },
  {
    instrument: 'Cavaquinho (da 4ª para a 1ª corda)',
    examples: [
      { name: 'Tradicional', tuning: 'D G B D' },
      { name: 'Imita violão', tuning: 'D G B E' }
    ]
  },
  {
    instrument: 'Ukulele (soprano/concerto/tenor)',
    examples: [
      { name: 'Padrão (C)', tuning: 'G C E A' }
    ]
  }
];

// ----------------------
//  Construção do HTML
// ----------------------
function buildTuningsHtml() {
  let html = `
    <div class="tuning-root">
      <h3>Afinações comuns</h3>
  `;

  TUNINGS.forEach(section => {
    html += `
      <section class="tuning-section">
        <h4 class="tuning-title">${section.instrument}</h4>

        <div class="tuning-table-wrap">
          <table class="measures-table">
            <tbody>
    `;

    section.examples.forEach(ex => {
      html += `
        <tr>
          <td>${ex.name}</td>
          <td><code>${ex.tuning}</code></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </section>
    `;
  });

  html += `
    </div>
  `;

  return html; // ✅ ESSENCIAL
}

// ---------------------------------------------
//  Abertura do modal
// ---------------------------------------------
function openTuningModalViaMeasures() {

  if (typeof ensureModal !== 'function') {
    console.warn("⚠️ ensureModal() não encontrado.");
    return;
  }

  const m = ensureModal();

  // título
  const title = m.querySelector('#measuresInst');
  if (title) title.textContent = 'Afinação';

  // conteúdo
  const body = m.querySelector('#measuresBody');
  if (body) body.innerHTML = buildTuningsHtml();

  // esconder footer
  const ft = m.querySelector('.measures-ft');
  if (ft) ft.style.display = 'none';

  // abrir modal
  if (window.measuresModal && typeof window.measuresModal.open === 'function') {
    window.measuresModal.open();
  } else {
    m.classList.add('open');
    document.body.classList.add('modal-open');
    m.style.display = 'flex';
  }
}

// ---------------------------
//  Conectar botão
// ---------------------------
function initTuningButton() {
  const btn = document.getElementById('btnTuningTable');

  if (btn) {
    btn.addEventListener('click', openTuningModalViaMeasures);
    return;
  }

  // fallback (caso botão seja carregado depois)
  const obs = new MutationObserver(() => {
    const b = document.getElementById('btnTuningTable');
    if (b) {
      b.addEventListener('click', openTuningModalViaMeasures);
      obs.disconnect();
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}

// init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTuningButton);
} else {
  initTuningButton();
}