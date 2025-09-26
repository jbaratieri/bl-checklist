/* step21-project-unique.js — impede nomes duplicados por Instrumento (case/espacos ignorados) */
(function(){
  'use strict';
  function norm(s){ return (s||'').trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase(); }
  if (!window.BL_PROJECT) return;
  const _create = BL_PROJECT.create.bind(BL_PROJECT);
  BL_PROJECT.create = function(inst, name){
    const n = norm(name);
    const exists = (BL_PROJECT.list(inst)||[]).some(p => norm(p.name) === n);
    if (exists){
      alert('Já existe um projeto com esse nome para este instrumento. Escolha outro nome.');
      return BL_PROJECT.get(inst); // não cria
    }
    return _create(inst, name);
  };
})();