// Presets de medidas por modelo (fonte: ODS).
// Chaves = value de #job-model. Valores ligados a data-measure / ids do projeto.
// Largura da casa 12/14/19 e espaçamentos derivados são calculados no projeto
// (nut + margem + furos do cavalete); os valores ODS de casa 12 não substituem o cálculo.
(function () {
  'use strict';

  /** @type {Record<string, { label: string, note?: string, values: Record<string, string> }>} */
  var PRESETS = {
    violao_classico: {
      label: 'Violão Clássico',
      note: 'Padrão espanhol/Torres; braço mais largo e chato para técnica de dedilhado. Laterais ~90/100 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '52',
        'braco.largura_casa12': '62',
        'braco.espessura_nut': '22',
        'braco.espessura_casa10': '25',
        'tampo.comprimento': '490',
        'tampo.largura_bojo': '370',
        'tampo.largura_cintura': '245',
        'tampo.largura_ombro': '280',
        'laterais.largura_culatra': '100',
        'laterais.largura_troculo': '90',
        'job-scale-mm': '650',
        'escala.espessura': '7',
        'escala.largura_nut': '52',
        'escala.largura_casa12': '62',
        'escala.margem_corda': '4',
        'escala.distanciamento_furos_cavalete': '58'
      }
    },
    violao_folk: {
      label: 'Violão Folk',
      note: 'Padrão Martin D; braço mais estreito, corpo grande e potente. Laterais ~110/120 mm.',
      values: {
        'braco.inclinacao_headstock': '10–14',
        'braco.largura_nut': '43',
        'braco.largura_casa12': '56',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '508',
        'tampo.largura_bojo': '400',
        'tampo.largura_cintura': '275',
        'tampo.largura_ombro': '295',
        'laterais.largura_culatra': '120',
        'laterais.largura_troculo': '100',
        'job-scale-mm': '648',
        'escala.espessura': '7',
        'escala.largura_nut': '43',
        'escala.largura_casa12': '56',
        'escala.margem_corda': '3.5',
        'escala.distanciamento_furos_cavalete': '54'
      }
    },
    violao_om: {
      label: 'Violão OM',
      note: 'Corpo mais equilibrado que o dread; boa resposta para fingerstyle. Laterais ~95/105 mm.',
      values: {
        'braco.inclinacao_headstock': '10–14',
        'braco.largura_nut': '44.5',
        'braco.largura_casa12': '55',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '492',
        'tampo.largura_bojo': '385',
        'tampo.largura_cintura': '238',
        'tampo.largura_ombro': '285',
        'laterais.largura_culatra': '105',
        'laterais.largura_troculo': '92',
        'job-scale-mm': '645',
        'escala.espessura': '7',
        'escala.largura_nut': '44.5',
        'escala.largura_casa12': '55',
        'escala.margem_corda': '3.5',
        'escala.distanciamento_furos_cavalete': '55'
      }
    },
    violao_jumbo: {
      label: 'Violão Jumbo',
      note: 'Corpo mais volumoso, cintura mais estreita e bojo inferior maior. Laterais ~112/122 mm.',
      values: {
        'braco.inclinacao_headstock': '10–14',
        'braco.largura_nut': '43',
        'braco.largura_casa12': '57',
        'braco.espessura_nut': '21.5',
        'braco.espessura_casa10': '23.5',
        'tampo.comprimento': '530',
        'tampo.largura_bojo': '430',
        'tampo.largura_cintura': '260',
        'tampo.largura_ombro': '310',
        'laterais.largura_culatra': '125',
        'laterais.largura_troculo': '102',
        'job-scale-mm': '648',
        'escala.espessura': '7',
        'escala.largura_nut': '43',
        'escala.largura_casa12': '57',
        'escala.margem_corda': '3.5',
        'escala.distanciamento_furos_cavalete': '54'
      }
    },
    violao_flat: {
      label: 'Violão Flat',
      note: 'Preset inicial de flat-top aço (estilo 000/OM). Ajuste fino manual conforme o projeto. Laterais ~100/110 mm.',
      values: {
        'braco.inclinacao_headstock': '12–14',
        'braco.largura_nut': '43',
        'braco.largura_casa12': '56',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '480',
        'tampo.largura_bojo': '360',
        'tampo.largura_cintura': '235',
        'tampo.largura_ombro': '275',
        'laterais.largura_culatra': '65',
        'laterais.largura_troculo': '55',
        'job-scale-mm': '650',
        'escala.espessura': '7',
        'escala.largura_nut': '43',
        'escala.largura_casa12': '56',
        'escala.margem_corda': '3.5',
        'escala.distanciamento_furos_cavalete': '57'
      }
    },
    viola_caipira: {
      label: 'Viola Caipira',
      note: 'Medidas típicas de viola tradicional; 10 cordas em 5 ordens. Laterais ~80/90 mm.',
      values: {
        'braco.inclinacao_headstock': '10–12',
        'braco.largura_nut': '45',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '450',
        'tampo.largura_bojo': '340',
        'tampo.largura_cintura': '215',
        'tampo.largura_ombro': '255',
        'laterais.largura_culatra': '95',
        'laterais.largura_troculo': '85',
        'job-scale-mm': '580',
        'escala.espessura': '6',
        'escala.largura_nut': '45',
        'escala.largura_casa12': '60',
        'escala.margem_corda': '3',
        'escala.distanciamento_furos_cavalete': '50'
      }
    },
    viola_cinturada: {
      label: 'Viola Cinturada',
      note: 'Cintura mais acentuada; mesma escala/braço da tradicional. Laterais ~78/88 mm.',
      values: {
        'braco.inclinacao_headstock': '10–12',
        'braco.largura_nut': '46',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '455',
        'tampo.largura_bojo': '335',
        'tampo.largura_cintura': '195',
        'tampo.largura_ombro': '240',
        'laterais.largura_culatra': '95',
        'laterais.largura_troculo': '85',
        'job-scale-mm': '580',
        'escala.espessura': '6',
        'escala.largura_nut': '46',
        'escala.largura_casa12': '60',
        'escala.margem_corda': '3',
        'escala.distanciamento_furos_cavalete': '50'
      }
    },
    viola_610: {
      label: 'Viola 610mm',
      note: 'Escala longa (610 mm); corpo levemente maior. Laterais ~82/92 mm.',
      values: {
        'braco.inclinacao_headstock': '10–12',
        'braco.largura_nut': '45',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '465',
        'tampo.largura_bojo': '350',
        'tampo.largura_cintura': '220',
        'tampo.largura_ombro': '260',
        'laterais.largura_culatra': '98',
        'laterais.largura_troculo': '88',
        'job-scale-mm': '610',
        'escala.espessura': '6',
        'escala.largura_nut': '45',
        'escala.largura_casa12': '60',
        'escala.margem_corda': '3',
        'escala.distanciamento_furos_cavalete': '50'
      }
    },
    cavaquinho_tradicional: {
      label: 'Cavaquinho Tradicional',
      note: 'Corpo pequeno, 4 cordas; braço fino e estreito. Laterais ~50/60 mm.',
      values: {
        'braco.inclinacao_headstock': '8–10',
        'braco.largura_nut': '30',
        'braco.largura_casa12': '35',
        'braco.espessura_nut': '19',
        'braco.espessura_casa10': '21',
        'tampo.comprimento': '280',
        'tampo.largura_bojo': '230',
        'tampo.largura_cintura': '150',
        'tampo.largura_ombro': '180',
        'laterais.largura_culatra': '85',
        'laterais.largura_troculo': '75',
        'job-scale-mm': '345',
        'escala.espessura': '5',
        'escala.largura_nut': '30',
        'escala.largura_casa12': '35',
        'escala.margem_corda': '2.5',
        'escala.distanciamento_furos_cavalete': '35'
      }
    },
    ukulele_soprano: {
      label: 'Ukulele Soprano',
      note: 'Menor da família; escala curta, som brilhante. Laterais ~44/54 mm.',
      values: {
        'braco.inclinacao_headstock': '0–5',
        'braco.largura_nut': '35',
        'braco.largura_casa12': '42',
        'braco.espessura_nut': '18.5',
        'braco.espessura_casa10': '20',
        'tampo.comprimento': '240',
        'tampo.largura_bojo': '175',
        'tampo.largura_cintura': '110',
        'tampo.largura_ombro': '130',
        'laterais.largura_culatra': '60',
        'laterais.largura_troculo': '55',
        'job-scale-mm': '345',
        'escala.espessura': '5',
        'escala.largura_nut': '35',
        'escala.largura_casa12': '42',
        'escala.margem_corda': '3',
        'escala.distanciamento_furos_cavalete': '40'
      }
    },
    ukulele_concert: {
      label: 'Ukulele Concert',
      note: 'Corpo um pouco maior que o soprano; mais volume e sustain. Laterais ~50/60 mm.',
      values: {
        'braco.inclinacao_headstock': '0–5',
        'braco.largura_nut': '35',
        'braco.largura_casa12': '42',
        'braco.espessura_nut': '19',
        'braco.espessura_casa10': '20.5',
        'tampo.comprimento': '280',
        'tampo.largura_bojo': '205',
        'tampo.largura_cintura': '125',
        'tampo.largura_ombro': '150',
        'laterais.largura_culatra': '68',
        'laterais.largura_troculo': '60',
        'job-scale-mm': '380',
        'escala.espessura': '5',
        'escala.largura_nut': '35',
        'escala.largura_casa12': '42',
        'escala.margem_corda': '3',
        'escala.distanciamento_furos_cavalete': '40'
      }
    },
    ukulele_tenor: {
      label: 'Ukulele Tenor',
      note: 'Mais usado por profissionais; melhor projeção grave. Laterais ~60/70 mm.',
      values: {
        'braco.inclinacao_headstock': '0–5',
        'braco.largura_nut': '37',
        'braco.largura_casa12': '43',
        'braco.espessura_nut': '19.5',
        'braco.espessura_casa10': '21',
        'tampo.comprimento': '305',
        'tampo.largura_bojo': '230',
        'tampo.largura_cintura': '140',
        'tampo.largura_ombro': '165',
        'laterais.largura_culatra': '75',
        'laterais.largura_troculo': '65',
        'job-scale-mm': '430',
        'escala.espessura': '5',
        'escala.largura_nut': '37',
        'escala.largura_casa12': '43',
        'escala.margem_corda': '3',
        'escala.distanciamento_furos_cavalete': '42'
      }
    },
    ukulele_baritono: {
      label: 'Ukulele Barítono',
      note: 'Afinação DGBE; braço mais próximo do violão. Laterais ~70/80 mm.',
      values: {
        'braco.inclinacao_headstock': '5–10',
        'braco.largura_nut': '38',
        'braco.largura_casa12': '52',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '355',
        'tampo.largura_bojo': '265',
        'tampo.largura_cintura': '165',
        'tampo.largura_ombro': '195',
        'laterais.largura_culatra': '82',
        'laterais.largura_troculo': '72',
        'job-scale-mm': '480',
        'escala.espessura': '5',
        'escala.largura_nut': '38',
        'escala.largura_casa12': '52',
        'escala.margem_corda': '3.2',
        'escala.distanciamento_furos_cavalete': '45'
      }
    }
  };

  // Pontos da figura (posições em % — calibrados na arte mapa-medidas.png).
  var HOTSPOTS = [
    { id: 'escala', label: 'Comprimento de escala', unit: 'mm', bind: 'job-scale-mm', x: 10.2, y: 47.0, hasPreset: true },
    { id: 'inclinacao', label: 'Inclinação do headstock', unit: '°', bind: 'braco.inclinacao_headstock', x: 68.5, y: 10.5, hasPreset: true },
    { id: 'largura_nut', label: 'Largura do braço no nut', unit: 'mm', bind: 'braco.largura_nut', x: 34.3, y: 17.8, hasPreset: true },
    { id: 'esp_nut', label: 'Espessura do braço (casa 1)', unit: 'mm', bind: 'braco.espessura_nut', x: 69.9, y: 19.1, hasPreset: true },
    { id: 'largura_casa12', label: 'Largura braço (casa 12)', unit: 'mm', bind: 'braco.largura_casa12', x: 34.5, y: 48.5, hasPreset: true },
    { id: 'esp_casa12', label: 'Espessura do braço (casa 9)', unit: 'mm', bind: 'braco.espessura_casa10', x: 69.8, y: 43.3, hasPreset: true },
    { id: 'comprimento', label: 'Comprimento do tampo/fundo', unit: 'mm', bind: 'tampo.comprimento', x: 34.4, y: 94.0, hasPreset: true },
    { id: 'ombro', label: 'Largura tampo/fundo - bojo superior', unit: 'mm', bind: 'tampo.largura_ombro', x: 34.8, y: 57.4, hasPreset: true },
    { id: 'cintura', label: 'Largura tampo/fundo - cintura', unit: 'mm', bind: 'tampo.largura_cintura', x: 34.8, y: 68.4, hasPreset: true },
    { id: 'bojo', label: 'Largura tampo/fundo - bojo', unit: 'mm', bind: 'tampo.largura_bojo', x: 34.6, y: 85.2, hasPreset: true },
    { id: 'prof_culatra', label: 'Profundidade da caixa na culatra', unit: 'mm', bind: 'laterais.largura_culatra', x: 74.5, y: 95.5, hasPreset: true },
    { id: 'prof_troculo', label: 'Profundidade da caixa no tróculo', unit: 'mm', bind: 'laterais.largura_troculo', x: 74.2, y: 54.4, hasPreset: true }
  ];

  window.BL_MODEL_MEASURE_PRESETS = PRESETS;
  window.BL_MEASURE_HOTSPOTS = HOTSPOTS;

  window.BL_MEASURE_PRESET_API = {
    getByModel: function (modelId) {
      return PRESETS[modelId] || null;
    },
    listHotspots: function () {
      return HOTSPOTS.slice();
    },
    resolveFields: function (bind) {
      if (!bind) return [];
      if (bind.indexOf('.') === -1) {
        var el = document.getElementById(bind);
        return el ? [el] : [];
      }
      return Array.prototype.slice.call(document.querySelectorAll('[data-measure="' + bind + '"]'));
    },
    resolveField: function (bind) {
      var all = this.resolveFields(bind);
      return all[0] || null;
    }
  };
})();
