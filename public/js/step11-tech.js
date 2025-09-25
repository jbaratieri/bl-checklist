// step11-tech.js — Figuras técnicas por instrumento (sem placeholders)
(function () {
  'use strict';

  const INST_KEY = 'bl:instrument'; // vcl|vla|cav|uku
  const FALLBACKS = ['svg', 'png', 'jpg', 'webp']; // prioridade para SVG

  function currentInst() {
    return localStorage.getItem(INST_KEY) || 'vcl';
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

  function autoCandidates(inst, secId, key) {
    const baseKey = key || secId;
    if (!baseKey) return [];
    const base = `assets/tech/${inst}/${baseKey}`;
    return FALLBACKS.map(ext => `${base}.${ext}`);
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

    const candidates = explicit ? [explicit] : autoCandidates(inst, secId, key);
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

  // Atualiza quando o usuário confirma troca de instrumento no modal
  document.addEventListener('click', e => {
    const btn = e.target.closest('#inst-modal [data-act="apply"]');
    if (btn) setTimeout(refreshAll, 0);
  });

  // Atualiza ao carregar a página
  document.addEventListener('DOMContentLoaded', refreshAll);

  // Se sua app emite evento customizado de troca de instrumento, podemos ouvir também:
  document.addEventListener('instrument:changed', refreshAll);
})();
