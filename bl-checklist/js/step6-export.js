// Step 6 (rev): Exportar Medidas (PDF) — separado do "Imprimir checklist"
(function(){
  'use strict';
  const K_SECTIONS = ['02','03','04','05','08','09'];

  function $$(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function $(sel, ctx){ return (ctx||document).querySelector(sel); }

  function getSectionTitle(section){
    const h = section.querySelector(':scope > header h3, :scope > header h2, :scope > header');
    return (h && (h.textContent||'').trim()) || section.id || '';
  }

  function pickInputByPrefix(section, prefix){
    let el = section.querySelector(`.measures-grid input[id="${prefix}"]`);
    if (el) return el;
    el = section.querySelector(`.measures-grid input[id^="${prefix}"]`);
    if (el) return el;
    el = section.querySelector(`.measures-grid input[data-measure="${prefix}"]`);
    return el || null;
  }

  function collect(){
    const rows = [];
    K_SECTIONS.forEach(num => {
      const section = document.getElementById(`sec-${num}`);
      if (!section) return;
      const grid = section.querySelector(':scope > .section-body > .measures-grid');
      if (!grid) return;

      const w = pickInputByPrefix(section, `w-sec${num}`);
      const h = pickInputByPrefix(section, `h-sec${num}`);
      const t = pickInputByPrefix(section, `t-sec${num}`);
      const notes = pickInputByPrefix(section, `notes-sec${num}`);

      rows.push({
        id: `#sec-${num}`,
        title: getSectionTitle(section),
        largura: w ? (w.value||'') : '',
        altura:  h ? (h.value||'') : '',
        esp:     t ? (t.value||'') : '',
        detalhes: notes ? (notes.value||'') : ''
      });
    });
    return rows;
  }

  function ensurePrintSheet(){
    let sheet = document.getElementById('print-sheet');
    if (!sheet){
      sheet = document.createElement('div');
      sheet.id = 'print-sheet';
      document.body.appendChild(sheet);
    }
    return sheet;
  }

  function render(rows){
    const now = new Date();
    const when = now.toLocaleString();
    const sheet = ensurePrintSheet();
    sheet.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.id = 'print-header';
    const logo = document.createElement('img');
    logo.src = 'assets/logo.png';
    const titles = document.createElement('div');
    titles.className = 'titles';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Exportação de Medidas';
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    var inst = localStorage.getItem('bl:instrument')||'vcl';
    var INST_NAMES = { vcl:'Violão Clássico', vla:'Viola Caipira', cav:'Cavaquinho', uku:'Ukulele' };
    subtitle.textContent = 'Baratieri Luthieria — ' + (INST_NAMES[inst]||inst);
    titles.appendChild(title); titles.appendChild(subtitle);
    header.appendChild(logo); header.appendChild(titles);

    // Footer
    const footer = document.createElement('div');
    footer.id = 'print-footer';
    const left = document.createElement('div');
    left.className = 'when';
    left.textContent = `Gerado em ${when}`;
    const right = document.createElement('div');
    right.className = 'page';
    footer.appendChild(left); footer.appendChild(right);

    // Content wrapper
    const content = document.createElement('div');
    content.id = 'print-content';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');
    ['Seção','Largura (mm)','Altura (mm)','Espessura (mm)','Detalhes das medidas'].forEach(t => {
      const th = document.createElement('th'); th.textContent = t; thr.appendChild(th);
    });
    thead.appendChild(thr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const tdSec = document.createElement('td'); tdSec.textContent = r.title; tr.appendChild(tdSec);
      const tdW = document.createElement('td'); tdW.textContent = r.largura; tr.appendChild(tdW);
      const tdH = document.createElement('td'); tdH.textContent = r.altura; tr.appendChild(tdH);
      const tdT = document.createElement('td'); tdT.textContent = r.esp; tr.appendChild(tdT);
      const tdN = document.createElement('td'); tdN.className='notes'; tdN.textContent = r.detalhes; tr.appendChild(tdN);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    content.appendChild(table);

    sheet.appendChild(header);
    sheet.appendChild(content);
    sheet.appendChild(footer);
    return sheet;
  }

  function exportMeasures(ev){
    // Captura e bloqueia handlers antigos que mostram "não há medidas"
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    const rows = collect();
    render(rows);
    // Ativa modo "print-measures"
    document.body.classList.add('print-measures');

    // Garante limpeza depois da impressão
    const cleanup = () => document.body.classList.remove('print-measures');
    window.addEventListener('afterprint', cleanup, {once:true});

    window.print();
  }

  function hook(){
    // Hook APENAS no botão Exportar medidas
    const exportBtn = document.getElementById('btnExportPDF') || document.querySelector('[data-action="export-measures"]');
    if (exportBtn){
      // capture = true para interceptar antes de handlers antigos
      exportBtn.addEventListener('click', exportMeasures, {capture:true});
    }

    // Opcional: garantir que o botão "Imprimir checklist" use a impressão normal (sem medidas)
    const printBtn = document.getElementById('btnPrint') || document.querySelector('[data-action="pdf"]');
    if (printBtn){
      // Não fazemos nada especial: impressão normal
      printBtn.addEventListener('click', (e)=>{
        // não impedir handlers antigos, apenas garantir que não estamos em modo medidas
        document.body.classList.remove('print-measures');
        // se o HTML já tem onclick/handler antigo, ele roda; senão, garante print simples
        // Evite duplicar prints: só chama window.print() se não houver atributo data-has-print
        if (!printBtn.hasAttribute('data-has-print')){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          window.print();
        }
      }, {capture:false});
      printBtn.setAttribute('data-has-print','1');
    }
  }

  document.addEventListener('DOMContentLoaded', hook);
})();
