import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountKakaoSetup} from '../src/kakao-setup.js';
const html=fs.readFileSync(new URL('../kakao.html',import.meta.url),'utf8');
const flush=()=>new Promise(r=>setImmediate(r));
function setup({local=true,configured=false,loggedIn=false,failSend=false}={}){
 const dom=new JSDOM(html,{url:local?'http://localhost:4317/kakao.html':'https://glasscola.github.io/aiPromteca/kakao.html'}),state={csrf:'test-csrf',connection:{configured,loggedIn},test:null},calls=[],navigated=[];
 const app=mountKakaoSetup(dom.window.document,{navigate:u=>navigated.push(u),fetch:async(url,options)=>{
  calls.push({url,options});
  if(url==='/api/state')return {ok:true,json:async()=>structuredClone(state)};
  assert.equal(options.headers['x-csrf-token'],'test-csrf');
  if(url==='/api/kakao/config')state.connection.configured=true;
  if(url==='/api/kakao/start')return {ok:true,json:async()=>({url:'https://kauth.kakao.com/oauth/authorize?client_id=test'})};
  if(url==='/api/test/send'){if(failSend)return {ok:false,json:async()=>({error:'카카오 권한을 확인하세요.'})};state.test={sentAt:'2026-11-12T00:00:00Z'};}
  if(url==='/api/test/confirm')state.test.receivedAt='2026-11-12T00:01:00Z';
  return {ok:true,json:async()=>({saved:true})};
 }});
 return {dom,doc:dom.window.document,state,calls,navigated,app,finish(){app.dispose();dom.window.close()}};
}
test('public page never displays fake login and directs to real local setup',async()=>{
 const x=setup({local:false});await x.app.ready;assert.equal(x.calls.length,0);assert.equal(x.doc.querySelector('[data-action="login"]'),null);assert.ok(x.doc.querySelector('a[href="http://localhost:4317/kakao.html"]'));assert.ok(x.doc.body.textContent.includes('공용 서비스는 아직'));x.finish();
});
test('missing configuration gives exact values and saves through real config endpoint before login',async()=>{
 const x=setup();await x.app.ready;
 assert.ok(x.doc.querySelector('a[href="https://developers.kakao.com/console/app"]'));
 x.doc.querySelector('[data-action="next"]').click();await flush();
 assert.equal(x.doc.querySelector('[data-copy]').dataset.copy,'http://localhost:4317/api/kakao/callback');
 x.doc.querySelector('[data-action="next"]').click();await flush();
 const form=x.doc.querySelector('form');form.elements.clientId.value='a'.repeat(32);form.dispatchEvent(new x.dom.window.Event('submit',{bubbles:true,cancelable:true}));await flush();
 assert.ok(x.calls.some(c=>c.url==='/api/kakao/config'));assert.ok(x.doc.querySelector('[data-action="login"]'));assert.ok(!x.doc.body.textContent.includes('테스트 완료'));x.finish();
});
test('configured app opens only official OAuth destination',async()=>{
 const x=setup({configured:true});await x.app.ready;x.doc.querySelector('[data-action="login"]').click();await flush();assert.equal(x.navigated[0],'https://kauth.kakao.com/oauth/authorize?client_id=test');assert.ok(x.calls.some(c=>c.url==='/api/kakao/start'));x.finish();
});
test('test-send and user receipt confirmation are separate states',async()=>{
 const x=setup({configured:true,loggedIn:true});await x.app.ready;assert.ok(x.doc.querySelector('[data-action="confirm"]').disabled);
 x.doc.querySelector('[data-action="send"]').click();await flush();assert.ok(x.calls.some(c=>c.url==='/api/test/send'));assert.ok(!x.doc.querySelector('[data-action="confirm"]').disabled);assert.ok(!x.doc.body.textContent.includes('연결 테스트 완료'));
 x.doc.querySelector('[data-action="confirm"]').click();await flush();assert.ok(x.calls.some(c=>c.url==='/api/test/confirm'));assert.ok(x.doc.body.textContent.includes('연결 테스트 완료'));x.finish();
});
test('API failure stays visible and never enables receipt confirmation',async()=>{
 const x=setup({configured:true,loggedIn:true,failSend:true});await x.app.ready;x.doc.querySelector('[data-action="send"]').click();await flush();assert.ok(x.doc.getElementById('setup-error').textContent.includes('권한'));assert.ok(x.doc.querySelector('[data-action="confirm"]').disabled);x.finish();
});
