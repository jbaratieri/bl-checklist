/* step16-measures-presets.v3.js — presets + modal + live placeholders
   - Se apoia em class="persist" do seu app
   - Atualiza placeholders ao trocar de instrumento (sem F5)
   - Botão global: TABELA DE MEDIDAS
   - Atualizado: usa .open + body.modal-open para abrir/fechar modal
*/
(function () {
  'use strict';

  // === Presets (exemplos — personalize depois) ===
  window.BL_MEASURE_PRESETS = window.BL_MEASURE_PRESETS || {};
  const base = {
    braco: {
      madeira: "ex.: Cedro / Mogno",
      inclinacao_headstock: "ex.: 13–15",
      largura_nut: "ex.: 52",
      largura_casa12: "ex.: 62–63",
      espessura_nut: "ex.: 3.0",
      espessura_casa10: "ex.: 22–23"
    },
    tampo: {
      madeira: "ex.: Abeto / Cedro",
      comprimento: "ex.: 480",
      largura_bojo: "ex.: 360",
      largura_cintura: "ex.: 235",
      largura_ombro: "ex.: 275",
      espessura_final: "ex.: 2.2–2.8"
    },
    fundo: {
      madeira: "ex.: Jacarandá / Pau-ferro",
      espessura_final: "ex.: 2.5–3.0"
    },
    laterais: {
      madeira: "ex.: Jacarandá / Pau-ferro",
      comprimento: "ex.: 800",
      largura_culatra: "ex.: 95",
      largura_troculo: "ex.: 85"
    },
    escala: {
      madeira: "ex.: Ébano",
      espessura: "ex.: 6.0",
      largura_nut: "ex.: 52",
      largura_casa12: "ex.: 62–63"
    }
  };
  // fallback por instrumento
  window.BL_MEASURE_PRESETS.vcl = Object.assign({}, base, window.BL_MEASURE_PRESETS.vcl || {});
  window.BL_MEASURE_PRESETS.vla = Object.assign({}, base, window.BL_MEASURE_PRESETS.vla || {});
  window.BL_MEASURE_PRESETS.cav = Object.assign({}, base, window.BL_MEASURE_PRESETS.cav || {});
  window.BL_MEASURE_PRESETS.uku = Object.assign({}, base, window.BL_MEASURE_PRESETS.uku || {});

  // === Engine ===
  if (!window.__BL_MEASURES_ENGINE__) {
    window.__BL_MEASURES_ENGINE__ = true;
    (function () {
      const $$ = (s, c = document) => Array.from(c.querySelectorAll(s)), $ = (s, c = document) => c.querySelector(s);
      const INSTR = () => (localStorage.getItem('bl:instrument') || 'vcl');
      const DATA = () => (window.BL_MEASURE_PRESETS || {});
      const parseKey = k => { if (!k) return null; const [sec, field] = String(k).split('.'); return (sec && field) ? { sec, field } : null; };
      const getPreset = (code, sec, field) => { try { const d = DATA(); return (d[code] && d[code][sec] && d[code][sec][field]) || ''; } catch (_) { return '' } };

      function applyPlaceholders(root = document) {
        const inst = INSTR();
        $$('[data-measure]', root).forEach(inp => {
          const meta = parseKey(inp.getAttribute('data-measure')); if (!meta) return;
          const hint = getPreset(inst, meta.sec, meta.field); if (!hint) return;
          if ('placeholder' in inp) inp.setAttribute('placeholder', hint); else inp.setAttribute('title', hint);
        });
      }
      function fillEmptyValues(root = document) {
        const inst = INSTR();
        $$('[data-measure]', root).forEach(inp => {
          if (('value' in inp) && String(inp.value || '').trim()) return;
          const meta = parseKey(inp.getAttribute('data-measure')); if (!meta) return;
          const hint = getPreset(inst, meta.sec, meta.field); if (!hint) return;
          if ('value' in inp) inp.value = hint;
        });
      }

      // ---------- Modal factory / controls (ajustado para .open + body.modal-open) ----------
      function ensureModal() {
        let m = document.querySelector('#measuresModal');
        if (m) {
          // garantir que o modal esteja sempre no body
          if (m.parentElement !== document.body) {
            document.body.appendChild(m);
          }
          return m;
        }

        // criar modal
        m = document.createElement('div');
        m.id = 'measuresModal';
        m.className = 'measures-modal';
        m.innerHTML = `
    <div class="measures-backdrop" data-close></div>
    <div class="measures-dlg" role="dialog" aria-modal="true" aria-labelledby="measuresTitle">
      <header class="measures-hd">
        <h3 id="measuresTitle">Tabela de Medidas — <span id="measuresInst"></span></h3>
        <button class="btn measures-close" type="button" data-close aria-label="Fechar">×</button>
      </header>
      <div class="measures-body" id="measuresBody"></div>
      <footer class="measures-ft">
        <button class="btn" id="btnApplyPlaceholders" type="button">Aplicar como placeholder</button>
        <button class="btn primary" id="btnFillEmpty" type="button">Preencher campos vazios</button>
      </footer>
    </div>
  `;

        // garantir que o modal seja SEMPRE filho direto do body
        document.body.appendChild(m);

        // fecha ao clicar no backdrop ou no botão de fechar
        m.addEventListener('click', (e) => {
          if (e.target.hasAttribute('data-close')) {
            m.style.display = 'none';
            document.body.classList.remove('modal-open');
          }
        });

        // ações dos botões internos
        m.querySelector('#btnApplyPlaceholders').addEventListener('click', () => {
          applyPlaceholders(document);
          alert('Placeholders atualizados.');
        });

        m.querySelector('#btnFillEmpty').addEventListener('click', () => {
          fillEmptyValues(document);
          alert('Campos vazios preenchidos.');
        });

        return m;
      }


      // openModal agora delega à API do modal (open/close) e mantém restauração de footer
      function openModal(sectionFilter = null) {
        const m = ensureModal(); const code = INSTR(); const names = { vcl: 'Violão', vla: 'Viola', cav: 'Cavaquinho', uku: 'Ukulele' };
        $('#measuresInst', m).textContent = names[code] || code.toUpperCase();
        const body = $('#measuresBody', m); body.innerHTML = '';
        const secs = (window.BL_MEASURE_PRESETS && window.BL_MEASURE_PRESETS[code]) || {};
        Object.keys(secs).forEach(sec => {
          if (sectionFilter && sectionFilter !== sec) return;
          const table = document.createElement('table'); table.className = 'measures-table';
          const head = document.createElement('thead'); head.innerHTML = `<tr><th colspan="2">${sec.toUpperCase()}</th></tr>`;
          const tb = document.createElement('tbody');
          Object.entries(secs[sec]).forEach(([field, val]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${field.replace(/_/g, ' ')}</td><td>${val || '—'}</td>`;
            tb.appendChild(tr);
          });
          table.appendChild(head); table.appendChild(tb); body.appendChild(table);
        });

        // esconder footer temporariamente se desejar (o comportamento anterior escondia o footer para tuning)
        // Mas aqui vamos manter o footer visível por padrão; quem quiser escondê-lo antes de abrir,
        // faz: const m = ensureModal(); const ft = m.querySelector('.measures-ft'); if (ft) ft.style.display='none';
        // Abrimos via API:
        if (m.open && typeof m.open === 'function') {
          m.open();
        } else {
          // fallback: ajustar display/scroll
          m.classList.add('open');
          document.body.classList.add('modal-open');
          m.style.display = 'flex';
        }
      }

      // no final da IIFE, depois de ensureModal / openModal estarem definidos:
      try {
        // expor helpers para outros scripts
        window.ensureModal = ensureModal;
        window.openMeasuresModal = openModal; // nome amigável — openModal é interno
      } catch (e) { /* noop */ }

      function injectGlobalButton() {
        // Só injeta se o botão não existir (no HTML principal ele já existe)
        if (document.getElementById('btnMeasuresTable')) {
          document.getElementById('btnMeasuresTable').addEventListener('click', () => openModal(null));
          return;
        }
        const anchor = document.querySelector('.toolbar') || document.body;
        const btn = document.createElement('button');
        btn.id = 'btnMeasuresTable';
        btn.className = 'btn';
        btn.textContent = 'TABELA DE MEDIDAS';
        anchor.appendChild(btn);
        btn.addEventListener('click', () => openModal(null));
      }

      function boot() {
        applyPlaceholders(document);
        injectGlobalButton();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { boot(); setTimeout(boot, 300); setTimeout(boot, 1000); });
      } else {
        boot(); setTimeout(boot, 100); setTimeout(boot, 500);
      }

      const mo = new MutationObserver(muts => {
        let touched = false;
        muts.forEach(m => {
          m.addedNodes && Array.from(m.addedNodes).forEach(n => {
            if (!(n instanceof HTMLElement)) return;
            if (n.hasAttribute && n.hasAttribute('data-measure')) touched = true;
            if (n.querySelector && n.querySelector('[data-measure]')) touched = true;
          })
        });
        if (touched) { applyPlaceholders(document); }
      });
      mo.observe(document.documentElement, { subtree: true, childList: true });

      (function instrumentWatcher() {
        let last = INSTR(); const refresh = () => applyPlaceholders(document);
        try {
          if (!localStorage.__blMeasurePatchedV3) {
            localStorage.__blMeasurePatchedV3 = true;
            const _set = localStorage.setItem.bind(localStorage);
            localStorage.setItem = function (k, v) { const prev = localStorage.getItem(k); const out = _set(k, v); if (k === 'bl:instrument' && v !== prev) { last = v; refresh(); } return out; };
            const _rem = localStorage.removeItem.bind(localStorage);
            localStorage.removeItem = function (k) { const out = _rem(k); if (k === 'bl:instrument') { last = INSTR(); refresh(); } return out; };
          }
        } catch (_) { }
        setInterval(() => { const now = INSTR(); if (now !== last) { last = now; refresh(); } }, 800);
      })();

      window.BL_MEASURE_DEBUG = function () {
        const inst = INSTR(); const els = $$('[data-measure]');
        console.groupCollapsed('MEASURES DEBUG');
        console.log('Instrumento:', inst, 'inputs mapeados:', els.length);
        els.forEach(el => console.log(el, '→', el.getAttribute('data-measure'), 'placeholder=', el.getAttribute('placeholder'), 'value=', ('value' in el) ? el.value : undefined));
        console.groupEnd();
      };
    })();
  }
})();
