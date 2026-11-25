import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../public/managed-auth-client.js',import.meta.url),'utf8');

function element(tag){
 return {tag,textContent:'',setAttribute(name,value){this[name]=value}};
}

test('managed auth mounting failure provides safe retry and sign-in recovery',async()=>{
 let reloads=0;
 const mount={replaceChildren(...children){this.children=children}};
 const document={
  body:{dataset:{authPage:'sign-in'}},
  createElement(tag){return {...element(tag),dataset:{}}},
  createTextNode(textContent){return {textContent}},
  getElementById(id){assert.equal(id,'managedAuthMount');return mount},
  head:{append(node){node.onload()}},
 };
 const Clerk={
  async load(){},
  mountSignIn(){throw Error('private provider error detail')},
 };
 await runInNewContext(script,{
  document,setTimeout,clearTimeout,
  window:{Clerk,location:{reload(){reloads++}}},
  fetch:async()=>({ok:true,json:async()=>({frontendAPI:'https://clerk.example.test'})}),
 });
 assert.equal(mount.children[0].role,'status');
 assert.match(mount.children[0].textContent,/Sign-in did not load/);
 assert.doesNotMatch(mount.children[0].textContent,/private provider/);
 assert.equal(mount.children[1].tag,'button');
 mount.children[1].onclick();
 assert.equal(reloads,1);
 assert.equal(mount.children[3].href,'/auth/sign-in');
});
