/* wood-catalog.js — versão lite, estável
   - Modal único (#wc-dialog)
   - Lista editável com persistência por chave (localStorage)
   - Botão "Resumo por uso" que alterna para uma visão agrupada (tampo/fundo/laterais)
   - Sem helpers globais; expõe apenas window.WoodCatalog.open(key)
*/

(() => {
  const LS_PREFIX = 'woodCatalog:';

  const DEFAULTS = [
    { nome: 'Abeto (Spruce)', uso: 'Tampo', obs: 'Brilhante, forte, claro, alta projeção' },
    { nome: 'Cedro', uso: 'Tampo', obs: 'Quente, suave, encorpado, foco nos graves' },
    { nome: 'Mogno', uso: 'Tampo', obs: 'Quente, focado nos médios, equilibrado' },
    { nome: 'Jacarandá', uso: 'Fundo/Laterais', obs: 'Referência! forte sustain, graves profundos e agudos brilhantes' },
    { nome: 'Mogno', uso: 'Fundo/Laterais', obs: 'Timbre quente, equilibrado e com ênfase nos médios' },
    { nome: 'Maple', uso: 'Fundo/Laterais', obs: 'Timbre Neutro - Fidedigno' },
    { nome: 'Guajuvira', uso: 'Fundo/Laterais', obs: 'Som brilhante e equilibrado' },
    { nome: 'Imbuia', uso: 'Fundo/Laterais', obs: 'Destaca-se pelo sustain e projeção' },
    { nome: 'Mogno', uso: 'Braço', obs: 'Confiabilidade' },
    { nome: 'Cedro', uso: 'Braço', obs: 'Leveza' },
    { nome: 'Maple', uso: 'Braço', obs: 'Duro e denso' },
    { nome: 'Ébano', uso: 'Escala', obs: 'Muito densa; poros finos' },
    { nome: 'Jacarandá', uso: 'Escala', obs: 'Mais bela, menos densa' },
    { nome: 'Pau Ferro', uso: 'Escala', obs: 'Densidade intermediária' },
    { nome: 'Ipê', uso: 'Escala', obs: 'Densa e maleável' }
  ];

  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function ensureStyles() {
    if (document.getElementById('wc-styles')) return;
    const css = `
      /* usa tuas vars de tema */
      .wc-modal::backdrop{ background:rgba(0,0,0,.25); }
      .wc-modal{
        border:none; border-radius:var(--radius,12px);
        background:var(--card,#fff); color:var(--ink,#2e2a26);
        padding:0; width:min(880px,96vw);
        box-shadow:var(--shadow,0 2px 12px rgba(0,0,0,.12));
      }
      /* fallback p/ browsers sem showModal */
      #wc-dialog[open]{ display:block !important; position:fixed; top:8vh; left:50%; transform:translateX(-50%); z-index:99999; }

      .wc-head{ display:flex; align-items:center; justify-content:space-between; gap:8px;
                padding:12px 14px; border-bottom:1px solid #eee; }
      .wc-head h4{ margin:0; font:700 16px system-ui,Segoe UI,Roboto,Arial; }

      .wc-body{ padding:12px 14px; }
      .wc-search{ display:flex; gap:10px; margin:0 0 10px; align-items:center; }
      .wc-search input{ flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:10px; font:13px system-ui,Segoe UI,Roboto,Arial; }
      .wc-pill{ padding:4px 8px; border:1px solid #ddd; border-radius:999px; font:12px system-ui,Segoe UI,Roboto,Arial; background:#fff; }

      .wc-list .wc-row{
        display:grid; grid-template-columns: 2.2fr 1.4fr 2.2fr auto; gap:8px; align-items:center;
        padding:8px 0; border-bottom:1px dashed #eee;
      }
      .wc-row:nth-child(odd){ background:rgba(0,0,0,.02); }
      .wc-row input[type="text"]{ width:100%; padding:6px 8px; border:1px solid #ddd; border-radius:8px; font:13px system-ui,Segoe UI,Roboto,Arial; background:#fff; }
      .wc-actions{ display:flex; gap:6px; }

      .wc-add{ display:grid; grid-template-columns: 2.2fr 1.4fr 2.2fr auto; gap:8px; margin-top:12px; }

      .wc-foot{ display:flex; justify-content:space-between; align-items:center; gap:8px;
                padding:12px 14px; border-top:1px solid #eee; background:#faf7f2;
                border-bottom-left-radius:var(--radius,12px); border-bottom-right-radius:var(--radius,12px); }

      .wc-btn{
        border:1px solid #e9d7bf;  color: #3a2d1c; background:#f5eadb; border-radius:10px; padding:6px 12px; box-shadow: 0 1px 0 rgba(0,0,0,.04);transition: background 0.2s, border 0.2s;
        
  
  
        font:12px system-ui,Segoe UI,Roboto,Arial; cursor:pointer;
      }
      .wc-btn:hover{ background:#f6f6f6; }
      .wc-btn.primary{ background:var(--acc,#8a623f); color:#fff; border-color:var(--acc,#8a623f); }
      .wc-btn.ghost{ border-color:var(--acc-2,#cf995f); color:var(--acc,#8a623f); background:#fff; }

      .wc-empty{ color:var(--muted,#6f675f); font:13px system-ui,Segoe UI,Roboto,Arial; padding:12px 0; }

      /* resumo */
      .wc-summary .wc-header{ display:flex; align-items:center; justify-content:space-between; margin:2px 0 10px; }
      .wc-chipbar{ display:flex; gap:8px; flex-wrap:wrap; }
      .wc-chip{ border:1px solid #ddd; background:#fff; border-radius:999px; padding:4px 10px; font:12px system-ui,Segoe UI,Roboto,Arial; cursor:pointer; }
      .wc-chip.is-on{ background:var(--acc-2,#cf995f); color:#222; border-color:var(--acc-2,#cf995f); }
      .wc-bucket{ margin:10px 0 6px; }
      .wc-bucket h5{ margin:8px 0; font:700 13px system-ui,Segoe UI,Roboto,Arial; color:#333; }
      .wc-card{
        border:1px solid #eee; border-radius:10px; padding:8px 10px; background:#fff; margin:6px 0;
      }
      .wc-card h4{ margin:0 0 6px; font:600 13px system-ui,Segoe UI,Roboto,Arial; }
      .wc-tags{ display:flex; gap:6px; flex-wrap:wrap; }
      .wc-tag{ background:#f3efe9; border:1px solid #eadfce; border-radius:999px; padding:2px 8px; font:11px system-ui,Segoe UI,Roboto,Arial; }
      .wc-meta{ color:#666; font:12px system-ui,Segoe UI,Roboto,Arial; display:flex; gap:12px; flex-wrap:wrap; }
    `;
    const s = document.createElement('style');
    s.id = 'wc-styles'; s.textContent = css;
    document.head.appendChild(s);
  }

  function load(key) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) return DEFAULTS.slice();
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : DEFAULTS.slice();
    } catch { return DEFAULTS.slice(); }
  }
  function save(key, arr) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(arr)); }
    catch (e) { console.warn('[wood-catalog] não salvou:', e); }
  }

  // normaliza "uso" para buckets
  function uses(item) {
    const s = ((item.uso || '') + '').toLowerCase();
    const out = [];
    if (s.includes('tampo') || s.includes('top') || s.includes('soundboard')) out.push('tampo');
    if (s.includes('fundo') || s.includes('back')) out.push('fundo');
    if (s.includes('lateral')) out.push('laterais');
    if (s.includes('laterais') || s.includes('sides')) out.push('laterais');
    if (s.includes('escala')) out.push('escala');
    if (s.includes('braço')) out.push('braço');
    // "fundo/laterais" cai nos 2 buckets
    return [...new Set(out)];
  }

  function buildModal(key) {
    ensureStyles();
    let dlg = qs('#wc-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'wc-dialog';
      dlg.className = 'wc-modal';
      dlg.innerHTML = `
        <div class="wc-head">
          <h4>Catálogo de Madeiras</h4>
          <div>
            <button class="wc-btn ghost" data-act="summary">Resumo por uso</button>
            <button class="wc-btn" data-act="close">Fechar</button>
          </div>
        </div>
        <div class="wc-body">
          <div class="wc-search">
            <input type="text" placeholder="Pesquisar por nome/uso/obs..." aria-label="Pesquisar" data-wc="search">
            <span class="wc-pill" data-wc="count"></span>
          </div>
          <div class="wc-list" data-wc="list"></div>
          <div class="wc-add">
            <input type="text" placeholder="Nome" data-wc="add-nome">
            <input type="text" placeholder="Uso (Tampo/Fundo/Laterais/Braço/Escala)" data-wc="add-uso">
            <input type="text" placeholder="Observações" data-wc="add-obs">
            <button class="wc-btn" data-act="add">Adicionar</button>
          </div>
        </div>
        <div class="wc-foot">
          <span class="wc-pill">Conjunto: <strong data-wc="key"></strong></span>
          <span class="wc-pill">Armazenamento: localStorage</span>
        </div>
      `;
      document.body.appendChild(dlg);

      // Esc fecha
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); dlg.close(); });
    }

    const els = {
      list: qs('[data-wc="list"]', dlg),
      count: qs('[data-wc="count"]', dlg),
      key: qs('[data-wc="key"]', dlg),
      search: qs('[data-wc="search"]', dlg),
      addNome: qs('[data-wc="add-nome"]', dlg),
      addUso: qs('[data-wc="add-uso"]', dlg),
      addObs: qs('[data-wc="add-obs"]', dlg),
      btnSummary: qs('[data-act="summary"]', dlg),
    };

    let rows = load(key);
    let filter = '';
    let mode = 'list'; // 'list' | 'summary'

    function filtered() {
      if (!filter) return rows;
      const f = filter.toLowerCase();
      return rows.filter(r =>
        (r.nome || '').toLowerCase().includes(f) ||
        (r.uso || '').toLowerCase().includes(f) ||
        (r.obs || '').toLowerCase().includes(f)
      );
    }

    function renderList() {
      const data = filtered();
      els.key.textContent = key;
      els.count.textContent = `${data.length} itens`;
      if (!data.length) {
        els.list.innerHTML = `<div class="wc-empty">Nenhum item. Adicione acima.</div>`;
        return;
      }
      els.list.innerHTML = '';
      data.forEach((r, idx) => {
        const row = document.createElement('div');
        row.className = 'wc-row';
        row.innerHTML = `
          <input type="text" value="${r.nome || ''}" data-field="nome">
          <input type="text" value="${r.uso || ''}"  data-field="uso">
          <input type="text" value="${r.obs || ''}"  data-field="obs">
          <div class="wc-actions">
            <button class="wc-btn" data-act="del" title="Excluir">Excluir</button>
          </div>
        `;
        // edit
        qsa('input', row).forEach(inp => {
          inp.addEventListener('change', () => {
            const realIndex = rows.indexOf(data[idx]);
            const field = inp.dataset.field;
            rows[realIndex][field] = inp.value.trim();
            save(key, rows);
          });
        });
        // delete
        qs('[data-act="del"]', row).addEventListener('click', () => {
          const realIndex = rows.indexOf(data[idx]);
          if (realIndex >= 0) {
            rows.splice(realIndex, 1);
            save(key, rows);
            render();
          }
        });
        els.list.appendChild(row);
      });
    }

    function renderSummary(active = 'all') {
      const buckets = { tampo: [], fundo: [], laterais: [], escala: [], braço: [] };
      rows.forEach(w => {
        const u = uses(w);
        u.forEach(flag => { if (buckets[flag]) buckets[flag].push(w); });
      });

      const groups = [
        ['tampo', 'Tampo (soundboard)'],
        ['fundo', 'Fundo'],
        ['laterais', 'Laterais (sides)'],
        ['escala', 'Escala'],
        ['braço', 'Braço']
      ];

      const chip = (key, label) =>
        `<button class="wc-chip ${active === key ? 'is-on' : ''}" data-wc-filter="${key}">${label}</button>`;

      els.list.innerHTML = `
        <div class="wc-summary">
          <div class="wc-header">
            <div class="wc-title">Resumo por uso</div>
            <div class="wc-chipbar">
              ${chip('all', 'Todos')}
              ${chip('tampo', 'Tampo')}
              ${chip('fundo', 'Fundo')}
              ${chip('laterais', 'Laterais')}
              ${chip('escala', 'Escala')}
              ${chip('braço', 'Braço')}
            </div>
          </div>
          ${groups.map(([key, label]) => {
        if (active !== 'all' && active !== key) return '';
        const arr = buckets[key] || [];
        if (!arr.length) return '';
        return `
              <section class="wc-bucket" data-bucket="${key}">
                <h5>${label} — <span class="wc-meta">${arr.length} madeira(s)</span></h5>
                <div class="wc-list">
                  ${arr.map(w => `
                    <article class="wc-card">
                      <h4>${w.nome || 'Sem nome'}</h4>
                      <div class="wc-meta">
                        ${w.uso ? `<div>Uso: ${w.uso}</div>` : ''}
                        ${w.obs ? `<div>${w.obs}</div>` : ''}
                      </div>
                      <div class="wc-tags">
                        ${uses(w).map(u => `<span class="wc-tag">${u}</span>`).join('')}
                      </div>
                    </article>
                  `).join('')}
                </div>
              </section>
            `;
      }).join('')}
        </div>
      `;

      els.count.textContent = `${rows.length} itens`;
      // chips → re-render local
      els.list.querySelectorAll('.wc-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          renderSummary(btn.getAttribute('data-wc-filter'));
        });
      });
    }

    function render() {
      if (mode === 'list') renderList();
      else renderSummary('all');
    }

    // eventos fixos do modal
    dlg.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (!act) return;

      if (act === 'close') { dlg.close(); return; }
      if (act === 'add') {
        const nome = els.addNome.value.trim();
        const uso = els.addUso.value.trim();
        const obs = els.addObs.value.trim();
        if (!nome) { els.addNome.focus(); return; }
        rows.push({ nome, uso, obs });
        save(key, rows);
        els.addNome.value = ''; els.addUso.value = ''; els.addObs.value = '';
        if (mode === 'list') render(); else { mode = 'list'; els.btnSummary.classList.remove('primary'); els.btnSummary.classList.add('ghost'); els.btnSummary.textContent = 'Resumo por uso'; render(); }
        return;
      }
      if (act === 'summary') {
        if (mode === 'list') {
          mode = 'summary';
          els.btnSummary.classList.add('primary'); els.btnSummary.classList.remove('ghost');
          els.btnSummary.textContent = 'Voltar à lista';
          render();
        } else {
          mode = 'list';
          els.btnSummary.classList.remove('primary'); els.btnSummary.classList.add('ghost');
          els.btnSummary.textContent = 'Resumo por uso';
          render();
        }
      }
    });

    els.search.addEventListener('input', () => {
      filter = els.search.value || '';
      if (mode === 'list') renderList(); // busca só na lista
    });

    // primeiro render + abrir
    render();
    try {
      if (!dlg.open && typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    } catch { dlg.setAttribute('open', ''); }

    // devolve API básica
    return {
      open() { if (!dlg.open) dlg.showModal?.(); },
      close() { dlg.close(); }
    };
  }

  // API pública
  window.WoodCatalog = {
    open(key = 'prep1') { return buildModal(key); }
  };

  // Gatilho global (captura = true para vencer handlers legados)
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.wood-catalog-trigger,[data-wood-catalog]');
    if (!btn) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const key = btn.dataset.woodCatalog || 'prep1';
    window.WoodCatalog.open(key);
  }, true);
})();
