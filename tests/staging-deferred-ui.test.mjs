import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('opening Anki before its deferred script is ready does not break initial render',()=>{
 const source=fs.readFileSync('public/workspace-refinements.js','utf8');
 const functions=['compactAnki','emptyStates'].map(name=>source.split('\n').find(line=>line.trim().startsWith('function '+name+'('))).join('\n');
 const context=vm.createContext({view:'anki',document:{querySelector(){throw Error('Deck UI must wait for deferred Anki initialization')}}});
 vm.runInContext(functions,context);
 assert.doesNotThrow(()=>vm.runInContext('compactAnki();emptyStates()',context));
});
