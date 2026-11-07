'use strict';

globalThis.loadStudentAnki = async function () {
 const load = src => new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=src;
  script.onload=resolve;
  script.onerror=()=>reject(Error('Could not load the Anki reader.'));
  document.head.append(script);
 });
 if (typeof AnkiEngine==='undefined') await load('/anki-engine.js');
 if (!globalThis.JSZip) await load('/vendor/jszip.min.js');
 if (!globalThis.initSqlJs) await load('/vendor/sql-wasm.js');
 const [SQL,zstd]=await Promise.all([
  globalThis.initSqlJs({locateFile:name=>'/vendor/'+name}),import('/vendor/fzstd.js')
 ]);
 return {engine:AnkiEngine, libraries:{JSZip:globalThis.JSZip,SQL,zstd}};
};
