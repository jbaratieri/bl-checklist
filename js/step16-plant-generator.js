// `step16-plant-generator.js`: gera e desenha uma prancheta digital de referencia luthier no canvas.
// Calcula trastes, ponte, boca e medidas basicas por instrumento para apoio visual.
// Atenção: a feature pode depender de flag interna e de elementos de UI especificos.

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
  const PROJECT_FIELDS = {
    instrument: 'selInstrument',
    scale: 'job-scale-mm',
    neckJoin: 'job-neck-join',
    model: 'job-model',
    acousticType: 'job-acoustic-type',
    stringType: 'job-string-type',
    stringCount: 'job-string-count',
    bracingSystem: 'job-bracing-system',
    bracingCustom: 'job-bracing-custom-name'
  };
  const BRACING_LABELS = {
    torres: 'Torres',
    hauser: 'Hauser',
    ramirez: 'Ramirez',
    x_bracing: 'X-Bracing',
    x_adaptado: 'X adaptado',
    leque_3_barras: 'Leque (3 barras)',
    leque_5_barras: 'Leque (5 barras)',
    leque_7_barras: 'Leque (7 barras)',
    'h-bracing': 'H-Bracing',
    custom: 'Custom'
  };
  const BRACING_VALUE_ALIASES = {
    'x': 'x_bracing',
    'xbracing': 'x_bracing',
    'x-bracing': 'x_bracing',
    'xadaptado': 'x_adaptado',
    'x-adaptado': 'x_adaptado',
    'leque_3': 'leque_3_barras',
    'leque_5': 'leque_5_barras',
    'leque_7': 'leque_7_barras',
    'leque3': 'leque_3_barras',
    'leque5': 'leque_5_barras',
    'leque7': 'leque_7_barras',
    'h_bracing': 'h-bracing'
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
  // CROQUIS TRANSVERSAIS (nut + cavalete) — só leitura da geometria do projeto
  // ----------------------
  function readFieldByBind(bind) {
    if (window.BL_MEASURE_PRESET_API && typeof BL_MEASURE_PRESET_API.resolveField === 'function') {
      const el = BL_MEASURE_PRESET_API.resolveField(bind);
      return el && 'value' in el ? String(el.value || '').trim() : '';
    }
    if (!bind) return '';
    if (bind.indexOf('.') === -1) {
      const el = document.getElementById(bind);
      return el && 'value' in el ? String(el.value || '').trim() : '';
    }
    const el = document.querySelector('[data-measure="' + bind + '"]');
    return el && 'value' in el ? String(el.value || '').trim() : '';
  }

  function getScaleWidthSnapshot() {
    const math = window.BL_SCALE_WIDTH_MATH;
    if (!math) return { ok: false, reason: 'missing_math' };

    const nutWidth = readFieldByBind('braco.largura_nut') || readFieldByBind('escala.largura_nut');
    const margin = readFieldByBind('escala.margem_corda') || String(math.DEFAULT_MARGIN_MM);
    const bridge = readFieldByBind('escala.distanciamento_furos_cavalete');
    const stringCount = readFieldByBind('job-string-count');
    let spacingMode = 'strings';
    if (window.BL_SCALE_WIDTH && typeof BL_SCALE_WIDTH.currentSpacingMode === 'function') {
      spacingMode = BL_SCALE_WIDTH.currentSpacingMode();
    } else if ((window.BL_INSTRUMENT && BL_INSTRUMENT.get && BL_INSTRUMENT.get()) === 'vla') {
      spacingMode = 'pairs';
    }

    if (!nutWidth) return { ok: false, reason: 'missing_nut', nutWidth, margin, bridge, stringCount, spacingMode };
    if (!bridge) return { ok: false, reason: 'missing_bridge', nutWidth, margin, bridge, stringCount, spacingMode };
    if (!stringCount) return { ok: false, reason: 'missing_strings', nutWidth, margin, bridge, stringCount, spacingMode };

    const geo = math.computeScaleGeometry(nutWidth, margin, bridge, [0, 12], stringCount, { spacingMode });
    if (!geo || !geo.ok) {
      return {
        ok: false,
        reason: (geo && geo.error) || 'invalid_geometry',
        nutWidth,
        margin,
        bridge,
        stringCount,
        spacingMode,
        geo
      };
    }
    if (!Number.isFinite(geo.adjacentStringSpacingNut)) {
      const adjReason = spacingMode === 'pairs' && Number(stringCount) % 2 !== 0
        ? 'odd_pairs'
        : 'missing_adjacent';
      return { ok: false, reason: adjReason, nutWidth, margin, bridge, stringCount, spacingMode, geo };
    }
    return { ok: true, reason: null, nutWidth, margin, bridge, stringCount, spacingMode, geo };
  }

  function incompleteMessage(reason) {
    const map = {
      missing_math: 'Módulo de geometria da escala indisponível.',
      missing_nut: 'Informe a largura do braço no nut (Medidas).',
      missing_bridge: 'Informe o distanciamento dos furos do cavalete (Medidas).',
      missing_strings: 'Informe o número de cordas (Dados do projeto).',
      missing_adjacent: 'Não foi possível calcular o espaçamento entre cordas.',
      odd_pairs: 'Viola: informe nº par de cordas (ex.: 10 = 5 pares).',
      odd_string_count_for_pairs: 'Viola: informe nº par de cordas (ex.: 10 = 5 pares).',
      margin_too_large: 'Margem inválida em relação à largura do nut.',
      invalid_geometry: 'Complete os dados em Medidas para ver o croqui.'
    };
    return map[reason] || map.invalid_geometry;
  }

  function drawEmptySketch(canvas, message) {
    const ctx = resizeCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f3ebe0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d7c4a8';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = '#7a6248';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = String(message || '').split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 16);
    });
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  function stringCenters(count, totalOuter, midX) {
    const n = Number(count);
    const total = Number(totalOuter);
    if (!(n >= 2) || !Number.isFinite(total) || total <= 0) return [];
    const start = midX - total / 2;
    const step = total / (n - 1);
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(start + i * step);
    return pts;
  }

  function drawPairMark(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x - 3, y, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 3, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
  }

  function drawNutSketch(canvas, snap) {
    if (!snap || !snap.ok) {
      drawEmptySketch(canvas, incompleteMessage(snap && snap.reason));
      return;
    }
    const geo = snap.geo;
    const math = window.BL_SCALE_WIDTH_MATH;
    const ctx = resizeCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const pad = 28;
    const nutW = geo.nutWidth;
    const usable = w - pad * 2;
    const scaleX = usable / nutW;
    const midY = h * 0.42;
    const barH = Math.min(36, h * 0.28);
    const left = pad;
    const right = pad + nutW * scaleX;
    const midX = (left + right) / 2;
    const byPairs = geo.spacingMode === 'pairs';
    const unitCount = Number.isFinite(geo.unitCount) ? geo.unitCount : geo.stringCount;

    // corpo da escala/nut
    ctx.fillStyle = '#f7f0e6';
    ctx.strokeStyle = '#8a623f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(left, midY - barH / 2, right - left, barH);
    ctx.fill();
    ctx.stroke();

    // margens
    const mPx = geo.margin * scaleX;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#2f6f3e';
    ctx.beginPath();
    ctx.moveTo(left + mPx, midY - barH / 2 - 6);
    ctx.lineTo(left + mPx, midY + barH / 2 + 6);
    ctx.moveTo(right - mPx, midY - barH / 2 - 6);
    ctx.lineTo(right - mPx, midY + barH / 2 + 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // cordas ou centros de pares
    const centers = stringCenters(unitCount, geo.nutStringSpacing * scaleX, midX);
    centers.forEach((x, i) => {
      if (byPairs) {
        drawPairMark(ctx, x, midY);
      } else {
        ctx.beginPath();
        ctx.arc(x, midY, i === 0 || i === centers.length - 1 ? 3.2 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      }
    });

    // cota margem
    ctx.fillStyle = '#2f6f3e';
    ctx.font = '11px Arial';
    ctx.fillText('m ' + math.formatMm(geo.margin, 1), left + 2, midY - barH / 2 - 10);

    // cota total 1ª↔última
    const outerLeft = midX - (geo.nutStringSpacing * scaleX) / 2;
    const outerRight = midX + (geo.nutStringSpacing * scaleX) / 2;
    const cotY = midY + barH / 2 + 18;
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(outerLeft, cotY);
    ctx.lineTo(outerRight, cotY);
    ctx.moveTo(outerLeft, cotY - 4);
    ctx.lineTo(outerLeft, cotY + 4);
    ctx.moveTo(outerRight, cotY - 4);
    ctx.lineTo(outerRight, cotY + 4);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('1ª↔última ' + math.formatMm(geo.nutStringSpacing, 2) + ' mm', midX, cotY + 14);
    ctx.textAlign = 'start';
  }

  function drawBridgeSketch(canvas, snap) {
    if (!snap || !snap.ok) {
      drawEmptySketch(canvas, incompleteMessage(snap && snap.reason));
      return;
    }
    const geo = snap.geo;
    const math = window.BL_SCALE_WIDTH_MATH;
    const ctx = resizeCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const pad = 28;
    const total = geo.bridgeStringSpacing;
    const physical = total + 2 * geo.margin;
    const usable = w - pad * 2;
    const scaleX = usable / physical;
    const midY = h * 0.42;
    const barH = Math.min(28, h * 0.22);
    const left = pad;
    const right = pad + physical * scaleX;
    const midX = (left + right) / 2;
    const byPairs = geo.spacingMode === 'pairs';
    const unitCount = Number.isFinite(geo.unitCount) ? geo.unitCount : geo.stringCount;

    // bloco do cavalete
    ctx.fillStyle = '#efe4d4';
    ctx.strokeStyle = '#8a623f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(left, midY - barH / 2, right - left, barH);
    ctx.fill();
    ctx.stroke();

    // furos / pares
    const centers = stringCenters(unitCount, total * scaleX, midX);
    centers.forEach((x, i) => {
      if (byPairs) {
        ctx.beginPath();
        ctx.arc(x - 3.2, midY, 2.4, 0, Math.PI * 2);
        ctx.arc(x + 3.2, midY, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, midY, i === 0 || i === centers.length - 1 ? 3.4 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });

    // cota total furos
    const outerLeft = midX - (total * scaleX) / 2;
    const outerRight = midX + (total * scaleX) / 2;
    const cotY = midY + barH / 2 + 18;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(outerLeft, cotY);
    ctx.lineTo(outerRight, cotY);
    ctx.moveTo(outerLeft, cotY - 4);
    ctx.lineTo(outerLeft, cotY + 4);
    ctx.moveTo(outerRight, cotY - 4);
    ctx.lineTo(outerRight, cotY + 4);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      (byPairs ? 'pares 1ª↔última ' : 'furos 1ª↔última ') + math.formatMm(total, 2) + ' mm',
      midX,
      cotY + 14
    );
    ctx.textAlign = 'start';
  }

  function fillCrossMeta(el, snap, kind) {
    if (!el) return;
    if (!snap || !snap.ok) {
      el.innerHTML = '<span class="plant-cross-warn">' + incompleteMessage(snap && snap.reason) + '</span>';
      return;
    }
    const math = window.BL_SCALE_WIDTH_MATH;
    const geo = snap.geo;
    const byPairs = geo.spacingMode === 'pairs';
    if (kind === 'nut') {
      const adjLabel = byPairs ? 'Entre pares:' : 'Entre cordas:';
      const unitNote = byPairs
        ? '(' + geo.stringCount + ' cordas → ' + geo.pairCount + ' pares, ' + geo.adjacentGaps + ' intervalos)'
        : '(' + geo.stringCount + ' cordas, ' + geo.adjacentGaps + ' intervalos)';
      el.innerHTML =
        '<div><strong>Largura:</strong> ' + math.formatMm(geo.nutWidth, 1) + ' mm</div>' +
        '<div><strong>Margem:</strong> ' + math.formatMm(geo.margin, 1) + ' mm (cada lado)</div>' +
        '<div><strong>1ª↔última:</strong> ' + math.formatMm(geo.nutStringSpacing, 2) + ' mm</div>' +
        '<div><strong>' + adjLabel + '</strong> ' + math.formatMm(geo.adjacentStringSpacingNut, 2) +
        ' mm <span class="plant-cross-muted">' + unitNote + '</span></div>';
      return;
    }
    const adjBridge = math.getAdjacentStringSpacing(
      geo.bridgeStringSpacing,
      geo.stringCount,
      geo.spacingMode
    );
    el.innerHTML =
      '<div><strong>' + (byPairs ? 'Pares 1ª↔última:' : 'Furos 1ª↔última:') + '</strong> ' +
      math.formatMm(geo.bridgeStringSpacing, 2) + ' mm</div>' +
      '<div><strong>' + (byPairs ? 'Entre pares:' : 'Entre furos:') + '</strong> ' +
      (adjBridge.ok ? math.formatMm(adjBridge.value, 2) + ' mm' : '—') +
      '</div>' +
      '<div><strong>Largura física ref.:</strong> ' +
      math.formatMm(geo.bridgeStringSpacing + 2 * geo.margin, 2) +
      ' mm <span class="plant-cross-muted">(furos + 2×margem)</span></div>';
  }

  function renderCrossSectionSketches() {
    const nutCanvas = document.getElementById('plantNutCanvas');
    const bridgeCanvas = document.getElementById('plantBridgeCanvas');
    if (!nutCanvas && !bridgeCanvas) return;
    const snap = getScaleWidthSnapshot();
    if (nutCanvas) drawNutSketch(nutCanvas, snap);
    if (bridgeCanvas) drawBridgeSketch(bridgeCanvas, snap);
    fillCrossMeta(document.getElementById('plantNutMeta'), snap, 'nut');
    fillCrossMeta(document.getElementById('plantBridgeMeta'), snap, 'bridge');
  }

  // ----------------------
  // UI
  // ----------------------
  function buildUI() {
    return `
      <div class="plant-root">
        <p id="plantProjectMeta" style="margin:0 0 10px;font-size:.9rem;opacity:.8"></p>

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
          <button id="plantSaveScale" type="button" class="btn">Salvar escala no projeto</button>
        </div>

        <div id="plantResult"></div>

      </div>
    `;
  }

  function getProjectContext() {
    const inst = (window.BL_INSTRUMENT && typeof window.BL_INSTRUMENT.get === 'function')
      ? BL_INSTRUMENT.get()
      : (document.getElementById(PROJECT_FIELDS.instrument)?.value || localStorage.getItem('bl:instrument') || 'vcl');
    const scaleRaw = (document.getElementById(PROJECT_FIELDS.scale)?.value || '').toString().trim().replace(',', '.');
    const scale = Number(scaleRaw);
    const modelEl = document.getElementById(PROJECT_FIELDS.model);
    const acousticEl = document.getElementById(PROJECT_FIELDS.acousticType);
    const model = (modelEl && modelEl.options && modelEl.selectedIndex >= 0)
      ? (modelEl.options[modelEl.selectedIndex].textContent || modelEl.value || '').toString().trim()
      : '';
    const acousticType = (acousticEl && acousticEl.options && acousticEl.selectedIndex >= 0)
      ? (acousticEl.options[acousticEl.selectedIndex].textContent || acousticEl.value || '').toString().trim()
      : '';
    const stringType = (document.getElementById(PROJECT_FIELDS.stringType)?.value || '').toString().trim();
    const stringCount = (document.getElementById(PROJECT_FIELDS.stringCount)?.value || '').toString().trim();
    const bracing = (document.getElementById(PROJECT_FIELDS.bracingSystem)?.value || '').toString().trim();
    const bracingCustom = (document.getElementById(PROJECT_FIELDS.bracingCustom)?.value || '').toString().trim();
    const neckJoinRaw = (document.getElementById(PROJECT_FIELDS.neckJoin)?.value || '').toString().trim();
    const neckJoin = (neckJoinRaw === '14' || neckJoinRaw === '12') ? neckJoinRaw : '';
    return {
      inst: INSTR_CONFIG[inst] ? inst : 'vcl',
      scale: Number.isFinite(scale) && scale > 0 ? scale : null,
      neckJoin,
      model,
      acousticType,
      stringType,
      stringCount,
      bracing,
      bracingCustom
    };
  }
  function normalizeBracingValue(raw) {
    const key = (raw || '').toString().trim();
    if (!key) return '';
    return BRACING_VALUE_ALIASES[key] || key;
  }
  function getBracingDisplayLabel(raw) {
    const normalized = normalizeBracingValue(raw);
    return BRACING_LABELS[normalized] || normalized || '—';
  }
  function syncNeckJoinToProject(value) {
    const projectEl = document.getElementById(PROJECT_FIELDS.neckJoin);
    if (!projectEl) return;
    const next = (value === '14' || value === '12') ? value : '12';
    if (String(projectEl.value || '') === next) return;
    projectEl.value = next;
    try { projectEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { projectEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
  }

  function applyProjectContextToPlant() {
    const ctx = getProjectContext();
    const instEl = document.getElementById('plantInstrument');
    const scaleEl = document.getElementById('plantScale');
    const neckJoinEl = document.getElementById('plantNeckJoin');
    const compEl = document.getElementById('plantComp');
    const metaEl = document.getElementById('plantProjectMeta');
    if (!instEl || !scaleEl || !compEl) return;

    instEl.value = ctx.inst;
    const cfg = INSTR_CONFIG[ctx.inst] || INSTR_CONFIG.vcl;
    scaleEl.value = String(ctx.scale || cfg.scale);
    compEl.value = String(cfg.compensation);
    if (neckJoinEl) {
      neckJoinEl.value = ctx.neckJoin || '12';
    }

    if (metaEl) {
      const bracingText = ctx.bracing === 'custom'
        ? ('Custom' + (ctx.bracingCustom ? ` — ${ctx.bracingCustom}` : ''))
        : getBracingDisplayLabel(ctx.bracing);
      metaEl.textContent =
        `Projeto atual: ${INSTR_NAMES[ctx.inst]}` +
        ` | Modelo: ${ctx.model || '—'}` +
        ` | ${ctx.acousticType || '—'}` +
        ` | Cordas: ${ctx.stringCount || '—'} | Tipo: ${ctx.stringType || '—'} | Leque: ${bracingText}` +
        ` | Junção: ${(ctx.neckJoin || '12')}º`;
    }
  }
  function savePlantScaleToProject() {
    const scaleEl = document.getElementById('plantScale');
    const projectScaleEl = document.getElementById(PROJECT_FIELDS.scale);
    if (!scaleEl || !projectScaleEl) return;
    const raw = (scaleEl.value || '').toString().trim().replace(',', '.');
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      alert('Informe uma escala válida em milímetros.');
      return;
    }
    projectScaleEl.value = String(n);
    try { projectScaleEl.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { projectScaleEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    alert('Escala salva no projeto atual.');
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

        <section class="plant-cross-section" aria-label="Geometria transversal do projeto">
          <h4>Geometria transversal</h4>
          <p class="plant-cross-hint">Somente visualização — edite em <strong>Medidas</strong> e nos <strong>Dados do projeto</strong>.</p>
          <div class="plant-cross-grid">
            <article class="plant-cross-card">
              <h5>Nut (vista de topo)</h5>
              <canvas id="plantNutCanvas" class="plant-cross-canvas" width="480" height="140"></canvas>
              <div id="plantNutMeta" class="plant-cross-meta"></div>
            </article>
            <article class="plant-cross-card">
              <h5>Cavalete (furos)</h5>
              <canvas id="plantBridgeCanvas" class="plant-cross-canvas" width="480" height="140"></canvas>
              <div id="plantBridgeMeta" class="plant-cross-meta"></div>
            </article>
          </div>
        </section>

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
      renderCrossSectionSketches();
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
    const btnSaveScale = document.getElementById('plantSaveScale');
    if (btnSaveScale) btnSaveScale.addEventListener('click', savePlantScaleToProject);

    if (scaleEl) {
      scaleEl.addEventListener('input', render);
    }
    if (neckJoinEl) {
      neckJoinEl.addEventListener('change', () => {
        syncNeckJoinToProject(neckJoinEl.value);
        render();
      });
    }
    if (compEl) {
      compEl.addEventListener('input', render);
    }

    applyProjectContextToPlant();
    render();

    // Atualiza croquis transversais quando a geometria da escala muda no projeto.
    if (!window.__BL_PLANT_SCALE_WIDTH_HOOKED__) {
      window.__BL_PLANT_SCALE_WIDTH_HOOKED__ = true;
      window.addEventListener('bl:scale-width-change', () => {
        if (document.getElementById('plantNutCanvas') || document.getElementById('plantBridgeCanvas')) {
          renderCrossSectionSketches();
        }
      });
      window.addEventListener('resize', () => {
        if (document.getElementById('plantNutCanvas') || document.getElementById('plantBridgeCanvas')) {
          renderCrossSectionSketches();
        }
      });
    }
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
    window.openPlantGenerator = open;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();