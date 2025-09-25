/* step19-project-plan.v2.js — sincroniza com BL_INSTRUMENT e evita loops
   - Mantém select do cabeçalho espelhando o instrumento global
   - Troca no select chama BL_INSTRUMENT.set(...)
*/
(function () {
  'use strict';

  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const $ = (s, c = document) => c.querySelector(s);

  const INSTR_NAMES = { vcl: 'Violão Clássico', vla: 'Viola', cav: 'Cavaquinho', uku: 'Ukulele' };
  const PLAN_WEIGHTS = [
    { id: 'sec-02', nome: 'Braço / Taco Espanhol', peso: 18 },
    { id: 'sec-03', nome: 'Tampo', peso: 22 },
    { id: 'sec-04', nome: 'Fundo', peso: 14 },
    { id: 'sec-05', nome: 'Laterais', peso: 14 },
    { id: 'sec-08', nome: 'Escala / Trastes', peso: 12 },
    { id: 'acab', nome: 'Acabamento & Montagem', peso: 20 }
  ];

  function buildHeader(currentCode) {
    if ($('#projectHeader')) return;
    const host = $('.topbar') || $('header') || document.body;
    const wrap = document.createElement('section');
    wrap.className = 'project-header';
    wrap.id = 'projectHeader';

    wrap.innerHTML = `
      <h3>Projeto
        <span class="badge-current-instrument" id="badgeInst">${INSTR_NAMES[currentCode] || String(currentCode).toUpperCase()}</span>
      </h3>
      <div class="project-grid">
        <label>Cliente
          <input class="persist" id="job-client" type="text" placeholder="Nome do cliente">
        </label>
        <label>Instrumento
          <select class="persist" id="job-instrument">
            <option value="vcl">Violão Clássico</option>
            <option value="vla">Viola</option>
            <option value="cav">Cavaquinho</option>
            <option value="uku">Ukulele</option>
          </select>
        </label>
        <label>Início
          <input class="persist" id="job-start" type="date">
        </label>
        <label>Entrega prevista
          <input class="persist" id="job-due" type="date">
        </label>
        <label>Dias/semana
          <select id="job-days-week">
            <option value="5" selected>5 (seg–sex)</option>
            <option value="6">6 (seg–sáb)</option>
          </select>
        </label>
      </div>
      <div class="project-actions">
        <button class="btn" id="btnPlan">Calcular cronograma</button>
        <small id="planHint" style="opacity:.8"></small>
      </div>
      <div id="planTable" aria-live="polite"></div>
    `;
    host.parentNode.insertBefore(wrap, host.nextSibling);

    $('#job-instrument').value = currentCode;

    // evita loop: quando eu atualizo via select, não repropago o evento que eu mesmo gerei
    let internal = false;
     $('#job-instrument').addEventListener('change', (e)=>{
  const code = e.target.value;
  if (window.__BL_PERSIST_APPLYING__) return; // vindo do applyAll -> ignora
  if (window.BL_INSTRUMENT && BL_INSTRUMENT.get() === code) return; // sem mudança real
  window.BL_INSTRUMENT && BL_INSTRUMENT.set(code, {source:'project-plan'});
});


    // quando alguém mudar o instrumento global, espelha aqui
    window.BL_INSTRUMENT && window.BL_INSTRUMENT.on(({ to, source }) => {
      // se a mudança veio daqui mesmo e ainda estamos marcados como internal, ignore
      $('#job-instrument').value = to;
      const badge = $('#badgeInst'); if (badge) badge.textContent = INSTR_NAMES[to] || String(to).toUpperCase();
      // opcional: recalcular placeholders/plan se necessário
      setTimeout(renderPlan, 50);
    });

    // datas sugestivas
    const start = $('#job-start'), due = $('#job-due');
    if (!start.value) { start.value = asDateInputValue(new Date()); }
    if (!due.value) {
      const d = new Date(); d.setDate(d.getDate() + 30);
      due.value = asDateInputValue(d);
    }

    $('#btnPlan').addEventListener('click', renderPlan);
    setTimeout(renderPlan, 150);
  }




  // ===== Helpers =====
  function asDateInputValue(d) {
    if (!(d instanceof Date)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseDateInput(v) {
    if (!v) return null;
    v = String(v).trim();
    // ISO: 2025-08-21
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(+d) ? null : d; }
    // BR: 21/08/2025
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); return isNaN(+d) ? null : d; }
    return null;
  }

  function fmtBR(d) {
    return d ? d.toLocaleDateString('pt-BR') : '—';
  }
  function isWorkday(d, daysPerWeek) {
    const wd = d.getDay(); // 0=dom .. 6=sáb
    if (daysPerWeek >= 6) return wd !== 0;
    return wd >= 1 && wd <= 5;
  }
  function workingDaysInRange(start, end, daysPerWeek) {
    if (!start || !end || end < start) return 0;
    let c = 0, d = new Date(start);
    while (d <= end) {
      if (isWorkday(d, daysPerWeek)) c++;
      d.setDate(d.getDate() + 1);
    }
    return c;
  }
  function addWorkingDays(start, n, daysPerWeek) {
    const d = new Date(start);
    let left = n;
    while (left > 0) {
      d.setDate(d.getDate() + 1);
      if (isWorkday(d, daysPerWeek)) left--;
    }
    return d;
  }
  function distribute(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map(w => total * (w / sum));
    const out = raw.map(Math.floor);
    let rest = total - out.reduce((a, b) => a + b, 0);
    const rema = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < rema.length && rest > 0; k++) { out[rema[k].i]++; rest--; }
    return out;
  }

  function renderPlan() {
    const start = parseDateInput($('#job-start').value);
    const due = parseDateInput($('#job-due').value);
    const daysPerWeek = parseInt($('#job-days-week').value || '5', 10);

    const hint = $('#planHint');
    const box = $('#planTable');
    if (!start || !due || due < start) {
      box.innerHTML = '';
      hint.textContent = 'Defina datas válidas para gerar o cronograma.';
      return;
    }

    const totalWD = workingDaysInRange(start, due, daysPerWeek);
    if (totalWD <= 0) {
      box.innerHTML = '';
      hint.textContent = 'Intervalo sem dias úteis — ajuste as datas.';
      return;
    }
    hint.textContent = `${totalWD} dias úteis no período.`;

    const pesos = PLAN_WEIGHTS.map(x => x.peso);
    const dist = distribute(totalWD, pesos);

    let cursor = new Date(start);
    while (!isWorkday(cursor, daysPerWeek)) { cursor.setDate(cursor.getDate() + 1); }

    let rows = '';
    PLAN_WEIGHTS.forEach((it, idx) => {
      const dur = Math.max(1, dist[idx]);
      const ini = new Date(cursor);
      const fim = addWorkingDays(ini, dur - 1, daysPerWeek);
      cursor = addWorkingDays(fim, 1, daysPerWeek);
      rows += `<tr>
        <td>${it.nome}</td>
        <td style="text-align:right">${it.peso}%</td>
        <td style="text-align:right">${dur}</td>
        <td>${fmtBR(ini)}</td>
        <td>${fmtBR(fim)}</td>
      </tr>`;
    });

    box.innerHTML = `
      <table>
        <thead>
          <tr><th>Etapa</th><th>%</th><th>Dias úteis</th><th>Início</th><th>Fim</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td>Total</td><td>100%</td><td style="text-align:right">${totalWD}</td><td>${fmtBR(start)}</td><td>${fmtBR(due)}</td></tr>
        </tfoot>
      </table>
    `;
  }

  function boot() {
    if (!window.BL_INSTRUMENT) {
      console.warn('[project-plan] BL_INSTRUMENT não encontrado; carregue step9-instrument-bus.js antes.');
      // fallback simples:
      const code = (localStorage.getItem('bl:instrument') || 'vcl');
      buildHeader(code);
      return;
    }
    window.BL_INSTRUMENT.ready(function (code) {
      buildHeader(code);
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }

})();