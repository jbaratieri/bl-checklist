/* step19-project-plan.v2.js — apenas cronograma, sem criar projectHeader */
(function () {
  'use strict';

  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const $ = (s, c = document) => c.querySelector(s);

  const PLAN_WEIGHTS = [
    { id: 'sec-02', nome: 'Braço / Taco Espanhol', peso: 18 },
    { id: 'sec-03', nome: 'Tampo', peso: 22 },
    { id: 'sec-04', nome: 'Fundo', peso: 14 },
    { id: 'sec-05', nome: 'Laterais', peso: 14 },
    { id: 'sec-08', nome: 'Escala / Trastes', peso: 12 },
    { id: 'acab', nome: 'Acabamento & Montagem', peso: 20 }
  ];

  // ===== Helpers =====
  function asDateInputValue(d) {
    if (!(d instanceof Date)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function parseDateInput(v) {
    if (!v) return null;
    v = String(v).trim();
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(+d) ? null : d; }
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); return isNaN(+d) ? null : d; }
    return null;
  }
  function fmtBR(d) { return d ? d.toLocaleDateString('pt-BR') : '—'; }
  function isWorkday(d, daysPerWeek) {
    const wd = d.getDay();
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
    const rema = raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
                    .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < rema.length && rest > 0; k++) { out[rema[k].i]++; rest--; }
    return out;
  }

  function renderPlan() {
    const start = parseDateInput($('#job-start')?.value);
    const due = parseDateInput($('#job-due')?.value);
    const daysPerWeek = parseInt($('#job-days-week')?.value || '5', 10);

    const hint = $('#planHint');
    const box = $('#planTable');
    if (!start || !due || due < start) {
      if (box) box.innerHTML = '';
      if (hint) hint.textContent = 'Defina datas válidas para gerar o cronograma.';
      return;
    }

    const totalWD = workingDaysInRange(start, due, daysPerWeek);
    if (totalWD <= 0) {
      if (box) box.innerHTML = '';
      if (hint) hint.textContent = 'Intervalo sem dias úteis — ajuste as datas.';
      return;
    }
    if (hint) hint.textContent = `${totalWD} dias úteis no período.`;

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

    if (box) {
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
  }

  function boot() {
    // garante datas padrão
    const start = $('#job-start'), due = $('#job-due');
    if (start && !start.value) { start.value = asDateInputValue(new Date()); }
    if (due && !due.value) {
      const d = new Date(); d.setDate(d.getDate() + 30);
      due.value = asDateInputValue(d);
    }

    // listener no botão
    $('#btnPlan')?.addEventListener('click', renderPlan);

    // render inicial
    setTimeout(renderPlan, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

