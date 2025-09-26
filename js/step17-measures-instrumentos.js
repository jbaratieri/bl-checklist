
/* step17-measures-instrumentos.js — define/mescla presets por instrumento
   → Carregue este arquivo ANTES do step16-measures-presets.js
*/
(function () {
  'use strict';
  // não sobrescreva, mescle
  window.BL_MEASURE_PRESETS = window.BL_MEASURE_PRESETS || {};
  function merge(code, data){
    window.BL_MEASURE_PRESETS[code] = Object.assign({}, window.BL_MEASURE_PRESETS[code] || {}, data);
  }

  // === Violão Clássico (vcl) ===
  merge('vcl', {
    braco: {
      madeira: "Cedro",
      inclinacao_headstock: "15",
      largura_nut: "52",
      largura_casa12: "61",
      espessura_nut: "21",
      espessura_casa10: "23"
    },
    tampo: {
      madeira: "Abeto",
      comprimento: "480",
      largura_bojo: "360",
      largura_cintura: "235",
      largura_ombro: "275",
      espessura_final: "2.4–2.8"
    },
    fundo: { madeira: "Jacarandá", espessura_final: "2.6–3.0" },
    laterais: { madeira: "Jacarandá", comprimento: "480", largura_culatra: "95", largura_troculo: "85" },
    escala: { madeira: "Ébano", espessura: "6.0", largura_nut: "52", largura_casa12: "61" },
    medidas_gerais: {Distancia_Pestana_Rastilho: "650", Distancia_Pestana_Traste_12: "325" }
  });

  // === Viola (vla) ===
  merge('vla', {
    braco: {
      madeira: "Cedro",
      inclinacao_headstock: "14",
      largura_nut: "47",
      largura_casa12: "60",
      espessura_nut: "18",
      espessura_casa10: "22"
    },
    tampo: {
      madeira: "Abeto",
      comprimento: "480",
      largura_bojo: "360",
      largura_cintura: "235",
      largura_ombro: "275",
      espessura_final: "2.4–2.7"
    },
    fundo: { madeira: "Jacarandá", espessura_final: "2.6–3.0" },
    laterais: { madeira: "Jacarandá", comprimento: "480", largura_culatra: "95", largura_troculo: "85" },
    escala: { madeira: "Ébano", espessura: "6.0", largura_nut: "47", largura_casa12: "60" },
    medidas_gerais: {Distancia_Pestana_Rastilho: "580", Distancia_Pestana_Traste_12: "290" }
  });

  // === Cavaquinho (cav) ===
  merge('cav', {
    braco: {
      madeira: "Cedro",
      inclinacao_headstock: "15",
      largura_nut: "30",
      largura_casa12: "42",
      espessura_nut: "20",
      espessura_casa10: "22"
    },
    tampo: {
      madeira: "Abeto",
      comprimento: "340",
      largura_bojo: "240",
      largura_cintura: "180",
      largura_ombro: "200",
      espessura_final: "2.4–2.7"
    },
    fundo: { madeira: "Mogno, Imbuia", espessura_final: "2.6–3.0" },
    laterais: { madeira: "Mogno, Imbuia", comprimento: "800", largura_culatra: "85-90", largura_troculo: "75-80" },
    escala: { madeira: "Ébano", espessura: "5.0", largura_nut: "30", largura_casa12: "40" },
    medidas_gerais: {Distancia_Pestana_Rastilho: "330-350", Distancia_Pestana_Traste_12: "165-175"}
  });

  // === Ukulele (uku) ===
  merge('uku', {
    braco: {
      madeira: "Cedro",
      inclinacao_headstock: "14",
      largura_nut: "34-39",
      largura_casa12: "44-50",
      espessura_nut: "18",
      espessura_casa10: "21"
    },
    tampo: {
      madeira: "Cedro",
      comprimento: "21-27",
      largura_bojo: "17-20",
      largura_cintura: "13-15",
      largura_ombro: "14-16",
      espessura_final: "2.4–3.0"
    },
    fundo: { madeira: "Mogno, koa", espessura_final: "2.6–3.0" },
    laterais: { madeira: "Mogno, koa", comprimento: "50", largura_culatra: "65-70", largura_troculo: "55-60" },
    escala: { madeira: "Ébano", espessura: "4-5", largura_nut: "34-39", largura_casa12: "44-50" },
    soprano: {Distancia_Pestana_Rastilho: "~345"},
    concerto: {Distancia_Pestana_Rastilho: "~375"},
    tenor: {Distancia_Pestana_Rastilho: "~430"},
    baritono: {Distancia_Pestana_Rastilho: "~510"}
  });
})();
