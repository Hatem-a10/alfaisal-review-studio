import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRADIENTS,nearestGradient,chosenGradient,gradientById} from '../public/accent-gradients.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const lin=v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const lum=hex=>{const [r,g,b]=[1,3,5].map(i=>lin(parseInt(hex.slice(i,i+2),16)));return .2126*r+.7152*g+.0722*b};
const onWhite=hex=>1.05/(lum(hex)+.05);

test('gradients are unique and keep white text readable on their main and second stops',()=>{
 assert.ok(GRADIENTS.length>=24);
 assert.equal(new Set(GRADIENTS.map(g=>g.id)).size,GRADIENTS.length);
 for(const g of GRADIENTS){
  for(const k of ['a','b','c'])assert.match(g[k],/^#[0-9a-f]{6}$/,g.id);
  assert.ok(onWhite(g.b)>=4.5,g.id+' main stop');
  assert.ok(onWhite(g.c)>=3,g.id+' second stop');
 }
});

test('saved settings resolve to a gradient; legacy colours map to the nearest one',()=>{
 assert.equal(chosenGradient({accentAuto:true,accentPalette:'ocean'}),null);
 assert.equal(chosenGradient({accentAuto:false,accentPalette:'ocean'}).id,'ocean');
 assert.equal(chosenGradient({accentAuto:false,accentPalette:'missing',accent:'#1859c4'}).id,'ocean');
 assert.equal(nearestGradient('not a colour'),GRADIENTS[0]);
 assert.equal(gradientById('nope'),null);
 assert.match(read('public/app.js'),/accentPalette:typeof s\?\.accentPalette==='string'&&\/\^\[a-z0-9-\]\{1,32\}\$\/\.test/);
});

test('sync details and the damaged-data export live in Site settings',()=>{
 const s=read('public/study-reliability.js');
 assert.match(s,/panel\.className='panel settings-sync'/);
 assert.match(s,/frame\.querySelector\('\.section-head'\)\?\.after\(panel\)/);
 assert.match(s,/tools\.innerHTML='<summary>Recovery tools<\/summary>'/);
 assert.match(s,/summary\?\.addEventListener\('click',e=>\{e\.preventDefault\(\);open\.click\(\)\}\)/);
 assert.match(read('public/study-next.mjs'),/document\.querySelector\('\.sync-widget-body'\)/);
});
