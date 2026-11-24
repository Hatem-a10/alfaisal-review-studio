import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
const text=readFileSync(new URL('../public/hub-upgrade.css',import.meta.url),'utf8');
test('A5-216 keep all sidebar stage geometries but avoid continuous width layout animation',()=>{
 assert.match(text,/#mainSidebar\{padding-top:55px!important;transition:transform \.18s\}/);
 assert.doesNotMatch(text,/transition:width \.18s,transform \.18s/);
 assert.match(text,/body\[data-sidebar-stage=expanded\] #mainSidebar\{width:250px!important;transform:none!important\}/);
 assert.match(text,/body\[data-sidebar-stage=compact\] #mainSidebar\{width:76px!important;transform:none!important\}/);
 assert.match(text,/body\[data-sidebar-stage=collapsed\] #mainSidebar\{transform:translateX\(-100%\)!important\}/);
 for(const width of [250,76])assert.ok(text.includes('margin-left:'+width+'px!important'));
 const processed=transformSync(text,{loader:'css',minify:true,target:'safari16.4',legalComments:'none'}).code;
 assert.match(processed,/transition:transform \.18s/);
 console.log(JSON.stringify({label:'A5-216 layout-affecting sidebar transition',beforeLayoutAnimatedProperties:['width'],afterLayoutAnimatedProperties:[],compositorTransition:'transform',stateWidthPixels:[250,76]}));
});
