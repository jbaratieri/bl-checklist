// ======================================================================
// step16-plant-generator.js — PRANCHETA LUTHIER DIGITAL (STABLE)
// ======================================================================

(function () {

  // 🔒 Feature flag (deixe false no deploy)
  const ENABLE_PLANT = true;

  const INSTR_NAMES = {
    vcl: 'Violão',
    vla: 'Viola',
    cav: 'Cavaquinho',
    uku: 'Ukulele'
  };

  const INSTR_CONFIG = {
    vcl: { scale: 650, frets: 19, compensation: 2.5 },
    vla: { scale: 580, frets: 19, compensation: 2.0 },
    cav: { scale: 340, frets: 15, compensation: 1.5 },
    uku: { scale: 350, frets: 15, compensation: 1.2 }
  };

  const REF_POINTS = {
    // Centro da boca em fração da escala (aproximação visual)
    soundhole: 0.72,
    // Tolerância didática para construção
    toleranceMm: 0.5
  };

  // ----------------------
  // FRETS
  // ----------------------
  function generateFrets(scale, count = 19) {
    const frets = [];
    let previousPos = 0;

    for (let n = 1; n <= count; n++) {
      const pos = scale - (scale / Math.pow(2, n / 12));
      frets.push({
        fret: n,
        pos,
        fromNut: pos,
        fromPrev: pos - previousPos
      });
      previousPos = pos;
    }

    return frets;
  }

  function getFretPos(scale, fretNumber) {
    return scale - (scale / Math.pow(2, fretNumber / 12));
  }

  function calculateBridge(scale, compensationMm) {
    // Ponte/sela fica próxima da escala nominal (com compensação por instrumento).
    return scale + compensationMm;
  }

  function calculateSoundhole(scale) {
    return Math.round(scale * REF_POINTS.soundhole);
  }

  function generatePlant(scale, fretCount = 19, compensationMm = 2, neckJoinFret = 12) {
    const halfScale = getFretPos(scale, 12);
    const neckJoinPos = getFretPos(scale, neckJoinFret);
    const bridge = calculateBridge(scale, compensationMm);
    const soundhole = calculateSoundhole(scale);

    return {
      scale,
      frets: generateFrets(scale, fretCount),
      bridge,
      soundhole,
      compensationMm,
      neckJoinFret,
      neckJoinPos,
      halfScale,
      from12ToBridge: bridge - halfScale
    };
  }

  // ----------------------
  // CANVAS
  // ----------------------
  function drawPlant(canvas, data) {
    const ctx = resizeCanvas(canvas);

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const margin = 24;
    const y = h * 0.5;

    const startX = margin;
    const endX = w - margin;
    const usable = endX - startX;
    const toX = (mm) => startX + (mm / data.scale) * usable;
    const isMobilePortrait = window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;

    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px Arial';
    ctx.textBaseline = 'alphabetic';

    // linha base
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();

    // NUT
    ctx.fillRect(startX, y - 12, 2, 24);
    ctx.fillText('NUT', startX - 20, y + 30);

    // FRETS (modo simplificado no mobile vertical)
    if (!isMobilePortrait) {
      data.frets.forEach(f => {
        const x = toX(f.pos);

        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.strokeStyle = '#777';
        ctx.stroke();

        if ([3,5,7,9,12,15,17,19].includes(f.fret)) {
          ctx.fillText(f.fret, x - 4, y - 14);
        }

        if (f.fret === 12) {
          ctx.beginPath();
          ctx.moveTo(x, y - 14);
          ctx.lineTo(x, y + 14);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      });
    }

    // JUNÇÃO BRAÇO-CORPO (12º/14º)
    const joinX = toX(data.neckJoinPos);
    ctx.beginPath();
    ctx.moveTo(joinX, y - 16);
    ctx.lineTo(joinX, y + 16);
    ctx.strokeStyle = '#2f6f3e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#2f6f3e';
    ctx.fillText(`JUNÇÃO ${data.neckJoinFret}º`, joinX - 28, y + 46);
    ctx.lineWidth = 1;

    // BOCA (na mesma linha dos trastes)
    const holeX = toX(data.soundhole);
    ctx.beginPath();
    ctx.arc(holeX, y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#0077ff';
    ctx.stroke();
    ctx.fillStyle = '#0077ff';
    ctx.fillText('BOCA', holeX - 16, y - 18);

    // PONTE (na escala final, com compensação)
    const bridgeX = toX(data.bridge);
    ctx.fillStyle = '#d11d1d';
    ctx.fillRect(bridgeX - 3, y - 14, 6, 28);
    ctx.fillStyle = '#000';
    ctx.fillText('PONTE', bridgeX - 22, y + 34);

    // Régua destacada (valores principais)
    const twelfthX = toX(data.halfScale);
    const rulerY = Math.min(y + 58, h - 34);
    ctx.strokeStyle = '#b8b8b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, rulerY);
    ctx.lineTo(endX, rulerY);
    ctx.stroke();

    function drawRefMarker(x, color, label, value, up = false, yOffset = 0) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x, rulerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, rulerY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const baseTextY = up ? Math.max(14, y - 30) : Math.min(h - 8, rulerY + 16);
      const textY = up
        ? Math.max(14, baseTextY - yOffset)
        : Math.min(h - 8, baseTextY + yOffset);
      const text = `${label}: ${value.toFixed(1)}mm`;
      const textWidth = ctx.measureText(text).width;
      const minX = startX;
      const maxX = endX - textWidth;
      const textX = Math.max(minX, Math.min(x - (textWidth / 2), maxX));
      ctx.fillText(text, textX, textY);
    }

    drawRefMarker(twelfthX, '#1f1f1f', '12º', data.halfScale, true);
    drawRefMarker(joinX, '#2f6f3e', `${data.neckJoinFret}º`, data.neckJoinPos, false, 0);
    drawRefMarker(holeX, '#0077ff', 'Boca', data.soundhole, false, isMobilePortrait ? 14 : 0);
    drawRefMarker(bridgeX, '#d11d1d', 'Ponte', data.bridge, false, 0);

    // No mobile vertical, destacar apenas os principais marcos.
    if (isMobilePortrait) {
      [twelfthX, joinX, holeX, bridgeX].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y + 20);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
      ctx.lineWidth = 1;
    }
  }

  function resizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    return ctx;
  }

  // ----------------------
  // UI
  // ----------------------
  function buildUI() {
    return `
      <div class="plant-root">

        <h3>Prancheta Luthier Digital</h3>

        <div class="plant-controls">
          <label>
            Instrumento
            <select id="plantInstrument">
              <option value="vcl">Violão</option>
              <option value="vla">Viola</option>
              <option value="cav">Cavaquinho</option>
              <option value="uku">Ukulele</option>
            </select>
          </label>

          <label>
            Escala (mm)
            <input id="plantScale" type="number" value="650" />
          </label>

          <label>
            Junção braço-corpo
            <select id="plantNeckJoin">
              <option value="12">12º traste</option>
              <option value="14">14º traste</option>
            </select>
          </label>

          <label>
            Compensação da sela (mm)
            <input id="plantComp" type="number" step="0.1" value="2.5" />
          </label>
        </div>

        <div id="plantResult"></div>

      </div>
    `;
  }

  function render() {
    const instrument = document.getElementById('plantInstrument').value;
    const scaleInput = document.getElementById('plantScale');
    const neckJoinInput = document.getElementById('plantNeckJoin');
    const compInput = document.getElementById('plantComp');
    const scale = Number(scaleInput.value);
    const neckJoinFret = Number(neckJoinInput.value) || 12;
    const compensationMm = Number(compInput.value);

    const cfg = INSTR_CONFIG[instrument] || INSTR_CONFIG.vcl;
    const fretCount = cfg.frets || 19;
    const data = generatePlant(scale, fretCount, compensationMm, neckJoinFret);
    const isMobilePortrait = window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
    const fretsRows = data.frets.map((f) => `
      <tr>
        <td>${f.fret}</td>
        <td>${f.fromNut.toFixed(2)} mm</td>
        <td>${f.fromPrev.toFixed(2)} mm</td>
      </tr>
    `).join('');

    const el = document.getElementById('plantResult');

    el.innerHTML = `
      <div class="plant-wrapper">

        <h4>${INSTR_NAMES[instrument]} — Escala ${scale}mm</h4>

        <canvas id="plantCanvas" style="width:100%;height:200px;"></canvas>

        <table class="measures-table">
          <tr><td>Escala</td><td>${scale} mm</td></tr>
          <tr><td>Ponte (escala + compensação)</td><td>${data.bridge.toFixed(2)} mm</td></tr>
          <tr><td>Compensação</td><td>${data.compensationMm.toFixed(2)} mm</td></tr>
          <tr><td>Centro da boca (nut-boca)</td><td>${data.soundhole} mm</td></tr>
          <tr><td>Trastes</td><td>${fretCount} posições</td></tr>
          <tr><td>Junção braço-corpo</td><td>${data.neckJoinFret}º traste (${data.neckJoinPos.toFixed(2)} mm)</td></tr>
        </table>

        <h4>Régua de construção</h4>
        <table class="measures-table">
          <tr><td>Nut → 12º traste</td><td>${data.halfScale.toFixed(2)} mm</td></tr>
          <tr><td>Nut → sela/ponte</td><td>${data.bridge.toFixed(2)} mm</td></tr>
          <tr><td>12º traste → sela/ponte</td><td>${data.from12ToBridge.toFixed(2)} mm</td></tr>
          <tr><td>Tolerância sugerida</td><td>+/- ${REF_POINTS.toleranceMm} mm</td></tr>
        </table>

        <h4>Tabela de trastes (fórmula 12-TET)</h4>
        ${isMobilePortrait ? `
          <details class="plant-frets-details">
            <summary>Ver tabela completa de trastes</summary>
            <table class="measures-table">
              <thead>
                <tr>
                  <th>Traste</th>
                  <th>Distância do Nut</th>
                  <th>Distância do Anterior (Δ)</th>
                </tr>
              </thead>
              <tbody>
                ${fretsRows}
              </tbody>
            </table>
          </details>
        ` : `
          <table class="measures-table">
            <thead>
              <tr>
                <th>Traste</th>
                <th>Distância do Nut</th>
                <th>Distância do Anterior (Δ)</th>
              </tr>
            </thead>
            <tbody>
              ${fretsRows}
            </tbody>
          </table>
        `}

      </div>
    `;

    requestAnimationFrame(() => {
      const canvas = document.getElementById('plantCanvas');
      if (canvas) drawPlant(canvas, data);
    });
  }

  function bind() {
    const instrumentEl = document.getElementById('plantInstrument');
    const scaleEl = document.getElementById('plantScale');
    const neckJoinEl = document.getElementById('plantNeckJoin');
    const compEl = document.getElementById('plantComp');

    if (instrumentEl && scaleEl && compEl) {
      instrumentEl.addEventListener('change', () => {
        const cfg = INSTR_CONFIG[instrumentEl.value];
        if (cfg) {
          scaleEl.value = String(cfg.scale);
          compEl.value = String(cfg.compensation);
        }
        render();
      });
    }

    if (scaleEl) {
      scaleEl.addEventListener('input', render);
    }
    if (neckJoinEl) {
      neckJoinEl.addEventListener('change', render);
    }
    if (compEl) {
      compEl.addEventListener('input', render);
    }

    render();
  }

  // ----------------------
  // MODAL (SEM QUEBRAR OUTROS)
  // ----------------------
  function open() {
    if (!ENABLE_PLANT) return;
    if (typeof ensureModal !== 'function') return;

    const m = ensureModal();

    const title = m.querySelector('#measuresTitle');
    const body = m.querySelector('#measuresBody');
    const ft = m.querySelector('.measures-ft');

    if (!body) return;

    // RESET LIMPO
    body.classList.remove('plant-mode');
    body.style.display = '';
    if (ft) ft.style.display = '';

    // CONTEÚDO
    if (title) title.textContent = 'Prancheta Luthier Digital';
    body.classList.add('plant-mode');
    body.innerHTML = buildUI();

    if (ft) ft.style.display = 'none';

    // OPEN
    if (window.measuresModal && typeof window.measuresModal.open === 'function') {
      window.measuresModal.open();
    } else if (typeof m.open === 'function') {
      m.open();
    } else {
      m.classList.add('open');
      document.body.classList.add('modal-open');
      m.style.display = 'flex';
    }

    setTimeout(bind, 50);
  }

  // ----------------------
  // INIT
  // ----------------------
  function init() {
    if (!ENABLE_PLANT) return;

    const btn = document.getElementById('btnPlantGenerator');
    if (btn) btn.addEventListener('click', open);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();