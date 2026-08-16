// Presets de medidas por modelo (fonte: medidas_instrumentos_metodo_baratieri.ods).
// Chaves = value de #job-model. Valores ligados a data-measure / ids do projeto.
(function () {
  'use strict';

  /** @type {Record<string, { label: string, note?: string, values: Record<string, string> }>} */
  var PRESETS = {
    violao_classico: {
      label: 'Violão Clássico',
      note: 'Padrão espanhol/Torres; braço mais largo e chato para técnica de dedilhado.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '52',
        'braco.largura_casa12': '62',
        'braco.espessura_nut': '22',
        'braco.espessura_casa10': '25',
        'tampo.comprimento': '485',
        'tampo.largura_bojo': '370',
        'tampo.largura_cintura': '245',
        'tampo.largura_ombro': '280',
        'job-scale-mm': '650',
        'escala.espessura': '7',
        'escala.largura_nut': '52',
        'escala.largura_casa12': '62'
      }
    },
    violao_folk: {
      label: 'Violão Folk',
      note: 'Padrão Martin D; braço mais estreito, corpo grande e potente.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '44',
        'braco.largura_casa12': '56',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '508',
        'tampo.largura_bojo': '397',
        'tampo.largura_cintura': '286',
        'tampo.largura_ombro': '289',
        'job-scale-mm': '645',
        'escala.espessura': '7',
        'escala.largura_nut': '44',
        'escala.largura_casa12': '56'
      }
    },
    violao_om: {
      label: 'Violão OM',
      note: 'Corpo mais equilibrado que o dread; boa resposta para fingerstyle.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '44',
        'braco.largura_casa12': '56',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '23',
        'tampo.comprimento': '504',
        'tampo.largura_bojo': '381',
        'tampo.largura_cintura': '276',
        'tampo.largura_ombro': '286',
        'job-scale-mm': '645',
        'escala.espessura': '7',
        'escala.largura_nut': '44',
        'escala.largura_casa12': '56'
      }
    },
    violao_jumbo: {
      label: 'Violão Jumbo',
      note: 'Corpo mais volumoso, cintura mais estreita e bojo inferior maior.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '45',
        'braco.largura_casa12': '57',
        'braco.espessura_nut': '21',
        'braco.espessura_casa10': '24',
        'tampo.comprimento': '510',
        'tampo.largura_bojo': '432',
        'tampo.largura_cintura': '279',
        'tampo.largura_ombro': '292',
        'job-scale-mm': '650',
        'escala.espessura': '7',
        'escala.largura_nut': '45',
        'escala.largura_casa12': '57'
      }
    },
    viola_caipira: {
      label: 'Viola Caipira',
      note: 'Medidas típicas de viola tradicional; 10 cordas em 5 ordens.',
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
        'job-scale-mm': '580',
        'escala.espessura': '6',
        'escala.largura_nut': '50',
        'escala.largura_casa12': '60'
      }
    },
    viola_cinturada: {
      label: 'Viola Cinturada',
      note: 'Cintura mais acentuada; mesma escala/braço da tradicional.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '50',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '435',
        'tampo.largura_bojo': '355',
        'tampo.largura_cintura': '160',
        'tampo.largura_ombro': '255',
        'job-scale-mm': '580',
        'escala.espessura': '6',
        'escala.largura_nut': '50',
        'escala.largura_casa12': '60'
      }
    },
    viola_610: {
      label: 'Viola 610mm',
      note: 'Escala longa (610 mm); corpo levemente maior.',
      values: {
        'braco.inclinacao_headstock': '13–15',
        'braco.largura_nut': '50',
        'braco.largura_casa12': '60',
        'braco.espessura_nut': '20',
        'braco.espessura_casa10': '22',
        'tampo.comprimento': '470',
        'tampo.largura_bojo': '360',
        'tampo.largura_cintura': '205',
        'tampo.largura_ombro': '260',
        'job-scale-mm': '610',
        'escala.espessura': '6',
        'escala.largura_nut': '50',
        'escala.largura_casa12': '60'
      }
    },
    cavaquinho_tradicional: {
      label: 'Cavaquinho Tradicional',
      note: 'Corpo pequeno, 4 cordas; braço fino e estreito.',
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
        'job-scale-mm': '330',
        'escala.espessura': '5',
        'escala.largura_nut': '29',
        'escala.largura_casa12': '35'
      }
    },
    ukulele_soprano: {
      label: 'Ukulele Soprano',
      note: 'Menor da família; escala curta, som brilhante.',
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
        'job-scale-mm': '350',
        'escala.espessura': '5',
        'escala.largura_nut': '35',
        'escala.largura_casa12': '42'
      }
    },
    ukulele_concert: {
      label: 'Ukulele Concert',
      note: 'Corpo um pouco maior que o soprano; mais volume e sustain.',
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
        'job-scale-mm': '380',
        'escala.espessura': '5',
        'escala.largura_nut': '35',
        'escala.largura_casa12': '42'
      }
    },
    ukulele_tenor: {
      label: 'Ukulele Tenor',
      note: 'Mais usado por profissionais; melhor projeção grave.',
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
        'job-scale-mm': '430',
        'escala.espessura': '5',
        'escala.largura_nut': '36',
        'escala.largura_casa12': '43'
      }
    },
    ukulele_baritono: {
      label: 'Ukulele Barítono',
      note: 'Afinação DGBE; braço mais próximo do violão.',
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
        'job-scale-mm': '510',
        'escala.espessura': '5',
        'escala.largura_nut': '44',
        'escala.largura_casa12': '52'
      }
    }
  };

  // Pontos da figura (posições em % — calibrados na arte mapa-medidas.png).
  // hasPreset: true = vem do ODS; false = campo do app sem linha no ODS.
  var HOTSPOTS = [
    { id: 'inclinacao', label: 'Inclinação do headstock', unit: '°', bind: 'braco.inclinacao_headstock', x: 68.5, y: 10.5, hasPreset: true },
    { id: 'largura_nut', label: 'Largura no nut', unit: 'mm', bind: 'braco.largura_nut', x: 34.3, y: 17.8, hasPreset: true },
    { id: 'escala', label: 'Comprimento de escala', unit: 'mm', bind: 'job-scale-mm', x: 10.2, y: 47.0, hasPreset: true },
    { id: 'esp_nut', label: 'Espessura do braço (nut)', unit: 'mm', bind: 'braco.espessura_nut', x: 69.9, y: 19.1, hasPreset: true },
    { id: 'largura_casa12', label: 'Largura na junção (casa 12)', unit: 'mm', bind: 'braco.largura_casa12', x: 34.5, y: 48.5, hasPreset: true },
    { id: 'esp_casa12', label: 'Espessura do braço (casa 12)', unit: 'mm', bind: 'braco.espessura_casa10', x: 69.8, y: 43.3, hasPreset: true },
    { id: 'ombro', label: 'Largura do ombro (bojo superior)', unit: 'mm', bind: 'tampo.largura_ombro', x: 34.8, y: 57.4, hasPreset: true },
    { id: 'prof_troculo', label: 'Profundidade no tróculo', unit: 'mm', bind: 'laterais.largura_troculo', x: 74.2, y: 54.4, hasPreset: false },
    { id: 'cintura', label: 'Largura da cintura', unit: 'mm', bind: 'tampo.largura_cintura', x: 34.8, y: 68.4, hasPreset: true },
    { id: 'comprimento', label: 'Comprimento do tampo/fundo', unit: 'mm', bind: 'tampo.comprimento', x: 34.4, y: 94.0, hasPreset: true },
    { id: 'bojo', label: 'Largura do bojo', unit: 'mm', bind: 'tampo.largura_bojo', x: 34.6, y: 85.2, hasPreset: true },
    { id: 'prof_culatra', label: 'Profundidade na culatra', unit: 'mm', bind: 'laterais.largura_culatra', x: 74.5, y: 95.5, hasPreset: false }
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
