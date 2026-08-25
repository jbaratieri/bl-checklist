// DOM integration for parametric scale width.
// Depends on BL_SCALE_WIDTH_MATH. Uses braco.largura_nut as official nut width source.
(function () {
  'use strict';

  var MATH = null;
  var RECALC_TIMER = null;
  var APPLYING = false;

  var BINDS = {
    nutWidth: 'braco.largura_nut',
    nutWidthEscala: 'escala.largura_nut',
    margin: 'escala.margem_corda',
    bridgeSpacing: 'escala.distanciamento_furos_cavalete',
    nutStringSpacing: 'escala.distanciamento_cordas_nut',
    adjacentNutSpacing: 'escala.espacamento_entre_cordas_nut',
    width12Braco: 'braco.largura_casa12',
    width12Escala: 'escala.largura_casa12',
    width14: 'escala.largura_casa14',
    width19: 'escala.largura_casa19',
    model: 'job-model',
    stringCount: 'job-string-count'
  };

  var INPUT_BINDS = [BINDS.nutWidth, BINDS.nutWidthEscala, BINDS.margin, BINDS.bridgeSpacing];

  function math() {
    return MATH || window.BL_SCALE_WIDTH_MATH || null;
  }

  function resolveField(bind) {
    if (window.BL_MEASURE_PRESET_API && typeof BL_MEASURE_PRESET_API.resolveField === 'function') {
      return BL_MEASURE_PRESET_API.resolveField(bind);
    }
    if (!bind) return null;
    if (bind.indexOf('.') === -1) return document.getElementById(bind);
    return document.querySelector('[data-measure="' + bind + '"]');
  }

  function readField(bind) {
    var el = resolveField(bind);
    return el && 'value' in el ? String(el.value || '').trim() : '';
  }

  function writeField(bind, value, opts) {
    opts = opts || {};
    var el = resolveField(bind);
    if (!el || !('value' in el)) return false;
    var next = value == null ? '' : String(value);
    if (String(el.value || '') === next) return true;
    el.value = next;
    if (!opts.silent) {
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    } else {
      // Still persist calculated/writable .persist fields without recursive recalc storms.
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    }
    return true;
  }

  function currentModelId() {
    return readField(BINDS.model) || '';
  }

  function currentInstrument() {
    if (window.BL_INSTRUMENT && typeof BL_INSTRUMENT.get === 'function') {
      return BL_INSTRUMENT.get();
    }
    try {
      return localStorage.getItem('bl:instrument') || 'vcl';
    } catch (_) {
      return 'vcl';
    }
  }

  /** Viola caipira: espaçamento entre pares (cursos), não entre cordas individuais. */
  function currentSpacingMode() {
    return currentInstrument() === 'vla' ? 'pairs' : 'strings';
  }

  function adjacentHint(mode) {
    return mode === 'pairs'
      ? 'Calculado: distanciamento 1ª↔última ÷ (nº pares − 1)'
      : 'Calculado: distanciamento 1ª↔última ÷ (nº cordas − 1)';
  }

  function updateAdjacentFieldHint(mode) {
    var hint = document.getElementById('escala-espacamento-entre-cordas-hint');
    var label = document.getElementById('escala-espaco-entre-cordas-label');
    if (hint) {
      hint.textContent = mode === 'pairs'
        ? 'Entre centros de pares adjacentes. Calculado: (1ª↔última) ÷ (nº pares − 1).'
        : 'Entre centros adjacentes. Calculado: (1ª↔última) ÷ (nº cordas − 1).';
    }
    if (label) {
      label.textContent = mode === 'pairs'
        ? 'Distanciamento entre pares no nut (mm):'
        : 'Distanciamento entre cordas no nut (mm):';
    }
  }

  function patchModelPresets() {
    var m = math();
    var presets = window.BL_MODEL_MEASURE_PRESETS;
    if (!m || !presets) return;
    Object.keys(m.BRIDGE_STRING_SPACING_BY_MODEL).forEach(function (modelId) {
      var preset = presets[modelId];
      if (!preset || !preset.values) return;
      preset.values[BINDS.margin] = m.formatMm(m.DEFAULT_MARGIN_MM, 1);
      preset.values[BINDS.bridgeSpacing] = m.formatMm(m.BRIDGE_STRING_SPACING_BY_MODEL[modelId], 1);
    });
  }

  function ensureDefaults(opts) {
    opts = opts || {};
    var onlyEmpty = opts.onlyEmpty !== false;
    var m = math();
    if (!m) return;
    var modelId = currentModelId();

    var marginEl = resolveField(BINDS.margin);
    if (marginEl) {
      var curMargin = readField(BINDS.margin);
      if (!onlyEmpty || !curMargin) {
        writeField(BINDS.margin, m.formatMm(m.getScaleMargin(modelId), 1), { silent: true });
      }
    }

    var bridgeDefault = m.getBridgeStringSpacing(modelId);
    var bridgeEl = resolveField(BINDS.bridgeSpacing);
    if (bridgeEl && bridgeDefault != null) {
      var curBridge = readField(BINDS.bridgeSpacing);
      if (!onlyEmpty || !curBridge) {
        writeField(BINDS.bridgeSpacing, m.formatMm(bridgeDefault, 1), { silent: true });
      }
    }
  }

  function setCalculatedState(el, ok, title) {
    if (!el) return;
    el.readOnly = true;
    el.classList.add('is-calculated');
    el.setAttribute('aria-readonly', 'true');
    if (title) el.title = title;
    el.classList.toggle('is-invalid', !ok);
  }

  function recalculate() {
    var m = math();
    if (!m || APPLYING) return null;
    if (window.__BL_PERSIST_APPLYING__) return null;

    APPLYING = true;
    try {
      ensureDefaults({ onlyEmpty: true });

      var nutRaw = readField(BINDS.nutWidth) || readField(BINDS.nutWidthEscala);
      var marginRaw = readField(BINDS.margin);
      var bridgeRaw = readField(BINDS.bridgeSpacing);
      var stringCountRaw = readField(BINDS.stringCount);
      var spacingMode = currentSpacingMode();
      updateAdjacentFieldHint(spacingMode);

      // Prefer braço nut as official source; keep escala nut mirrored when braço has a value.
      if (readField(BINDS.nutWidth)) {
        writeField(BINDS.nutWidthEscala, m.formatMm(m.toNumber(readField(BINDS.nutWidth)), 1), { silent: true });
      }

      var geo = m.computeScaleGeometry(
        nutRaw,
        marginRaw || m.DEFAULT_MARGIN_MM,
        bridgeRaw,
        [0, 12, 14, 19],
        stringCountRaw,
        { spacingMode: spacingMode }
      );

      var nutSpacingEl = resolveField(BINDS.nutStringSpacing);
      var adjEl = resolveField(BINDS.adjacentNutSpacing);
      var w14El = resolveField(BINDS.width14);
      var w19El = resolveField(BINDS.width19);
      var adjOk = !!(geo && Number.isFinite(geo.adjacentStringSpacingNut));
      setCalculatedState(nutSpacingEl, !!(geo && geo.ok), 'Calculado: largura do nut − 2 × margem');
      setCalculatedState(adjEl, adjOk, adjacentHint(spacingMode));
      setCalculatedState(w14El, !!(geo && geo.ok), 'Calculado a partir do nut, margem e furos do cavalete');
      setCalculatedState(w19El, !!(geo && geo.ok), 'Calculado a partir do nut, margem e furos do cavalete');

      if (!geo || !geo.ok) {
        writeField(BINDS.nutStringSpacing, '', { silent: true });
        writeField(BINDS.adjacentNutSpacing, '', { silent: true });
        writeField(BINDS.width14, '', { silent: true });
        writeField(BINDS.width19, '', { silent: true });
        // Ainda assim podemos mostrar o espaçamento adjacente se o nut total já for válido.
        if (geo && Number.isFinite(geo.nutStringSpacing) && Number.isFinite(geo.adjacentStringSpacingNut)) {
          writeField(BINDS.nutStringSpacing, m.formatMm(geo.nutStringSpacing, 2), { silent: true });
          writeField(BINDS.adjacentNutSpacing, m.formatMm(geo.adjacentStringSpacingNut, 2), { silent: true });
        }
        return geo;
      }

      writeField(BINDS.nutStringSpacing, m.formatMm(geo.nutStringSpacing, 2), { silent: true });
      if (Number.isFinite(geo.adjacentStringSpacingNut)) {
        writeField(BINDS.adjacentNutSpacing, m.formatMm(geo.adjacentStringSpacingNut, 2), { silent: true });
      } else {
        writeField(BINDS.adjacentNutSpacing, '', { silent: true });
      }

      var b12 = geo.atFret[12] && geo.atFret[12].scaleWidth;
      var b14 = geo.atFret[14] && geo.atFret[14].scaleWidth;
      var b19 = geo.atFret[19] && geo.atFret[19].scaleWidth;

      if (Number.isFinite(b12)) {
        writeField(BINDS.width12Escala, m.formatMm(b12, 2), { silent: true });
        writeField(BINDS.width12Braco, m.formatMm(b12, 2), { silent: true });
      }
      if (Number.isFinite(b14)) writeField(BINDS.width14, m.formatMm(b14, 2), { silent: true });
      if (Number.isFinite(b19)) writeField(BINDS.width19, m.formatMm(b19, 2), { silent: true });

      try {
        window.dispatchEvent(new CustomEvent('bl:scale-width-change', { detail: geo }));
      } catch (_) {}

      return geo;
    } finally {
      APPLYING = false;
    }
  }

  function scheduleRecalculate() {
    if (RECALC_TIMER) clearTimeout(RECALC_TIMER);
    RECALC_TIMER = setTimeout(function () {
      RECALC_TIMER = null;
      recalculate();
    }, 40);
  }

  function onFieldEvent(e) {
    var t = e && e.target;
    if (!t) return;
    if (APPLYING) return;
    if (window.__BL_PERSIST_APPLYING__) return;

    var bind = t.getAttribute('data-measure') || t.id || '';
    var watched =
      bind === BINDS.nutWidth ||
      bind === BINDS.nutWidthEscala ||
      bind === BINDS.margin ||
      bind === BINDS.bridgeSpacing ||
      bind === BINDS.model ||
      bind === BINDS.stringCount ||
      t.id === 'job-model' ||
      t.id === 'job-string-count' ||
      t.id === 'braco-largura-nut-sec02' ||
      t.id === 'escala-largura-nut-sec08' ||
      t.id === 'escala-margem-corda' ||
      t.id === 'escala-dist-furos-cavalete';

    if (!watched) return;

    if (t.id === 'job-model' || bind === BINDS.model) {
      ensureDefaults({ onlyEmpty: true });
    }
    scheduleRecalculate();
  }

  function afterPresetApply() {
    // After ODS apply, enforce scale-width defaults from central config when missing,
    // then recompute derived widths (casa 12/14/19).
    ensureDefaults({ onlyEmpty: true });
    recalculate();
  }

  function summaryRows() {
    var m = math();
    if (!m) return [];
    var stringCountRaw = readField(BINDS.stringCount);
    var spacingMode = currentSpacingMode();
    var geo = m.computeScaleGeometry(
      readField(BINDS.nutWidth) || readField(BINDS.nutWidthEscala),
      readField(BINDS.margin) || m.DEFAULT_MARGIN_MM,
      readField(BINDS.bridgeSpacing),
      [0, 12, 14, 19],
      stringCountRaw,
      { spacingMode: spacingMode }
    );
    var adjOrigin = spacingMode === 'pairs'
      ? 'Calculado (total ÷ (pares − 1))'
      : 'Calculado (total ÷ (n − 1))';
    var adjLabel = spacingMode === 'pairs'
      ? 'Distanciamento entre pares no nut'
      : 'Distanciamento entre cordas no nut';
    var rows = [
      {
        label: 'Largura do braço no nut',
        value: readField(BINDS.nutWidth) || readField(BINDS.nutWidthEscala) || '—',
        origin: 'Entrada'
      },
      {
        label: 'Número de cordas',
        value: stringCountRaw || '—',
        origin: 'Entrada / Projeto'
      },
      {
        label: 'Margem da corda à borda',
        value: readField(BINDS.margin) || String(m.DEFAULT_MARGIN_MM),
        origin: 'Entrada / Default'
      },
      {
        label: 'Distanciamento das cordas no nut (1ª↔última)',
        value: geo && Number.isFinite(geo.nutStringSpacing) ? m.formatMm(geo.nutStringSpacing, 2) : '—',
        origin: 'Calculado'
      },
      {
        label: adjLabel,
        value: geo && Number.isFinite(geo.adjacentStringSpacingNut)
          ? m.formatMm(geo.adjacentStringSpacingNut, 2)
          : '—',
        origin: adjOrigin
      },
      {
        label: 'Distanciamento dos furos do cavalete',
        value: readField(BINDS.bridgeSpacing) || '—',
        origin: 'Entrada / Default'
      }
    ];
    if (geo && geo.ok) {
      [12, 14, 19].forEach(function (fret) {
        var item = geo.atFret[fret];
        rows.push({
          label: 'Largura da escala na casa ' + fret,
          value: item ? m.formatMm(item.scaleWidth, 2) : '—',
          origin: 'Calculado'
        });
      });
    }
    return rows;
  }

  function init() {
    MATH = window.BL_SCALE_WIDTH_MATH || null;
    if (!MATH) {
      console.warn('[ScaleWidth] BL_SCALE_WIDTH_MATH ausente');
      return;
    }
    patchModelPresets();
    ensureDefaults({ onlyEmpty: true });
    recalculate();

    document.addEventListener('input', onFieldEvent, true);
    document.addEventListener('change', onFieldEvent, true);
    window.addEventListener('bl:project-change', function () {
      setTimeout(function () {
        ensureDefaults({ onlyEmpty: true });
        recalculate();
      }, 180);
    });
    window.addEventListener('bl:instrument-change', function () {
      setTimeout(function () {
        ensureDefaults({ onlyEmpty: true });
        recalculate();
      }, 180);
    });
  }

  window.BL_SCALE_WIDTH = {
    BINDS: BINDS,
    recalculate: recalculate,
    ensureDefaults: ensureDefaults,
    afterPresetApply: afterPresetApply,
    summaryRows: summaryRows,
    getBridgeStringSpacing: function (modelId) {
      return math() ? math().getBridgeStringSpacing(modelId) : null;
    },
    getScaleMargin: function (modelId) {
      return math() ? math().getScaleMargin(modelId) : null;
    },
    getNutStringSpacing: function (nutWidth, margin) {
      return math() ? math().getNutStringSpacing(nutWidth, margin) : { ok: false, error: 'no_math', value: NaN };
    },
    getAdjacentStringSpacing: function (totalOuterSpacing, stringCount, mode) {
      return math()
        ? math().getAdjacentStringSpacing(totalOuterSpacing, stringCount, mode || currentSpacingMode())
        : { ok: false, error: 'no_math', value: NaN };
    },
    currentSpacingMode: currentSpacingMode,
    getStringSpacingAtFret: function (fret, nutStringSpacing, bridgeStringSpacing) {
      return math() ? math().getStringSpacingAtFret(fret, nutStringSpacing, bridgeStringSpacing) : NaN;
    },
    getScaleWidthAtFret: function (fret, nutStringSpacing, bridgeStringSpacing, margin) {
      return math() ? math().getScaleWidthAtFret(fret, nutStringSpacing, bridgeStringSpacing, margin) : NaN;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
