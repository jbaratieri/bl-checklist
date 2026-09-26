// `step16-tuning-modal.js`: abre um modal com tabelas de afinacao padrao por instrumento.
// Reutiliza o modal de medidas para exibir conteudo educativo rapido ao usuario.
// Atenção: depende da existencia de `ensureModal`; sem isso o botao nao abre nada.

// ----------------------
//  Dados
// ----------------------
const TUNINGS = [
  {
    instrument: 'Viola caipira (do 5º para o 1º par)',
    examples: [
      {
        name: 'Cebolão em Ré',
        tuning: 'A D F# A D',
        notation: [
          '5º par: A2 · 110.00 Hz / A3 · 220.00 Hz (oitavado)',
          '4º par: D3 · 146.83 Hz / D4 · 293.66 Hz (oitavado)',
          '3º par: F#3 · 185.00 Hz / F#4 · 369.99 Hz (oitavado)',
          '2º par: A3 · 220.00 Hz (uníssono)',
          '1º par: D4 · 293.66 Hz (uníssono)'
        ]
      },
      {
        name: 'Cebolão em Mi',
        tuning: 'B E G# B E',
        notation: [
          '5º par: B2 · 123.47 Hz / B3 · 246.94 Hz (oitavado)',
          '4º par: E3 · 164.81 Hz / E4 · 329.63 Hz (oitavado)',
          '3º par: G#3 · 207.65 Hz / G#4 · 415.30 Hz (oitavado)',
          '2º par: B3 · 246.94 Hz (uníssono)',
          '1º par: E4 · 329.63 Hz (uníssono)'
        ]
      },
      {
        name: 'Rio Abaixo',
        tuning: 'G D G B D',
        notation: [
          '5º par: G2 · 98.00 Hz / G3 · 196.00 Hz (oitavado)',
          '4º par: D3 · 146.83 Hz / D4 · 293.66 Hz (oitavado)',
          '3º par: G3 · 196.00 Hz / G4 · 392.00 Hz (oitavado)',
          '2º par: B3 · 246.94 Hz (uníssono)',
          '1º par: D4 · 293.66 Hz (uníssono)'
        ]
      }
    ]
  },
  {
    instrument: 'Violão (da 6ª para a 1ª corda)',
    examples: [
      {
        name: 'Standard',
        tuning: 'E A D G B E',
        notation: [
          '6ª: E2 · 82.41 Hz',
          '5ª: A2 · 110.00 Hz',
          '4ª: D3 · 146.83 Hz',
          '3ª: G3 · 196.00 Hz',
          '2ª: B3 · 246.94 Hz',
          '1ª: E4 · 329.63 Hz'
        ]
      }
    ]
  },
  {
    instrument: 'Cavaquinho (da 4ª para a 1ª corda)',
    examples: [
      {
        name: 'Tradicional',
        tuning: 'D G B D',
        notation: [
          '4ª: D4 · 293.66 Hz',
          '3ª: G4 · 392.00 Hz',
          '2ª: B4 · 493.88 Hz',
          '1ª: D5 · 587.33 Hz'
        ]
      },
      {
        name: 'Imita violão',
        tuning: 'D G B E',
        notation: [
          '4ª: D3 · 146.83 Hz',
          '3ª: G3 · 196.00 Hz',
          '2ª: B3 · 246.94 Hz',
          '1ª: E4 · 329.63 Hz'
        ]
      }
    ]
  },
  {
    instrument: 'Ukulele (soprano/concerto/tenor)',
    examples: [
      {
        name: 'Padrão (C)',
        tuning: 'G C E A',
        notation: [
          '4ª: G4 · 392.00 Hz (reentrante)',
          '3ª: C4 · 261.63 Hz',
          '2ª: E4 · 329.63 Hz',
          '1ª: A4 · 440.00 Hz'
        ]
      }
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
     <section class="tuning-section tuning-freq-wrap">
    <h4 class="tuning-title">${section.instrument}</h4>

        <div class="tuning-table-wrap">
          <table class="measures-table tuning-freq-table">
            <thead>
              <tr>
                <th>Afinação</th>
                <th>Notas</th>
                <th>Frequência (Hz)</th>
              </tr>
            </thead>
            <tbody>
    `;

    section.examples.forEach(ex => {
      const freqCol = ex.notation ? ex.notation.join('<br>') : '';
      html += `
        <tr>
          <td>${ex.name}</td>
          <td><code>${ex.tuning}</code></td>
          <td>${freqCol}</td>
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
  const title = m.querySelector('#measuresTitle');
  if (title) title.textContent = 'Afinação — valores padrão';

  // conteúdo
  const body = m.querySelector('#measuresBody');
  if (body) {
    body.classList.remove('plant-mode');
    body.style.display = '';
    body.innerHTML = buildTuningsHtml();
  }

  // esconder footer
  const ft = m.querySelector('.measures-ft');
  if (ft) ft.style.display = 'none';

  // abrir modal
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