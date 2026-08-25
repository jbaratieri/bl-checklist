// Modal Medidas com mapa visual (figura + hotspots) e presets por modelo (ODS).
// Substitui o conteúdo de #measuresModal ao abrir, mantendo a API openMeasuresModal.
(function () {
  'use strict';

  var MAP_SRC = './assets/measures/mapa-medidas.png?v=20260815-2';
  var state = {
    mode: 'mapa', // mapa | tabela
    activeId: null,
    overwrite: false
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function instrCode() {
    if (window.BL_INSTRUMENT && typeof BL_INSTRUMENT.get === 'function') return BL_INSTRUMENT.get();
    return localStorage.getItem('bl:instrument') || 'vcl';
  }

  function instrName() {
    var map = { vcl: 'Violão', vla: 'Viola', cav: 'Cavaquinho', uku: 'Ukulele' };
    return map[instrCode()] || instrCode();
  }

  function currentModelId() {
    var el = document.getElementById('job-model');
    return el ? String(el.value || '').trim() : '';
  }

  function currentModelLabel() {
    var el = document.getElementById('job-model');
    if (!el || !el.options || el.selectedIndex < 0) return '';
    var opt = el.options[el.selectedIndex];
    return (opt && opt.textContent ? opt.textContent : el.value || '').trim();
  }

  function presetForCurrentModel() {
    var api = window.BL_MEASURE_PRESET_API;
    if (!api) return null;
    return api.getByModel(currentModelId());
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

  function writeField(bind, value) {
    var el = resolveField(bind);
    if (!el || !('value' in el)) return false;
    el.value = value == null ? '' : String(value);
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    return true;
  }

  function hotspots() {
    return (window.BL_MEASURE_HOTSPOTS || []).slice();
  }

  function ensureWideModal(m) {
    var dlg = m && m.querySelector('.measures-dlg');
    if (dlg) dlg.classList.add('measures-dlg--figure');
  }

  function setFooterVisible(m, visible) {
    var ft = m && m.querySelector('.measures-ft');
    if (!ft) return;
    ft.style.display = visible ? '' : 'none';
  }

  function buildToolbar(preset) {
    var modelLabel = currentModelLabel() || 'modelo não selecionado';
    var hasPreset = !!(preset && preset.values);
    return '' +
      '<div class="mm-toolbar">' +
        '<div class="mm-toolbar-meta">' +
          '<strong>' + instrName() + '</strong>' +
          '<span>Modelo: ' + escapeHtml(modelLabel) + '</span>' +
          (hasPreset
            ? '<span class="mm-pill mm-pill--ok">Preset ODS disponível</span>'
            : '<span class="mm-pill mm-pill--warn">Sem preset ODS para este modelo</span>') +
        '</div>' +
        '<div class="mm-toolbar-actions">' +
          '<div class="mm-mode-toggle" role="tablist" aria-label="Modo de visualização">' +
            '<button type="button" class="btn mm-mode-btn' + (state.mode === 'mapa' ? ' is-active' : '') + '" data-mm-mode="mapa">Mapa</button>' +
            '<button type="button" class="btn mm-mode-btn' + (state.mode === 'tabela' ? ' is-active' : '') + '" data-mm-mode="tabela">Tabela</button>' +
          '</div>' +
          '<button type="button" class="btn primary" id="mmApplyPreset" ' + (hasPreset ? '' : 'disabled ') + 'title="Preenche campos ligados ao ODS">' +
            'Aplicar referência do modelo' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hotspotFilled(hs) {
    return !!readField(hs.bind);
  }

  function buildMapPanel(preset) {
    var active = state.activeId || (hotspots()[0] && hotspots()[0].id);
    state.activeId = active;
    var spots = hotspots().map(function (hs) {
      var filled = hotspotFilled(hs);
      var isActive = hs.id === active;
      return '<button type="button" class="mm-hotspot' +
        (filled ? ' is-filled' : '') +
        (isActive ? ' is-active' : '') +
        (hs.hasPreset ? '' : ' is-extra') +
        '" style="left:' + hs.x + '%;top:' + hs.y + '%" data-mm-hotspot="' + hs.id + '" title="' +
        escapeHtml(hs.label) + '" aria-label="' + escapeHtml(hs.label) + '"></button>';
    }).join('');

    return '' +
      '<div class="mm-map-layout">' +
        '<div class="mm-map-stage">' +
          '<img class="mm-map-img" src="' + MAP_SRC + '" alt="Mapa de medidas do instrumento">' +
          '<div class="mm-hotspots">' + spots + '</div>' +
        '</div>' +
        '<aside class="mm-editor" id="mmEditor">' + buildEditor(preset) + '</aside>' +
      '</div>';
  }

  function findHotspot(id) {
    return hotspots().find(function (h) { return h.id === id; }) || null;
  }

  function buildEditor(preset) {
    var hs = findHotspot(state.activeId) || hotspots()[0];
    if (!hs) {
      return '<p class="mm-empty">Nenhum ponto de medida configurado.</p>';
    }
    var current = readField(hs.bind);
    var ref = '';
    if (preset && preset.values && hs.bind in preset.values) {
      ref = String(preset.values[hs.bind] || '');
    }
    var note = preset && preset.note ? preset.note : '';

    return '' +
      '<div class="mm-editor-card">' +
        '<h4>' + escapeHtml(hs.label) + '</h4>' +
        '<p class="mm-editor-bind"><code>' + escapeHtml(hs.bind) + '</code>' +
          (hs.hasPreset ? '' : ' <span class="mm-pill mm-pill--warn">fora do ODS</span>') +
        '</p>' +
        '<label class="mm-field">' +
          'Valor do projeto (' + escapeHtml(hs.unit) + ')' +
          '<input type="text" inputmode="decimal" id="mmFieldInput" value="' + escapeHtml(current) + '" placeholder="Informe a medida">' +
        '</label>' +
        '<p class="mm-ref">Referência do modelo: <strong>' + escapeHtml(ref || '—') + '</strong></p>' +
        (ref
          ? '<button type="button" class="btn" id="mmUseRef">Usar referência neste ponto</button>'
          : '') +
        (note ? '<p class="mm-note">' + escapeHtml(note) + '</p>' : '') +
        '<p class="mm-hint">O valor é salvo no campo correspondente do checklist / projeto.</p>' +
      '</div>';
  }

  function buildScaleWidthSection(preset) {
    if (!window.BL_SCALE_WIDTH || typeof window.BL_SCALE_WIDTH.summaryRows !== 'function') {
      return '';
    }
    try {
      if (typeof window.BL_SCALE_WIDTH.ensureDefaults === 'function') {
        window.BL_SCALE_WIDTH.ensureDefaults({ onlyEmpty: true });
      }
      if (typeof window.BL_SCALE_WIDTH.recalculate === 'function') {
        window.BL_SCALE_WIDTH.recalculate();
      }
    } catch (_) {}

    var margin = readField('escala.margem_corda');
    var bridge = readField('escala.distanciamento_furos_cavalete');
    var refMargin = (preset && preset.values && preset.values['escala.margem_corda']) || '3.5';
    var refBridge = (preset && preset.values && preset.values['escala.distanciamento_furos_cavalete']) || '—';
    var rows = window.BL_SCALE_WIDTH.summaryRows() || [];
    var derived = rows.map(function (r) {
      return '<tr>' +
        '<td class="mm-td-name" data-label="Medida">' + escapeHtml(r.label) + '</td>' +
        '<td class="mm-td-ref" data-label="Origem">' + escapeHtml(r.origin) + '</td>' +
        '<td class="mm-td-value" data-label="Valor">' + escapeHtml(r.value) + ' mm</td>' +
      '</tr>';
    }).join('');

    return '' +
      '<div class="mm-scale-width">' +
        '<h4 class="mm-scale-width-title">Geometria da escala (paramétrica)</h4>' +
        '<p class="mm-hint">Largura física = espaçamento das cordas externas + 2 × margem. Margem constante em toda a escala.</p>' +
        '<div class="mm-scale-width-inputs">' +
          '<label>Margem corda → borda (mm)' +
            '<input type="text" inputmode="decimal" class="mm-table-input" data-mm-bind="escala.margem_corda" value="' +
              escapeHtml(margin) + '" aria-label="Margem da corda à borda">' +
            '<small>Ref. modelo: ' + escapeHtml(refMargin) + '</small>' +
          '</label>' +
          '<label>Distanciamento furos do cavalete (mm)' +
            '<input type="text" inputmode="decimal" class="mm-table-input" data-mm-bind="escala.distanciamento_furos_cavalete" value="' +
              escapeHtml(bridge) + '" aria-label="Distanciamento dos furos do cavalete">' +
            '<small>Ref. modelo: ' + escapeHtml(String(refBridge)) + '</small>' +
          '</label>' +
        '</div>' +
        '<div class="mm-table-wrap">' +
          '<table class="measures-table mm-table mm-table--derived">' +
            '<thead><tr><th>Medida</th><th>Origem</th><th>Valor</th></tr></thead>' +
            '<tbody>' + derived + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  function buildTablePanel(preset) {
    var rows = hotspots().map(function (hs) {
      var current = readField(hs.bind);
      var ref = (preset && preset.values && preset.values[hs.bind]) || '';
      return '<tr data-mm-row="' + hs.id + '">' +
        '<td class="mm-td-name" data-label="Medida">' + escapeHtml(hs.label) +
          (hs.hasPreset ? '' : ' <span class="mm-pill mm-pill--warn">extra</span>') +
        '</td>' +
        '<td class="mm-td-ref" data-label="Ref. modelo">' + escapeHtml(ref || '—') + '</td>' +
        '<td class="mm-td-value" data-label="Valor do projeto">' +
          '<input type="text" inputmode="decimal" class="mm-table-input" data-mm-bind="' +
          escapeHtml(hs.bind) + '" value="' + escapeHtml(current) + '" aria-label="Valor: ' +
          escapeHtml(hs.label) + '">' +
        '</td>' +
      '</tr>';
    }).join('');

    return '' +
      '<div class="mm-table-wrap">' +
        '<table class="measures-table mm-table">' +
          '<thead><tr><th>Medida</th><th>Ref. modelo</th><th>Valor do projeto</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
        (preset && preset.note ? '<p class="mm-note">' + escapeHtml(preset.note) + '</p>' : '') +
      '</div>' +
      buildScaleWidthSection(preset);
  }

  function renderBody(m) {
    var body = $('#measuresBody', m);
    if (!body) return;
    var preset = presetForCurrentModel();
    var title = $('#measuresTitle', m);
    if (title) title.textContent = 'Medidas — ' + instrName();

    body.innerHTML =
      '<div class="mm-root mm-root--' + (state.mode === 'tabela' ? 'tabela' : 'mapa') + '">' +
        buildToolbar(preset) +
        '<div class="mm-content" id="mmContent">' +
          (state.mode === 'tabela' ? buildTablePanel(preset) : buildMapPanel(preset)) +
        '</div>' +
      '</div>';

    wireBody(m, preset);
  }

  function refreshEditorOnly(m) {
    var editor = $('#mmEditor', m);
    if (!editor) return;
    editor.innerHTML = buildEditor(presetForCurrentModel());
    wireEditor(m);
    $$('.mm-hotspot', m).forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-mm-hotspot') === state.activeId);
      var hs = findHotspot(btn.getAttribute('data-mm-hotspot'));
      if (hs) btn.classList.toggle('is-filled', hotspotFilled(hs));
    });
  }

  function wireEditor(m) {
    var input = $('#mmFieldInput', m);
    if (input) {
      input.addEventListener('input', function () {
        var hs = findHotspot(state.activeId);
        if (!hs) return;
        writeField(hs.bind, input.value);
        var btn = m.querySelector('.mm-hotspot[data-mm-hotspot="' + hs.id + '"]');
        if (btn) btn.classList.toggle('is-filled', !!String(input.value || '').trim());
        if (window.BL_SCALE_WIDTH && typeof window.BL_SCALE_WIDTH.recalculate === 'function') {
          window.BL_SCALE_WIDTH.recalculate();
        }
      });
    }
    var useRef = $('#mmUseRef', m);
    if (useRef) {
      useRef.addEventListener('click', function () {
        var hs = findHotspot(state.activeId);
        var preset = presetForCurrentModel();
        if (!hs || !preset || !preset.values) return;
        var ref = preset.values[hs.bind];
        if (ref == null || ref === '') return;
        writeField(hs.bind, ref);
        if (window.BL_SCALE_WIDTH && typeof window.BL_SCALE_WIDTH.recalculate === 'function') {
          window.BL_SCALE_WIDTH.recalculate();
        }
        refreshEditorOnly(m);
      });
    }
  }

  function applyPreset(overwrite) {
    var preset = presetForCurrentModel();
    if (!preset || !preset.values) {
      alert('Selecione um modelo com preset ODS (ex.: Violão Clássico, Viola Caipira…).');
      return { applied: 0, skipped: 0 };
    }
    var applied = 0;
    var skipped = 0;
    Object.keys(preset.values).forEach(function (bind) {
      var next = preset.values[bind];
      if (next == null || String(next).trim() === '') return;
      var cur = readField(bind);
      if (!overwrite && cur) {
        skipped += 1;
        return;
      }
      if (writeField(bind, next)) applied += 1;
    });
    if (window.BL_SCALE_WIDTH && typeof window.BL_SCALE_WIDTH.afterPresetApply === 'function') {
      window.BL_SCALE_WIDTH.afterPresetApply();
    }
    return { applied: applied, skipped: skipped };
  }

  function wireBody(m, preset) {
    $$('[data-mm-mode]', m).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.mode = btn.getAttribute('data-mm-mode') || 'mapa';
        renderBody(m);
      });
    });

    $$('[data-mm-hotspot]', m).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeId = btn.getAttribute('data-mm-hotspot');
        refreshEditorOnly(m);
      });
    });

    $$('.mm-table-input', m).forEach(function (inp) {
      inp.addEventListener('input', function () {
        writeField(inp.getAttribute('data-mm-bind'), inp.value);
        if (window.BL_SCALE_WIDTH && typeof window.BL_SCALE_WIDTH.recalculate === 'function') {
          window.BL_SCALE_WIDTH.recalculate();
        }
      });
    });

    var applyBtn = $('#mmApplyPreset', m);
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        if (!preset || !preset.values) return;
        var go = window.confirm(
          'Aplicar referência do modelo "' + (preset.label || currentModelLabel()) + '" nos campos do projeto?'
        );
        if (!go) return;
        var doOverwrite = window.confirm(
          'Sobrescrever valores já preenchidos?\n\nOK = sobrescrever\nCancelar = preencher somente vazios'
        );
        var result = applyPreset(doOverwrite);
        alert(
          'Referência aplicada.\n' +
          'Atualizados: ' + result.applied + '\n' +
          'Mantidos (já preenchidos): ' + result.skipped
        );
        renderBody(m);
      });
    }

    wireEditor(m);
  }

  function openFigureModal() {
    if (typeof window.ensureModal !== 'function') {
      if (typeof window.__BL_OPEN_MEASURES_TABLE__ === 'function') {
        return window.__BL_OPEN_MEASURES_TABLE__(null);
      }
      return;
    }
    var m = window.ensureModal();
    ensureWideModal(m);
    setFooterVisible(m, false);
    state.mode = 'mapa';
    if (!state.activeId && hotspots()[0]) state.activeId = hotspots()[0].id;
    renderBody(m);
    m.open();
  }

  function install() {
    // Preserva a abertura tabular antiga, se existir.
    if (typeof window.openMeasuresModal === 'function' && !window.__BL_OPEN_MEASURES_TABLE__) {
      window.__BL_OPEN_MEASURES_TABLE__ = window.openMeasuresModal;
    }
    window.openMeasuresModal = openFigureModal;
    window.openMeasuresFigureModal = openFigureModal;

    var btn = document.getElementById('btnMeasuresTable');
    if (btn && !btn.__mmFigureWired) {
      btn.__mmFigureWired = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        openFigureModal();
      }, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
