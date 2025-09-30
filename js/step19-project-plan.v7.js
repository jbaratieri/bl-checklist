/* step19-project-plan.v7.js — ficha do projeto + cronograma com toggle */
(function () {
  'use strict';

  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const $  = (s, c = document) => c.querySelector(s);

  const INSTR_NAMES = { vcl: 'Violão Clássico', vla: 'Viola', cav: 'Cavaquinho', uku: 'Ukulele' };
  const PLAN_WEIGHTS = [
    { id: 'sec-02', nome: 'Braço / Taco Espanhol', peso: 18 },
    { id: 'sec-03', nome: 'Tampo', peso: 22 },
    { id: 'sec-04', nome: 'Fundo', peso: 14 },
    { id: 'sec-05', nome: 'Laterais', peso: 14 },
    { id: 'sec-08', nome: 'Escala / Trastes', peso: 12 },
    { id: 'acab',   nome: 'Acabamento & Montagem', peso: 20 }
  ];

  // ===== Helpers =====
  const pad = n => String(n).padStart(2,'0');
  const asDateInputValue = d => d instanceof Date ?
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` : '';
  const parseDateInput = v => {
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v);
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m ? new Date(+m[3], +m[2]-1, +m[1]) : null;
  };
  const fmtBR = d => d ? d.toLocaleDateString('pt-BR') : '—';
  const isWorkday = (d, days) => days>=6 ? d.getDay()!==0 : d.getDay()>=1 && d.getDay()<=5;

  function workingDaysInRange(start,end,days){
    if (!start||!end||end<start) return 0;
    let c=0, d=new Date(start);
    while(d<=end){ if(isWorkday(d,days)) c++; d.setDate(d.getDate()+1); }
    return c;
  }
  function addWorkingDays(start,n,days){
    const d=new Date(start);
    while(n>0){ d.setDate(d.getDate()+1); if(isWorkday(d,days)) n--; }
    return d;
  }
  function distribute(total,weights){
    const sum=weights.reduce((a,b)=>a+b,0)||1;
    const raw=weights.map(w=>total*(w/sum));
    const out=raw.map(Math.floor);
    let rest=total-out.reduce((a,b)=>a+b,0);
    raw.map((v,i)=>({i,frac:v-Math.floor(v)}))
       .sort((a,b)=>b.frac-a.frac)
       .forEach(r=>{ if(rest>0){ out[r.i]++; rest--; }});
    return out;
  }

  // ===== Render =====
  function renderPlan(){
    const start=parseDateInput($('#job-start')?.value);
    const due=parseDateInput($('#job-due')?.value);
    const days=parseInt($('#job-days-week')?.value||'5',10);
    const hint=$('#planHint'), box=$('#planTable');

    if(!start||!due||due<start){ if(box) box.innerHTML=''; if(hint) hint.textContent='Defina datas válidas.'; return false; }

    const totalWD=workingDaysInRange(start,due,days);
    if(totalWD<=0){ if(box) box.innerHTML=''; if(hint) hint.textContent='Intervalo sem dias úteis.'; return false; }
    if(hint) hint.textContent=`${totalWD} dias úteis no período.`;

    const dist=distribute(totalWD, PLAN_WEIGHTS.map(x=>x.peso));
    let cursor=new Date(start); while(!isWorkday(cursor,days)) cursor.setDate(cursor.getDate()+1);

    let rows='';
    PLAN_WEIGHTS.forEach((it,idx)=>{
      const dur=Math.max(1,dist[idx]);
      const ini=new Date(cursor);
      const fim=addWorkingDays(ini,dur-1,days);
      cursor=addWorkingDays(fim,1,days);
      rows+=`<tr>
        <td>${it.nome}</td><td style="text-align:right">${it.peso}%</td>
        <td style="text-align:right">${dur}</td><td>${fmtBR(ini)}</td><td>${fmtBR(fim)}</td>
      </tr>`;
    });

    if(box){
      box.innerHTML=`<table>
        <thead><tr><th>Etapa</th><th>%</th><th>Dias úteis</th><th>Início</th><th>Fim</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td>100%</td><td style="text-align:right">${totalWD}</td><td>${fmtBR(start)}</td><td>${fmtBR(due)}</td></tr></tfoot>
      </table>`;
      box.style.display='';
      box.dataset.open='1';
    }

    const btn=$('#btnPlan');
    if(btn) btn.textContent='Cronograma (Recolher)';
    return true;
  }

  // ===== Toggle =====
  function togglePlan(ev){
    ev.preventDefault();
    const box=$('#planTable'), btn=$('#btnPlan');
    if(!box||!btn) return;
    if(box.innerHTML.trim()===''){ if(renderPlan()) btn.textContent='Cronograma (Recolher)'; }
    else{
      const open=box.dataset.open==='1';
      box.style.display=open?'none':'';
      box.dataset.open=open?'0':'1';
      btn.textContent=open?'Cronograma (Expandir)':'Cronograma (Recolher)';
    }
  }

  // ===== Boot =====
  function boot(){
    // garante datas sugestivas
    const start=$('#job-start'), due=$('#job-due');
    if(start && !start.value) start.value=asDateInputValue(new Date());
    if(due && !due.value){ const d=new Date(); d.setDate(d.getDate()+30); due.value=asDateInputValue(d); }

    $('#btnPlan')?.addEventListener('click', togglePlan);

    // recalcula quando trocar de projeto ou instrumento
    window.addEventListener('bl:project-change', ()=> setTimeout(renderPlan,150));
    window.addEventListener('bl:instrument-change', ()=> setTimeout(renderPlan,150));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

})();
