// Math + defaults for parametric fingerboard/scale width.
// Works in browser (window.BL_SCALE_WIDTH_MATH) and Node (module.exports).
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BL_SCALE_WIDTH_MATH = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  var DEFAULT_MARGIN_MM = 3.5;

  /**
   * Single source of defaults for distanciamento_furos_cavalete (mm) by #job-model value.
   * Models omitted here have no automatic default (must be set explicitly by the user).
   */
  var BRIDGE_STRING_SPACING_BY_MODEL = {
    violao_classico: 60,
    violao_folk: 55,
    violao_om: 55,
    violao_jumbo: 55,
    violao_flat: 55,
    viola_caipira: 56,
    viola_cinturada: 56,
    viola_610: 56,
    cavaquinho_tradicional: 23,
    ukulele_soprano: 23,
    ukulele_concert: 24,
    ukulele_tenor: 27,
    ukulele_baritono: 29
  };

  function toNumber(value) {
    if (value == null || value === '') return NaN;
    if (typeof value === 'number') return value;
    var s = String(value).trim().replace(',', '.');
    // Ranges like "13–15" or "62–63" are not usable as a single width.
    if (/[–—-]/.test(s) && !/^\d+([.,]\d+)?$/.test(s)) return NaN;
    var n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function roundMm(n, digits) {
    var d = digits == null ? 2 : digits;
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }

  function formatMm(n, digits) {
    if (!Number.isFinite(n)) return '';
    return String(roundMm(n, digits == null ? 2 : digits));
  }

  function getBridgeStringSpacing(modelId) {
    var key = String(modelId || '').trim();
    if (!key || !Object.prototype.hasOwnProperty.call(BRIDGE_STRING_SPACING_BY_MODEL, key)) {
      return null;
    }
    return BRIDGE_STRING_SPACING_BY_MODEL[key];
  }

  function getScaleMargin(modelId) {
    // Global default; modelId reserved for future per-model margins.
    void modelId;
    return DEFAULT_MARGIN_MM;
  }

  function getNutStringSpacing(nutWidth, margin) {
    var nut = toNumber(nutWidth);
    var m = toNumber(margin);
    if (!Number.isFinite(nut) || !Number.isFinite(m)) {
      return { ok: false, error: 'invalid_input', value: NaN };
    }
    if (m < 0) {
      return { ok: false, error: 'negative_margin', value: NaN };
    }
    if (2 * m >= nut) {
      return { ok: false, error: 'margin_too_large', value: NaN };
    }
    return { ok: true, error: null, value: nut - 2 * m };
  }

  /**
   * Resolve unidades de espaçamento transversal.
   * mode 'strings' → gaps = n−1 (violão, cav, uke…)
   * mode 'pairs'   → viola caipira: n cordas em n/2 pares; gaps = pares−1
   */
  function resolveSpacingUnits(stringCount, mode) {
    var n = toNumber(stringCount);
    var spacingMode = mode === 'pairs' ? 'pairs' : 'strings';
    if (!Number.isFinite(n)) {
      return {
        ok: false,
        error: 'invalid_input',
        mode: spacingMode,
        stringCount: n,
        unitCount: NaN,
        gaps: NaN,
        pairCount: NaN
      };
    }
    if (n < 2) {
      return {
        ok: false,
        error: 'string_count_too_low',
        mode: spacingMode,
        stringCount: n,
        unitCount: NaN,
        gaps: NaN,
        pairCount: NaN
      };
    }
    if (spacingMode === 'pairs') {
      if (n % 2 !== 0) {
        return {
          ok: false,
          error: 'odd_string_count_for_pairs',
          mode: spacingMode,
          stringCount: n,
          unitCount: NaN,
          gaps: NaN,
          pairCount: NaN
        };
      }
      var pairs = n / 2;
      if (pairs < 2) {
        return {
          ok: false,
          error: 'pair_count_too_low',
          mode: spacingMode,
          stringCount: n,
          unitCount: NaN,
          gaps: NaN,
          pairCount: pairs
        };
      }
      return {
        ok: true,
        error: null,
        mode: spacingMode,
        stringCount: n,
        unitCount: pairs,
        gaps: pairs - 1,
        pairCount: pairs
      };
    }
    return {
      ok: true,
      error: null,
      mode: spacingMode,
      stringCount: n,
      unitCount: n,
      gaps: n - 1,
      pairCount: NaN
    };
  }

  /**
   * Espaçamento entre centros adjacentes (cordas ou pares).
   * totalOuterSpacing = distância entre 1ª e última corda (externas).
   * mode: 'strings' | 'pairs'
   */
  function getAdjacentStringSpacing(totalOuterSpacing, stringCount, mode) {
    var total = toNumber(totalOuterSpacing);
    var units = resolveSpacingUnits(stringCount, mode);
    if (!Number.isFinite(total)) {
      return {
        ok: false,
        error: 'invalid_input',
        value: NaN,
        gaps: units.gaps,
        mode: units.mode,
        unitCount: units.unitCount,
        pairCount: units.pairCount,
        stringCount: units.stringCount
      };
    }
    if (!units.ok) {
      return {
        ok: false,
        error: units.error,
        value: NaN,
        gaps: units.gaps,
        mode: units.mode,
        unitCount: units.unitCount,
        pairCount: units.pairCount,
        stringCount: units.stringCount
      };
    }
    return {
      ok: true,
      error: null,
      value: total / units.gaps,
      gaps: units.gaps,
      mode: units.mode,
      unitCount: units.unitCount,
      pairCount: units.pairCount,
      stringCount: units.stringCount
    };
  }

  function temperedFraction(fret) {
    var x = toNumber(fret);
    if (!Number.isFinite(x) || x < 0) return NaN;
    return 1 - Math.pow(2, -x / 12);
  }

  function getStringSpacingAtFret(fret, nutStringSpacing, bridgeStringSpacing) {
    var sNut = toNumber(nutStringSpacing);
    var sBr = toNumber(bridgeStringSpacing);
    var f = temperedFraction(fret);
    if (!Number.isFinite(sNut) || !Number.isFinite(sBr) || !Number.isFinite(f)) return NaN;
    return sNut + (sBr - sNut) * f;
  }

  function getScaleWidthAtFret(fret, nutStringSpacing, bridgeStringSpacing, margin) {
    var s = getStringSpacingAtFret(fret, nutStringSpacing, bridgeStringSpacing);
    var m = toNumber(margin);
    if (!Number.isFinite(s) || !Number.isFinite(m)) return NaN;
    return s + 2 * m;
  }

  /**
   * Full parametric solution from physical nut width + margin + bridge hole spacing.
   * stringCount (optional) enables adjacent spacing at nut (and per fret).
   * options.spacingMode: 'strings' | 'pairs' (viola).
   */
  function computeScaleGeometry(nutWidth, margin, bridgeStringSpacing, frets, stringCount, options) {
    var opts = options || {};
    var spacingMode = opts.spacingMode === 'pairs' ? 'pairs' : 'strings';
    var nut = toNumber(nutWidth);
    var m = toNumber(margin);
    var bridge = toNumber(bridgeStringSpacing);
    var nStrings = toNumber(stringCount);
    var fretList = Array.isArray(frets) && frets.length ? frets : [0, 12, 14, 19];

    var spacing = getNutStringSpacing(nut, m);
    if (!spacing.ok) {
      return {
        ok: false,
        error: spacing.error,
        nutWidth: nut,
        margin: m,
        bridgeStringSpacing: bridge,
        stringCount: nStrings,
        spacingMode: spacingMode,
        nutStringSpacing: NaN,
        adjacentStringSpacingNut: NaN,
        atFret: {}
      };
    }

    var adjacentNut = Number.isFinite(nStrings)
      ? getAdjacentStringSpacing(spacing.value, nStrings, spacingMode)
      : {
        ok: false,
        error: 'missing_string_count',
        value: NaN,
        gaps: NaN,
        mode: spacingMode,
        unitCount: NaN,
        pairCount: NaN,
        stringCount: nStrings
      };

    if (!Number.isFinite(bridge)) {
      return {
        ok: false,
        error: 'missing_bridge_spacing',
        nutWidth: nut,
        margin: m,
        bridgeStringSpacing: bridge,
        stringCount: nStrings,
        spacingMode: spacingMode,
        unitCount: adjacentNut.unitCount,
        pairCount: adjacentNut.pairCount,
        nutStringSpacing: spacing.value,
        adjacentStringSpacingNut: adjacentNut.ok ? adjacentNut.value : NaN,
        adjacentGaps: adjacentNut.ok ? adjacentNut.gaps : NaN,
        atFret: {}
      };
    }

    var atFret = {};
    fretList.forEach(function (fret) {
      var s = getStringSpacingAtFret(fret, spacing.value, bridge);
      var b = getScaleWidthAtFret(fret, spacing.value, bridge, m);
      var adj = adjacentNut.ok
        ? getAdjacentStringSpacing(s, nStrings, spacingMode)
        : { ok: false, value: NaN };
      atFret[fret] = {
        stringSpacing: s,
        scaleWidth: b,
        adjacentStringSpacing: adj.ok ? adj.value : NaN,
        leftMargin: m,
        rightMargin: m
      };
    });

    return {
      ok: true,
      error: null,
      nutWidth: nut,
      margin: m,
      bridgeStringSpacing: bridge,
      stringCount: nStrings,
      spacingMode: spacingMode,
      unitCount: adjacentNut.ok ? adjacentNut.unitCount : NaN,
      pairCount: adjacentNut.ok ? adjacentNut.pairCount : NaN,
      nutStringSpacing: spacing.value,
      adjacentStringSpacingNut: adjacentNut.ok ? adjacentNut.value : NaN,
      adjacentGaps: adjacentNut.ok ? adjacentNut.gaps : NaN,
      atFret: atFret
    };
  }

  return {
    DEFAULT_MARGIN_MM: DEFAULT_MARGIN_MM,
    BRIDGE_STRING_SPACING_BY_MODEL: BRIDGE_STRING_SPACING_BY_MODEL,
    toNumber: toNumber,
    roundMm: roundMm,
    formatMm: formatMm,
    getBridgeStringSpacing: getBridgeStringSpacing,
    getScaleMargin: getScaleMargin,
    getNutStringSpacing: getNutStringSpacing,
    resolveSpacingUnits: resolveSpacingUnits,
    getAdjacentStringSpacing: getAdjacentStringSpacing,
    temperedFraction: temperedFraction,
    getStringSpacingAtFret: getStringSpacingAtFret,
    getScaleWidthAtFret: getScaleWidthAtFret,
    computeScaleGeometry: computeScaleGeometry
  };
});
