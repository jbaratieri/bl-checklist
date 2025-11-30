// ----- Afinações e medidas: conteúdo usado -----
// Observação: as afinações descritas abaixo são afinações comuns / padrão encontradas em fontes de referência.
const TUNINGS = [
  {
    instrument: 'Viola caipira (afinações comuns)',
    examples: [
      {name: 'Cebolão em Ré (muito comum)', tuning: '5ª ordem -> 1ª ordem: D A F# D A (formato por ordens)'},
      {name: 'Cebolão em Mi', tuning: 'E B G# E B'},
      {name: 'Rio Abaixo / Boiadeira (exemplos regionais)', tuning: 'varia — consulte afinações locais'},
    ],
    source: 'CifraClub / referências sobre afinações da viola caipira'
  },
  {
    instrument: 'Violão (padrão)',
    examples: [
      {name: 'Padrão (standard)', tuning: '6ª -> 1ª: E A D G B E'}
    ],
    source: 'Guia / posts sobre afinação de violão'
  },
  {
    instrument: 'Cavaquinho',
    examples: [
      {name: 'Tradicional (muito usada)', tuning: '1ª -> 4ª: D B G D'},
      {name: 'Imita violão (uso moderno)', tuning: 'E B G D'},
      {name: 'Afinação do bandolim', tuning: 'E A D G'}
    ],
    source: 'Fóruns e guias de cavaquinho'
  },
  {
    instrument: 'Ukulele (soprano/concerto/tenor)',
    examples: [
      {name: 'Padrão (C)', tuning: 'G C E A (G reentrante normalmente)'}
    ],
    source: 'Guias de ukulele'
  }
];

// Valores típicos de ação (string height) usados por luthiers — faixas indicativas (mm)
// medidos do topo do traste até a face inferior da corda (valor comum na prática)
const ACTION_RANGES = [
  {instrument: 'Violão / guitarra (steel-string)', fret1: '≈ 0.4 – 1.0 mm', fret12: '≈ 1.5 – 3.0 mm'},
  {instrument: 'Violão clássico (nylon)', fret1: '≈ 0.8 – 1.6 mm', fret12: '≈ 2.5 – 4.0 mm'},
  {instrument: 'Ukulele / cavaquinho (cordas leves)', fret1: '≈ 0.3 – 0.8 mm', fret12: '≈ 1.5 – 2.5 mm'},
  {instrument: 'Viola caipira (muitos pref. com ação um pouco maior)', fret1: '≈ 0.8 – 2.0 mm', fret12: '≈ 2.5 – 4.5 mm'}
];

// ----- Funções que constroem o markup -----
function buildTuningsHtml() {
  let html = `<div class="luthier-modal" role="dialog" aria-modal="true" aria-labelledby="luthier-tunings-title">
    <button class="close-btn" id="luthier-close-modal" aria-label="Fechar modal">✕</button>
    <h2 id="luthier-tunings-title">Afinações & Ação das cordas</h2>
    <p>Lista com afinações comuns por instrumento e faixas típicas de ação nos trastes 1 e 12 (valores indicativos para referência de luthieria).</p>`;

  // Tunings
  html += `<h3>Afinações comuns</h3>`;
  TUNINGS.forEach(section => {
    html += `<h4>${section.instrument}</h4><table><thead><tr><th>Nome / Uso</th><th>Afinação (cordas)</th></tr></thead><tbody>`;
    section.examples.forEach(ex => {
      html += `<tr><td>${ex.name}</td><td><code>${ex.tuning}</code></td></tr>`;
    });
    html += `</tbody></table>`;
  });

  // Action table
  html += `<h3>Ação típica (altura das cordas) — medidas indicativas</h3>
    <table><thead><tr><th>Instrumento</th><th>Altura no traste 1</th><th>Altura no traste 12</th></tr></thead><tbody>`;
  ACTION_RANGES.forEach(r => {
    html += `<tr><td>${r.instrument}</td><td>${r.fret1}</td><td>${r.fret12}</td></tr>`;
  });
  html += `</tbody></table>`;

  html += `<p style="font-size:.9em;color:#444">Observação: estas são faixas indicativas, baseadas em práticas gerais de luthiers — ajuste final depende do instrumento, das cordas, e da preferência do músico.</p>`;
  html += `</div>`; // fim modal
  return html;
}

function openTuningModal() {
  // se já existe, não recria
  if (document.getElementById('luthier-modal-backdrop')) {
    document.getElementById('luthier-modal-backdrop').style.display = 'flex';
    document.getElementById('luthier-close-modal').focus();
    return;
  }

  const container = document.getElementById('tuningModalContainer') || document.body;
  const backdrop = document.createElement('div');
  backdrop.id = 'luthier-modal-backdrop';
  backdrop.className = 'luthier-modal-backdrop';
  backdrop.innerHTML = buildTuningsHtml();
  container.appendChild(backdrop);

  // handlers
  const closeBtn = document.getElementById('luthier-close-modal');
  closeBtn.addEventListener('click', closeTuningModal);

  // fechar ao clicar fora do modal
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) closeTuningModal();
  });

  // fechar com Escape
  document.addEventListener('keydown', handleEscapeForTuningModal);
  // foco inicial no fechar
  closeBtn.focus();
}

function closeTuningModal() {
  const backdrop = document.getElementById('luthier-modal-backdrop');
  if (backdrop) {
    backdrop.style.display = 'none';
  }
  document.removeEventListener('keydown', handleEscapeForTuningModal);
  // devolver foco ao botão
  const btn = document.getElementById('btnTuningTable');
  if (btn) btn.focus();
}

function handleEscapeForTuningModal(e) {
  if (e.key === 'Escape') closeTuningModal();
}

// ----- ligar ao botão quando DOM pronto -----
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnTuningTable');
  if (btn) {
    btn.addEventListener('click', openTuningModal);
  } else {
    // caso o botão seja injetado depois, observe o DOM (fallback simples)
    const observer = new MutationObserver(() => {
      const b = document.getElementById('btnTuningTable');
      if (b) {
        b.addEventListener('click', openTuningModal);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
});
