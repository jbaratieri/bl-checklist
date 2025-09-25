/* step21-project-bus.js — Gerenciador de Projetos por Instrumento
   - Mantém uma lista de projetos por instrumento
   - Define o projeto corrente por instrumento
   - Emite evento 'bl:project-change' quando o projeto muda
   API:
     BL_PROJECT.list(inst) -> [{id, name}]
     BL_PROJECT.get(inst) -> projectId
     BL_PROJECT.set(inst, id, {source})
     BL_PROJECT.create(inst, name) -> id
     BL_PROJECT.rename(inst, id, newName)
     BL_PROJECT.remove(inst, id)  // não apaga dados, só remove da lista
     BL_PROJECT.on(fn), off(fn), ready(cb)
*/
(function(){
  'use strict';
  if (window.BL_PROJECT) return;

  const KEY_LIST = inst => `bl:projects:${inst}`;     // JSON [{id,name},...]
  const KEY_CURR = inst => `bl:project:${inst}`;      // projectId
  const DEFAULTS = { vcl: [{id:'default', name:'Projeto 1'}],
                     vla: [{id:'default', name:'Projeto 1'}],
                     cav: [{id:'default', name:'Projeto 1'}],
                     uku: [{id:'default', name:'Projeto 1'}] };

  function readJSON(k, fallback){
    try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; }
  }
  function writeJSON(k, val){
    try{ localStorage.setItem(k, JSON.stringify(val)); }catch(e){}
  }

  function list(inst){
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    let arr = readJSON(KEY_LIST(inst), null);
    if (!Array.isArray(arr) || !arr.length){
      arr = DEFAULTS[inst] ? [...DEFAULTS[inst]] : [{id:'default', name:'Projeto 1'}];
      writeJSON(KEY_LIST(inst), arr);
    }
    return arr;
  }
  function get(inst){
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    let id = localStorage.getItem(KEY_CURR(inst));
    if (!id){
      const arr = list(inst);
      id = arr[0].id;
      localStorage.setItem(KEY_CURR(inst), id);
    }
    return id;
  }
  function set(inst, id, opts){
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    const cur = get(inst);
    if (cur === id) return;
    localStorage.setItem(KEY_CURR(inst), id);
    emit({instrument:inst, from: cur, to: id, source: (opts&&opts.source)||'project-bus'});
  }
  function create(inst, name){
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    const arr = list(inst);
    const base = (name||'Projeto');
    let n = 1, id;
    do { id = (base.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'')||'proj') + (n>1?'-'+n:''); n++; }
    while (arr.some(x=>x.id===id));
    arr.push({id, name: name||('Projeto '+(arr.length+1))});
    writeJSON(KEY_LIST(inst), arr);
    set(inst, id, {source:'project-create'});
    return id;
  }
  function rename(inst, id, newName){
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    const arr = list(inst);
    const it = arr.find(x=>x.id===id); if (!it) return;
    it.name = newName||it.name;
    writeJSON(KEY_LIST(inst), arr);
  }
  function remove(inst, id){
    inst = inst || (window.BL_INSTRUMENT ? BL_INSTRUMENT.get() : (localStorage.getItem('bl:instrument')||'vcl'));
    let arr = list(inst);
    if (arr.length<=1) return; // garante 1 projeto
    arr = arr.filter(x=>x.id!==id);
    writeJSON(KEY_LIST(inst), arr);
    const cur = get(inst);
    if (cur === id){
      set(inst, arr[0].id, {source:'project-remove'});
    }
  }

  const listeners = new Set();
  function emit(detail){
    try{ window.dispatchEvent(new CustomEvent('bl:project-change', {detail})); }catch(_){}
    listeners.forEach(fn=>{ try{ fn(detail); }catch(_){}});
  }
  function on(fn){ listeners.add(fn); }
  function off(fn){ listeners.delete(fn); }

  function ready(cb){
    // considera pronto quando BL_INSTRUMENT estabilizar (se existir)
    if (window.BL_INSTRUMENT && BL_INSTRUMENT.ready){
      BL_INSTRUMENT.ready(()=> cb(get()));
    } else {
      setTimeout(()=> cb(get()), 0);
    }
  }

  window.BL_PROJECT = { list, get, set, create, rename, remove, on, off, ready };
})();