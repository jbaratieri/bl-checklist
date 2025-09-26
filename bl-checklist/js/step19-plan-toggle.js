
/* step19-plan-toggle.js — transforma o botão "Calcular cronograma" em abrir/fechar após a 1ª geração */
(function(){
  'use strict';

  function findButton(){
    return document.getElementById('btnPlanCalc') ||
           Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
             .find(b => /calcular\s+cronograma/i.test((b.textContent||b.value||'').trim()));
  }
  function findPlanContainer(){
    // tenta achar contêiner típico do cronograma
    return document.getElementById('projectPlan') ||
           document.querySelector('.project-plan, .plan-table, #planTable, [data-role="project-plan"]');
  }

  function setupAfterFirstBuild(btn){
    let container = findPlanContainer();
    if (!container){
      // observa inserção do cronograma
      const mo = new MutationObserver(()=>{
        const c = findPlanContainer();
        if (c){ container = c; mo.disconnect(); makeToggle(btn, container); }
      });
      mo.observe(document.body, {childList:true, subtree:true});
      return;
    }
    makeToggle(btn, container);
  }

  function makeToggle(btn, container){
    if (!btn || !container) return;
    // marca estado
    container.dataset.open = '1';
    const origLabel = (btn.textContent||btn.value||'').trim();
    function setLabel(open){
      const base = /cronograma/i.test(origLabel) ? 'Cronograma' : origLabel;
      const suffix = open ? ' (Recolher)' : ' (Expandir)';
      if ('textContent' in btn) btn.textContent = base + suffix;
      if ('value' in btn && btn.value) btn.value = base + suffix;
    }
    setLabel(true);

    // remove handlers antigos apenas se fomos nós que já marcamos
    if (!btn.__blPlanToggleWired){
      btn.__blPlanToggleWired = true;
      btn.addEventListener('click', function(ev){
        // se ainda não temos container, deixa passar para gerar
        if (!container || !document.body.contains(container)) return;
        ev.preventDefault();
        const open = container.dataset.open === '1';
        container.style.display = open ? 'none' : '';
        container.dataset.open = open ? '0' : '1';
        setLabel(!open);
      });
    }
  }

  function boot(){
    const btn = findButton();
    if (!btn){
      // espera botão aparecer
      const mo = new MutationObserver(()=>{
        const b = findButton();
        if (b){ mo.disconnect(); wireFirstClick(b); }
      });
      mo.observe(document.body, {childList:true, subtree:true});
      return;
    }
    wireFirstClick(btn);
  }

  function wireFirstClick(btn){
    if (btn.__blFirstClickWired) return;
    btn.__blFirstClickWired = true;
    // após o primeiro clique (que gera o cronograma), configura o toggle
    btn.addEventListener('click', function once(){
      setTimeout(()=> setupAfterFirstBuild(btn), 120);
      btn.removeEventListener('click', once);
    }, {capture:false, once:true});
  }

  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
})();
