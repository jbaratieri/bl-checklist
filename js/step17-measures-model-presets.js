// Presets de medidas por modelo (fonte: ODS + literatura de luthieria).
// Chaves = value de #job-model. Valores ligados a data-measure / ids do projeto.
// Laterais: largura_troculo = largura_culatra - 10 mm (regra do projeto).
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
        'escala.largura_casa12': '62'
      }
    },
    violao_folk: {
      label: 'Violão Folk',
      note: 'Padrão Martin D; braço mais estreito, corpo grande e potente. Laterais ~110/120 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '44',
        'braco.largura_casa12': '56',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '510',
        'tampo.largura_bojo': '397',
        'tampo.largura_cintura': '270',
        'tampo.largura_ombro': '295',
        'laterais.largura_culatra': '120',
        'laterais.largura_troculo': '110',
        'job-scale-mm': '645',
        'escala.espessura': '7',
        'escala.largura_nut': '44',
        'escala.largura_casa12': '56'
      }
    },
    violao_om: {
      label: 'Violão OM',
      note: 'Corpo mais equilibrado que o dread; boa resposta para fingerstyle. Laterais ~95/105 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '43',
        'braco.largura_casa12': '55',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '490',
        'tampo.largura_bojo': '390',
        'tampo.largura_cintura': '245',
        'tampo.largura_ombro': '300',
        'laterais.largura_culatra': '105',
        'laterais.largura_troculo': '95',
        'job-scale-mm': '645',
        'escala.espessura': '7',
        'escala.largura_nut': '43',
        'escala.largura_casa12': '55'
      }
    },
    violao_jumbo: {
      label: 'Violão Jumbo',
      note: 'Corpo mais volumoso, cintura mais estreita e bojo inferior maior. Laterais ~112/122 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '45',
        'braco.largura_casa12': '57',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '24',
        'tampo.comprimento': '532',
        'tampo.largura_bojo': '432',
        'tampo.largura_cintura': '265',
        'tampo.largura_ombro': '318',
        'laterais.largura_culatra': '122',
        'laterais.largura_troculo': '112',
        'job-scale-mm': '650',
        'escala.espessura': '7',
        'escala.largura_nut': '45',
        'escala.largura_casa12': '57'
      }
    },
    violao_flat: {
      label: 'Violão Flat',
      note: 'Preset inicial de flat-top aço (estilo 000/OM). Ajuste fino manual conforme o projeto. Laterais ~100/110 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '44',
        'braco.largura_casa12': '56',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '490',
        'tampo.largura_bojo': '385',
        'tampo.largura_cintura': '270',
        'tampo.largura_ombro': '285',
        'laterais.largura_culatra': '75',
        'laterais.largura_troculo': '65',
        'job-scale-mm': '645',
        'escala.espessura': '7',
        'escala.largura_nut': '44',
        'escala.largura_casa12': '56'
      }
    },
    viola_caipira: {
      label: 'Viola Caipira',
      note: 'Medidas típicas de viola tradicional; 10 cordas em 5 ordens. Laterais ~80/90 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '50',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '460',
        'tampo.largura_bojo': '355',
        'tampo.largura_cintura': '200',
        'tampo.largura_ombro': '255',
        'laterais.largura_culatra': '90',
        'laterais.largura_troculo': '80',
        'job-scale-mm': '580',
        'escala.espessura': '6',
        'escala.largura_nut': '50',
        'escala.largura_casa12': '60'
      }
    },
    viola_cinturada: {
      label: 'Viola Cinturada',
      note: 'Cintura mais acentuada; mesma escala/braço da tradicional. Laterais ~78/88 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '50',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '435',
        'tampo.largura_bojo': '325',
        'tampo.largura_cintura': '185',
        'tampo.largura_ombro': '240',
        'laterais.largura_culatra': '88',
        'laterais.largura_troculo': '78',
        'job-scale-mm': '580',
        'escala.espessura': '6',
        'escala.largura_nut': '50',
        'escala.largura_casa12': '60'
      }
    },
    viola_610: {
      label: 'Viola 610mm',
      note: 'Escala longa (610 mm); corpo levemente maior. Laterais ~82/92 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '50',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '470',
        'tampo.largura_bojo': '360',
        'tampo.largura_cintura': '220',
        'tampo.largura_ombro': '260',
        'laterais.largura_culatra': '92',
        'laterais.largura_troculo': '82',
        'job-scale-mm': '610',
        'escala.espessura': '6',
        'escala.largura_nut': '50',
        'escala.largura_casa12': '60'
      }
    },
    cavaquinho_tradicional: {
      label: 'Cavaquinho Tradicional',
      note: 'Corpo pequeno, 4 cordas; braço fino e estreito. Laterais ~50/60 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '29',
        'braco.largura_casa12': '35',
        'braco.espessura_nut': '16',
        'braco.espessura_casa10': '18',
        'tampo.comprimento': '245',
        'tampo.largura_bojo': '190',
        'tampo.largura_cintura': '130',
        'tampo.largura_ombro': '150',
        'laterais.largura_culatra': '60',
        'laterais.largura_troculo': '50',
        'job-scale-mm': '330',
        'escala.espessura': '5',
        'escala.largura_nut': '29',
        'escala.largura_casa12': '35'
      }
    },
    ukulele_soprano: {
      label: 'Ukulele Soprano',
      note: 'Menor da família; escala curta, som brilhante. Laterais ~44/54 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '35',
        'braco.largura_casa12': '42',
        'braco.espessura_nut': '18',
        'braco.espessura_casa10': '20',
        'tampo.comprimento': '230',
        'tampo.largura_bojo': '180',
        'tampo.largura_cintura': '125',
        'tampo.largura_ombro': '140',
        'laterais.largura_culatra': '54',
        'laterais.largura_troculo': '44',
        'job-scale-mm': '350',
        'escala.espessura': '5',
        'escala.largura_nut': '35',
        'escala.largura_casa12': '42'
      }
    },
    ukulele_concert: {
      label: 'Ukulele Concert',
      note: 'Corpo um pouco maior que o soprano; mais volume e sustain. Laterais ~50/60 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '35',
        'braco.largura_casa12': '42',
        'braco.espessura_nut': '18',
        'braco.espessura_casa10': '20',
        'tampo.comprimento': '260',
        'tampo.largura_bojo': '200',
        'tampo.largura_cintura': '140',
        'tampo.largura_ombro': '150',
        'laterais.largura_culatra': '60',
        'laterais.largura_troculo': '50',
        'job-scale-mm': '380',
        'escala.espessura': '5',
        'escala.largura_nut': '35',
        'escala.largura_casa12': '42'
      }
    },
    ukulele_tenor: {
      label: 'Ukulele Tenor',
      note: 'Mais usado por profissionais; melhor projeção grave. Laterais ~60/70 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '36',
        'braco.largura_casa12': '43',
        'braco.espessura_nut': '18',
        'braco.espessura_casa10': '20',
        'tampo.comprimento': '290',
        'tampo.largura_bojo': '225',
        'tampo.largura_cintura': '155',
        'tampo.largura_ombro': '170',
        'laterais.largura_culatra': '70',
        'laterais.largura_troculo': '60',
        'job-scale-mm': '430',
        'escala.espessura': '5',
        'escala.largura_nut': '36',
        'escala.largura_casa12': '43'
      }
    },
    ukulele_baritono: {
      label: 'Ukulele Barítono',
      note: 'Afinação DGBE; braço mais próximo do violão. Laterais ~70/80 mm.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '44',
        'braco.largura_casa12': '52',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '370',
        'tampo.largura_bojo': '250',
        'tampo.largura_cintura': '180',
        'tampo.largura_ombro': '190',
        'laterais.largura_culatra': '80',
        'laterais.largura_troculo': '70',
        'job-scale-mm': '510',
        'escala.espessura': '5',
        'escala.largura_nut': '44',
        'escala.largura_casa12': '52'
      }
    }
  };

  // Pontos da figura (posições em % — calibrados na arte mapa-medidas.png).
  var HOTSPOTS = [
    { id: 'inclinacao', label: 'Inclinação do headstock', unit: '°', bind: 'braco.inclinacao_headstock', x: 68.5, y: 10.5, hasPreset: true },
    { id: 'largura_nut', label: 'Largura no nut', unit: 'mm', bind: 'braco.largura_nut', x: 34.3, y: 17.8, hasPreset: true },
    { id: 'escala', label: 'Comprimento de escala', unit: 'mm', bind: 'job-scale-mm', x: 10.2, y: 47.0, hasPreset: true },
    { id: 'esp_nut', label: 'Espessura do braço (nut)', unit: 'mm', bind: 'braco.espessura_nut', x: 69.9, y: 19.1, hasPreset: true },
    { id: 'largura_casa12', label: 'Largura na junção (casa 12)', unit: 'mm', bind: 'braco.largura_casa12', x: 34.5, y: 48.5, hasPreset: true },
    { id: 'esp_casa12', label: 'Espessura do braço (casa 12)', unit: 'mm', bind: 'braco.espessura_casa10', x: 69.8, y: 43.3, hasPreset: true },
    { id: 'ombro', label: 'Largura do ombro (bojo superior)', unit: 'mm', bind: 'tampo.largura_ombro', x: 34.8, y: 57.4, hasPreset: true },
    { id: 'prof_troculo', label: 'Profundidade no tróculo', unit: 'mm', bind: 'laterais.largura_troculo', x: 74.2, y: 54.4, hasPreset: true },
    { id: 'cintura', label: 'Largura da cintura', unit: 'mm', bind: 'tampo.largura_cintura', x: 34.8, y: 68.4, hasPreset: true },
    { id: 'comprimento', label: 'Comprimento do tampo/fundo', unit: 'mm', bind: 'tampo.comprimento', x: 34.4, y: 94.0, hasPreset: true },
    { id: 'bojo', label: 'Largura do bojo', unit: 'mm', bind: 'tampo.largura_bojo', x: 34.6, y: 85.2, hasPreset: true },
    { id: 'prof_culatra', label: 'Profundidade na culatra', unit: 'mm', bind: 'laterais.largura_culatra', x: 74.5, y: 95.5, hasPreset: true }
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
    resolveField: function (bind) {
      if (!bind) return null;
      if (bind.indexOf('.') === -1) return document.getElementById(bind);
      return document.querySelector('[data-measure="' + bind + '"]');
    }
  };
})();
