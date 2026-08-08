// `step24-print-project.js`: imprime a ficha do projeto (dados, madeiras e medidas).
// Substitui a impressão do checklist no botão #btnPrint.
(function () {
  'use strict';

  var INST_NAMES = { vcl: 'Violão', vla: 'Viola', cav: 'Cavaquinho', uku: 'Ukulele' };
  var MEASURE_GROUPS = [
    { title: 'Braço', gridId: 'measures-braco' },
    { title: 'Tampo', gridId: 'measures-tampo' },
    { title: 'Fundo', gridId: 'measures-fundo' },
    { title: 'Laterais', gridId: 'measures-laterais' },
    { title: 'Escala', gridId: 'measures-escala' }
  ];

  function $(id) { return document.getElementById(id); }

  function selectedLabel(id) {
    var el = $(id);
    if (!el) return '';
    var opt = el.options && el.options[el.selectedIndex];
    return (opt && opt.textContent ? opt.textContent : el.value || '').trim();
  }

  function fieldValue(id) {
    var el = $(id);
    return el && 'value' in el ? String(el.value || '').trim() : '';
  }

  function safe(v) {
    var t = String(v || '').trim();
    return t || '—';
  }

  function projectName() {
    var sel = $('selProject');
    if (!sel) return '—';
    var opt = sel.options && sel.options[sel.selectedIndex];
    return (opt && opt.textContent ? opt.textContent : sel.value || '').trim() || '—';
  }

  function instrumentCode() {
    if (window.BL_INSTRUMENT && typeof BL_INSTRUMENT.get === 'function') return BL_INSTRUMENT.get();
    return fieldValue('selInstrument') || localStorage.getItem('bl:instrument') || 'vcl';
  }

  function bracingText() {
    var br = fieldValue('job-bracing-system');
    var label = selectedLabel('job-bracing-system');
    if (br === 'custom') {
      var custom = fieldValue('job-bracing-custom-name');
      return custom ? ('Custom — ' + custom) : (label || 'Custom');
    }
    return label;
  }

  function measureLabelName(label, input) {
    var clone = label.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('input, select, textarea, small, button'), function (n) {
      n.remove();
    });
    var name = (clone.textContent || '').replace(/:\s*$/, '').replace(/\s+/g, ' ').trim();
    return name || input.getAttribute('data-measure') || input.id || 'Campo';
  }

  function collectMeasureGroups() {
    return MEASURE_GROUPS.map(function (g) {
      var grid = $(g.gridId);
      var rows = [];
      if (grid) {
        Array.prototype.forEach.call(grid.querySelectorAll('label'), function (label) {
          var input = label.querySelector('input, select, textarea');
          if (!input) return;
          rows.push({
            name: measureLabelName(label, input),
            value: String(input.value || '').trim()
          });
        });
      }
      return { title: g.title, rows: rows };
    });
  }

  function ensurePrintSheet() {
    var sheet = $('print-project-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'print-project-sheet';
      document.body.appendChild(sheet);
    }
    return sheet;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function addKv(dl, term, value) {
    var dt = el('dt', null, term);
    var dd = el('dd', null, safe(value));
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  function render() {
    var when = new Date().toLocaleString();
    var inst = instrumentCode();
    var sheet = ensurePrintSheet();
    sheet.innerHTML = '';

    var header = el('div', 'pps-header');
    var logo = document.createElement('img');
    logo.src = './assets/logos/LOGOTRANSPARENTE.png';
    logo.alt = 'Método Baratieri';
    var titles = el('div', 'pps-titles');
    titles.appendChild(el('div', 'pps-title', 'Ficha do Projeto'));
    titles.appendChild(el('div', 'pps-subtitle', 'Método Baratieri — Baratieri Luthieria'));
    header.appendChild(logo);
    header.appendChild(titles);

    var content = el('div', 'pps-content');

    var overview = el('section', 'pps-section');
    overview.appendChild(el('h2', null, 'Dados do projeto'));
    var dl = el('dl', 'pps-grid');
    addKv(dl, 'Projeto', projectName());
    addKv(dl, 'Cliente', fieldValue('job-client'));
    addKv(dl, 'Instrumento', selectedLabel('selInstrument') || INST_NAMES[inst] || inst);
    addKv(dl, 'Modelo', selectedLabel('job-model'));
    addKv(dl, 'Tipo', selectedLabel('job-acoustic-type'));
    addKv(dl, 'Cordas', (selectedLabel('job-string-type') || '—') + ' · ' + (selectedLabel('job-string-count') || '—'));
    addKv(dl, 'Leque harmônico', bracingText());
    var customNotes = fieldValue('job-bracing-custom-notes');
    if (fieldValue('job-bracing-system') === 'custom' && customNotes) {
      addKv(dl, 'Obs. do leque', customNotes);
    }
    addKv(dl, 'Escala (mm)', fieldValue('job-scale-mm'));
    addKv(dl, 'Junção braço-corpo', selectedLabel('job-neck-join') || (fieldValue('job-neck-join') ? (fieldValue('job-neck-join') + 'º traste') : ''));
    addKv(dl, 'Início', fieldValue('job-start'));
    addKv(dl, 'Entrega prevista', fieldValue('job-due'));
    overview.appendChild(dl);
    content.appendChild(overview);

    var woods = el('section', 'pps-section');
    woods.appendChild(el('h2', null, 'Madeiras'));
    var woodDl = el('dl', 'pps-grid');
    addKv(woodDl, 'Braço', fieldValue('braco-madeira-sec02'));
    addKv(woodDl, 'Tampo', fieldValue('tampo-madeira-sec03'));
    addKv(woodDl, 'Fundo', fieldValue('fundo-madeira-sec04'));
    addKv(woodDl, 'Laterais', fieldValue('laterais-madeira-sec05'));
    addKv(woodDl, 'Escala', fieldValue('escala-madeira-sec08'));
    woods.appendChild(woodDl);
    content.appendChild(woods);

    var measures = el('section', 'pps-section');
    measures.appendChild(el('h2', null, 'Medidas'));
    collectMeasureGroups().forEach(function (group) {
      var block = el('div', 'pps-measure-block');
      block.appendChild(el('h3', null, group.title));
      if (!group.rows.length) {
        block.appendChild(el('p', 'pps-empty', 'Sem campos de medida nesta etapa.'));
      } else {
        var table = el('table', 'pps-table');
        var thead = document.createElement('thead');
        var thr = document.createElement('tr');
        thr.appendChild(el('th', null, 'Campo'));
        thr.appendChild(el('th', null, 'Valor'));
        thead.appendChild(thr);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        group.rows.forEach(function (row) {
          var tr = document.createElement('tr');
          tr.appendChild(el('td', null, row.name));
          tr.appendChild(el('td', null, safe(row.value)));
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        block.appendChild(table);
      }
      measures.appendChild(block);
    });
    content.appendChild(measures);

    var footer = el('div', 'pps-footer');
    footer.appendChild(el('div', null, 'Gerado em ' + when));
    footer.appendChild(el('div', 'pps-page'));

    sheet.appendChild(header);
    sheet.appendChild(content);
    sheet.appendChild(footer);
    return sheet;
  }

  function printProject(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    }
    render();
    document.body.classList.remove('print-measures');
    document.body.classList.add('print-project');
    var cleanup = function () {
      document.body.classList.remove('print-project');
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    // Fallback se afterprint não disparar
    setTimeout(function () {
      if (document.body.classList.contains('print-project')) cleanup();
    }, 60 * 1000);
    window.print();
  }

  function hook() {
    var btn = $('btnPrint') || document.querySelector('[data-action="pdf"]');
    if (!btn) return;
    btn.setAttribute('data-has-print', '1');
    btn.addEventListener('click', printProject, { capture: true });
  }

  window.BL_PRINT_PROJECT = {
    print: printProject,
    render: render
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hook);
  } else {
    hook();
  }
})();
