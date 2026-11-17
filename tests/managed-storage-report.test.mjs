import test from 'node:test';
import assert from 'node:assert/strict';
import {reportContent} from '../public/admin-report.mjs';
test('staging storage report handles absent publisher measurements without crashing or NaN',()=>{
 globalThis.DATA={items:[]};globalThis.state={};globalThis.mixBank=()=>[];globalThis.esc=String;globalThis.document={querySelector:()=>null};
 const render=(build,buildReport)=>reportContent({data:{buildReport,assets:{verified:660,total:660,complete:true},uploads:{bytes:0}},build,storage:{},fmt:n=>Number.isFinite(n)?String(n):'Unavailable',localBytes:()=>0,busy:false});
 const missing=render({},null);assert.match(missing,/Build size unavailable/);assert.doesNotMatch(missing,/NaN/);
 assert.match(render({fingerprint:'new',measuredExpandedBytes:1024},{fingerprint:'old',expandedBytes:2048}),/Measured at build/);
 assert.match(render({fingerprint:'same'},{fingerprint:'same',expandedBytes:2048}),/Measured after publishing/);
});
