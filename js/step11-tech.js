// `step11-tech.js`: carrega figuras tecnicas corretas para cada instrumento.
// Procura arquivos por convencao, cria imagem/legenda e remove blocos quando nao encontra asset.
// Atenção: nomes e caminhos dos arquivos em `assets/tech` precisam seguir o padrao esperado.
(function () {
  'use strict';

  const INST_KEY = 'bl:instrument'; // vcl|vla|cav|uku
  const FALLBACKS = ['svg', 'png', 'jpg', 'webp']; // prioridade para SVG

  function currentInst() {
    try {
      return (window.BL_INSTRUMENT && typeof BL_INSTRUMENT.get === 'function' && BL_INSTRUMENT.get())
        || localStorage.getItem(INST_KEY)
        || 'vcl';
    } catch (_) {
      return localStorage.getItem(INST_KEY) || 'vcl';
    }
  }

  function sectionIdOf(el) {
    const s = el.closest('[id^="sec-"]');
    return s ? s.id : null;
  }

  // Permite caminhos explícitos por instrumento, ex.: data-src-vcl="assets/tech/vcl/prep1.svg"
  function byAttr(el, inst) {
    const attr = 'data-src-' + inst;
    return el.getAttribute(attr);
  }

  function basesForAssets() {
    var bases = [];
    if (location.protocol !== 'file:') {
      try {
        var link = document.querySelector('link[rel="manifest"]');
        if (link) {
          var href = link.getAttribute('href') || '';
          if (href && !/^[a-z]+:/i.test(href)) {
            var a = document.createElement('a'); a.href = href; href = a.getAttribute('href');
          }
          var pub = href.replace(/manifest\.json.*$/, '');
          if (pub && !/\/$/.test(pub)) pub += '/';
          if (pub) bases.push(pub + 'assets/tech/');
        }
      } catch (_) { }
    }
    bases.push('/assets/tech/');
    bases.push('assets/tech/');
    bases.push('../public/assets/tech/');
    return Array.from(new Set(bases));
  }
  function autoCandidates(inst, secId, key) {
    const baseKey = key || secId;
    if (!baseKey) return [];
    const out = [];
    basesForAssets().forEach(function (root) {
      const base = `${root}${inst}/${baseKey}`;
      FALLBACKS.forEach(function (ext) { out.push(`${base}.${ext}`); });
    });
    return out;
  }
  function currentBracingValue() {
    var el = document.getElementById('job-bracing-system');
    return (el && el.value ? String(el.value).trim() : '');
  }
  function bracingVariantCandidates(inst, baseKey) {
    if (baseKey !== 'tampo7b-tech') return [];
    var bracing = currentBracingValue();
    if (!bracing || bracing === 'custom') return [];
    var out = [];
    basesForAssets().forEach(function (root) {
      var base = `${root}${inst}/tampo7b-tech--${bracing}`;
      out.push(`${base}.svg`);
      out.push(`${base}.svg.svg`);
      out.push(`${base}.webp`);
      out.push(`${base}.png`);
      out.push(`${base}.jpg`);
      out.push(`${base}.jpeg`);
    });
    return out;
  }

  function clearFigure(fig) {
    fig.querySelectorAll('img, figcaption, .placeholder').forEach(n => n.remove());
  }

  function createImg(altText) {
    const img = document.createElement('img');
    img.className = 'tech-img';
    if (altText) img.alt = altText;
    return img;
  }

  function ensureCaption(fig, text) {
    if (!text) return null;
    let cap = fig.querySelector('figcaption');
    if (!cap) {
      cap = document.createElement('figcaption');
      fig.appendChild(cap);
    }
    cap.textContent = text;
    return cap;
  }

  // Se o figure tiver data-place="before-tools", move ele antes da .tool-row mais próxima
  function placeBeforeTools(fig) {
    if (fig.getAttribute('data-place') !== 'before-tools') return;
    const scope = fig.closest('.subetapa') || fig.parentElement;
    const tools = scope ? scope.querySelector('.tool-row') : null;
    if (tools && tools.previousElementSibling !== fig) {
      tools.parentNode.insertBefore(fig, tools);
    }
  }

  function applyFigure(fig, inst) {
    // Limpa o figure antes de tentar carregar algo
    clearFigure(fig);

    const capText = fig.getAttribute('data-cap') || '';
    const secId = sectionIdOf(fig) || fig.getAttribute('data-tech') || '';
    const key = fig.getAttribute('data-key') || '';
    const explicit = byAttr(fig, inst);

    const baseKey = key || secId;
    const variants = explicit ? [] : bracingVariantCandidates(inst, baseKey);
    const candidates = explicit ? [explicit] : variants.concat(autoCandidates(inst, secId, key));
    if (!candidates.length) {
      // Sem candidatos => não mostra nada
      return;
    }

    const img = createImg(capText);
    fig.prepend(img);

    let i = 0;
    img.onerror = function () {
      i++;
      if (i < candidates.length) {
        img.src = candidates[i];
      } else {
        // Nenhum arquivo encontrado => não mostra nada
        img.remove();
        // Se havia legenda criada, remove para não sobrar resíduo visual
        fig.querySelector('figcaption')?.remove();
      }
    };

    img.onload = function () {
      // Só cria legenda se houver texto definido
      ensureCaption(fig, capText);
    };

    img.src = candidates[0];
  }

  function refreshAll() {
    const inst = currentInst();
    document.querySelectorAll('figure.tech-figure, figure[data-tech]').forEach(fig => {
      applyFigure(fig, inst);
      placeBeforeTools(fig);
    });
  }

  function bindBracingChangeRefresh() {
    var sel = document.getElementById('job-bracing-system');
    if (!sel || sel.__blTechBracingBound) return;
    sel.__blTechBracingBound = true;
    sel.addEventListener('change', refreshAll);
    sel.addEventListener('input', refreshAll);
  }

  // Atualiza quando o usuário confirma troca de instrumento no modal
  document.addEventListener('click', e => {
    const btn = e.target.closest('#inst-modal [data-act="apply"]');
    if (btn) setTimeout(refreshAll, 0);
  });

  // Atualiza ao carregar a página
  document.addEventListener('DOMContentLoaded', function () {
    bindBracingChangeRefresh();
    refreshAll();
  });

  // Se sua app emite evento customizado de troca de instrumento, podemos ouvir também:
  document.addEventListener('instrument:changed', refreshAll);
  window.addEventListener('bl:project-change', bindBracingChangeRefresh);
  window.addEventListener('bl:instrument-change', function () {
    bindBracingChangeRefresh();
    refreshAll();
  });
})();
