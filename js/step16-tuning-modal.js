// ======================================================================
//  step17-tuning-modal.js — Usa o MESMO modal do step16 (measuresModal)
// ======================================================================

const TUNINGS = [
  {
    instrument: 'Viola caipira (afinações comuns)',
    examples: [
      {name: 'Cebolão em Ré (muito comum)', tuning: '5ª ordem -> 1ª ordem: D A F# D A'},
      {name: 'Cebolão em Mi', tuning: 'E B G# E B'},
      {name: 'Rio Abaixo / Boiadeira', tuning: 'varia — consulte afinações locais'}
    ]
  },
  {
    instrument: 'Violão (padrão)',
    examples: [
      {name: 'Standard', tuning: '6ª → 1ª: E A D G B E'}
    ]
  },
  {
    instrument: 'Cavaquinho',
    examples: [
      {name: 'Tradicional', tuning: '1ª → 4ª: D B G D'},
      {name: 'Imita violão', tuning: 'E B G D'},
      {name: 'Afin. bandolim', tuning: 'E A D G'}
    ]
  },
  {
    instrument: 'Ukulele (soprano/concerto/tenor)',
    examples: [
      {name: 'Padrão (C)', tuning: 'G C E A (G reentrante)'}
    ]
  }
];

const ACTION_RANGES = [
  {instrument: 'Violão aço', fret1: '≈ 0.4 – 1.0 mm', fret12: '≈ 1.5 – 3.0 mm'},
  {instrument: 'Violão nylon', fret1: '≈ 0.8 – 1.6 mm', fret12: '≈ 2.5 – 4.0 mm'},
  {instrument: 'Ukulele / cavaquinho', fret1: '≈ 0.3 – 0.8 mm', fret12: '≈ 1.5 – 2.5 mm'},
  {instrument: 'Viola caipira', fret1: '≈ 0.8 – 2.0 mm', fret12: '≈ 2.5 – 4.5 mm'}
];

// ----------------------
//  Construção do HTML
// ----------------------
function buildTuningsHtml() {
  let html = `<div class="tuning-root">
    <h3>Afinações comuns</h3>
  `;

  TUNINGS.forEach(section => {
    html += `
      <section class="tuning-section" aria-labelledby="">
        <h4 class="tuning-title">${section.instrument}</h4>
        <div class="tuning-table-wrap">
          <table class="measures-table">
            <thead><tr><th>Nome / Uso</th><th>Afinação</th></tr></thead>
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
        </div> <!-- .tuning-table-wrap -->
      </section>
    `;
  });

  // Ação típica
  html += `
    <h3>Ação típica — valores indicativos</h3>
    <section class="tuning-section">
      <div class="tuning-table-wrap">
        <table class="measures-table">
          <thead><tr><th>Instrumento</th><th>Traste 1</th><th>Traste 12</th></tr></thead>
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

    <p style="font-size:.9em;color:#555">Valores comuns entre luthiers; ajuste varia conforme cordas e preferência.</p>
  </div>
  `;

  return html;
}

// ---------------------------------------------
//  Abertura do modal usando o MESMO modal
// ---------------------------------------------
function openTuningModalViaMeasures() {

  if (typeof ensureModal !== 'function') {
    console.warn("⚠️ ensureModal() ainda não existe. Carregue step16 antes deste arquivo.");
    return;
  }

  // Cria/pega o modal original
  const m = ensureModal();

  // Altera o título
  const title = m.querySelector('#measuresInst');
  if (title) title.textContent = 'Afinação & Ação';

  // conteúdo
  const body = m.querySelector('#measuresBody');
  if (body) body.innerHTML = buildTuningsHtml();

  // footer some (para não aplicar placeholders por engano)
  const ft = m.querySelector('.measures-ft');
  if (ft) ft.style.display = 'none';

  // Exibe modal
  m.style.display = 'block';

  // Foco no botão de fechar
  const closeBtn = m.querySelector('.measures-close');
  if (closeBtn) closeBtn.focus();

  // Ao fechar, restaurar footer do modal normal
  if (closeBtn) {
    const restore = () => {
      m.style.display = 'none';
      if (ft) ft.style.display = ''; // volta ao normal
    };
    closeBtn.onclick = restore;
  }
}

// ---------------------------
//  Conectar ao botão global
// ---------------------------
function initTuningButton() {
  const btn = document.getElementById('btnTuningTable');
  if (btn) {
    btn.addEventListener('click', openTuningModalViaMeasures);
    return;
  }

  // fallback caso seja injetado depois
  const obs = new MutationObserver(() => {
    const b = document.getElementById('btnTuningTable');
    if (b) {
      b.addEventListener('click', openTuningModalViaMeasures);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTuningButton);
} else {
  initTuningButton();
}
