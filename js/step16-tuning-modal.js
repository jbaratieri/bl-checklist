// ======================================================================
//  step16-tuning-modal.js — Usa o MESMO modal do step16 (measuresModal)
//  Atualizado: usa .measures-modal.open + body.modal-open para abrir/fechar
// ======================================================================

const TUNINGS = [
  {
    instrument: 'Viola caipira (afinações comuns)',
    examples: [
      {name: 'Cebolão em Ré', tuning: 'D A F# D A'},
      {name: 'Cebolão em Mi', tuning: 'E B G# E B'},
      {name: 'Rio Abaixo / Boiadeira', tuning: 'varia — consulte afinações locais'}
    ]
  },
  {
    instrument: 'Violão (padrão)',
    examples: [
      {name: 'Standard', tuning: 'E A D G B E'}
    ]
  },
  {
    instrument: 'Cavaquinho',
    examples: [
      {name: 'Tradicional', tuning: 'D B G D'},
      {name: 'Imita violão', tuning: 'E B G D'},
      {name: 'Afin. bandolim', tuning: 'E A D G'}
    ]
  },
  {
    instrument: 'Ukulele (soprano/concerto/tenor)',
    examples: [
      {name: 'Padrão (C)', tuning: 'G C E A'}
    ]
  }
];

const ACTION_RANGES = [
  {instrument: 'Violão aço', fret1: '≈ 0.4 – 1.0 mm', fret12: '≈ 2.0 – 3.0 mm'},
  {instrument: 'Violão nylon', fret1: '≈ 0.8 – 1.6 mm', fret12: '≈ 2.5 – 4.5 mm'},
  {instrument: 'Ukulele / cavaquinho', fret1: '≈ 0.3 – 0.8 mm', fret12: '≈ 1.5 – 2.5 mm'},
  {instrument: 'Viola caipira', fret1: '≈ 0.5 – 1.0 mm', fret12: '≈ 2.5 – 3.5 mm'}
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

  // EXIBIÇÃO: preferimos usar .open + body.modal-open; manter display por compatibilidade
  function doOpen() {
    m.classList.add('open');
    document.body.classList.add('modal-open');
    // compatibilidade com trechos que leem display
    m.style.display = 'flex';
    // foco no botão de fechar se existir
    const closeBtn = m.querySelector('.measures-close, .close');
    if (closeBtn) closeBtn.focus();
  }

  function doCloseAndRestore() {
    // fecha visualmente
    m.classList.remove('open');
    document.body.classList.remove('modal-open');
    m.style.display = 'none';
    // restaura footer
    if (ft) ft.style.display = '';
  }

  // Abra: se houver window.measuresModal (helper global), use-o, senão faça localmente.
  if (window.measuresModal && typeof window.measuresModal.open === 'function') {
    window.measuresModal.open(); // measuresModal.open também seta .open e style, mas chamamos para manter compatibilidade
  } else {
    doOpen();
  }

  // Ao fechar, precisamos restaurar o footer. Para não sobrescrever handlers antigos, usamos listener dedicado.
  // Primeiro, remover qualquer handler inline antigo que o código anterior possa ter definido (para evitar duplicação)
  const closeBtn = m.querySelector('.measures-close, .close, [data-action="close-measures"]');
  // remover onclick se existia (cautela)
  if (closeBtn && closeBtn.onclick) closeBtn.onclick = null;

  // Handler que garante restauração ao fechar
  const restoreHandler = () => {
    // se existir helper global, use-o para fechar; caso contrário, faça manualmente
    if (window.measuresModal && typeof window.measuresModal.close === 'function') {
      window.measuresModal.close();
    } else {
      doCloseAndRestore();
    }
    // também garantir footer restaurado se measuresModal.close não fez isso
    if (ft) ft.style.display = '';
    // remover listener depois de usado
    if (closeBtn) closeBtn.removeEventListener('click', restoreHandler);
    // remover listener de escape também
    document.removeEventListener('keydown', escHandler);
  };

  // ESC também fecha e restaura
  const escHandler = (ev) => {
    if (ev.key === 'Escape') {
      restoreHandler();
    }
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', restoreHandler);
  }

  document.addEventListener('keydown', escHandler);

  // fechar ao clicar no backdrop — só se o modal suportar isso
  const backdropClickHandler = (ev) => {
    if (ev.target === m) restoreHandler();
  };
  m.addEventListener('click', backdropClickHandler);

  // Para limpar: caso outro código feche o modal sem passar por aqui, tentamos observar remoção da classe 'open'
  // e então restauramos footer. Isso é um fallback conservador.
  const observer = new MutationObserver((records) => {
    for (const rec of records) {
      if (rec.attributeName === 'class') {
        if (!m.classList.contains('open')) {
          // modal aparentemente fechado
          if (ft) ft.style.display = '';
          // desconectar e limpar listeners que adicionamos
          observer.disconnect();
          m.removeEventListener('click', backdropClickHandler);
          document.removeEventListener('keydown', escHandler);
          if (closeBtn) closeBtn.removeEventListener('click', restoreHandler);
        }
      }
    }
  });
  observer.observe(m, { attributes: true });

  // Return an object in case callers want to close programmatically
  return {
    close: restoreHandler
  };
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
