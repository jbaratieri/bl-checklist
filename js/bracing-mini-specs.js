// Mini “fichas” comparativas (rigidez, resposta, sustain, dificuldade) nos callouts
// com `data-bracing`, ex.: etapa tampo6. HTML válido: usa <span> dentro de <p>.
// `custom` e chaves desconhecidas: não injeta nada.
(function () {
  'use strict';

  var BRACING_SPECS = {
    leque_3_barras: {
      rigidez: '●●○○○',
      resposta: '●●●●●',
      sustain: '●●○○○',
      dificuldade: '●○○○○'
    },
    leque_5_barras: {
      rigidez: '●●●○○',
      resposta: '●●●●○',
      sustain: '●●●○○',
      dificuldade: '●●○○○'
    },
    torres: {
      rigidez: '●●●○○',
      resposta: '●●●●○',
      sustain: '●●●○○',
      dificuldade: '●●○○○'
    },
    hauser: {
      rigidez: '●●●●○',
      resposta: '●●●○○',
      sustain: '●●●●○',
      dificuldade: '●●●●○'
    },
    ramirez: {
      rigidez: '●●●●●',
      resposta: '●●○○○',
      sustain: '●●●●●',
      dificuldade: '●●●○○'
    },
    x_bracing: {
      rigidez: '●●●●●',
      resposta: '●●○○○',
      sustain: '●●●●○',
      dificuldade: '●●●○○'
    },
    x_adaptado: {
      rigidez: '●●●●○',
      resposta: '●●●○○',
      sustain: '●●●○○',
      dificuldade: '●●●○○'
    },
    leque_7_barras: {
      rigidez: '●●●○○',
      resposta: '●●●○○',
      sustain: '●●●●○',
      dificuldade: '●●●○○'
    }
  };

  function row(label, dots) {
    var r = document.createElement('span');
    r.className = 'mini-spec__row';
    var lb = document.createElement('span');
    lb.className = 'mini-spec__label';
    lb.textContent = label;
    var d = document.createElement('span');
    d.className = 'mini-spec__dots';
    d.textContent = dots;
    r.appendChild(lb);
    r.appendChild(d);
    return r;
  }

  function injectBracingMiniSpecs() {
    document.querySelectorAll('.callout[data-bracing]').forEach(function (callout) {
      var raw = (callout.getAttribute('data-bracing') || '').trim();
      if (!raw) return;
      var bracing = raw.split(/\s+/).filter(Boolean)[0];
      var spec = BRACING_SPECS[bracing];
      if (!spec) return;
      if (callout.querySelector('.mini-spec')) return;

      var wrap = document.createElement('span');
      wrap.className = 'mini-spec';
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Resumo comparativo do sistema de leque');

      wrap.appendChild(row('Rigidez', spec.rigidez));
      wrap.appendChild(row('Resposta', spec.resposta));
      wrap.appendChild(row('Sustain', spec.sustain));
      wrap.appendChild(row('Dificuldade', spec.dificuldade));

      var strong = callout.querySelector('strong');
      if (strong) strong.insertAdjacentElement('afterend', wrap);
      else callout.insertBefore(wrap, callout.firstChild);
    });
  }

  document.addEventListener('DOMContentLoaded', injectBracingMiniSpecs);
  document.addEventListener('callout:refresh', injectBracingMiniSpecs);
})();
