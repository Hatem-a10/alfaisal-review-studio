import test from 'node:test';import assert from 'node:assert/strict';import {csvRows,csvEscapeCell} from '../public/admin-csv.mjs';
test('CSV exports quote and neutralize spreadsheet formulas including whitespace prefixes',()=>{
 for(const entry of ['=SUM(1,1)','  +1','\t@IMPORTXML','-1','\n=1','\uFEFF=2']){
  const cell=csvEscapeCell(entry);assert.equal(cell[0],'"');assert.ok(cell.includes("'"),entry);
 }
 assert.equal(csvEscapeCell('a,"b"'),'"a,""b"""');
 assert.equal(csvEscapeCell('normal'),'"normal"');
});
test('CSV uses real CRLF separators with escaped multiline fields and length bound',()=>{
 const result=csvRows([{id:'1',details:'A,\n"B"'},{id:'2',details:'\t=1+1'}],['id','details']);
 assert.ok(result.includes('\r\n'));assert.equal(result.split('\r\n').length,4);
 assert.match(result,/'\t=1\+1/);
 assert.ok(result.endsWith('\r\n'));
 assert.throws(()=>csvRows(Array.from({length:2001},()=>({})),['id']),/limit/);
});
