import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountBuilder} from '../src/app.js';
import {tasks} from '../src/catalog.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function setup({saved,failCopy=false}={}){
 const dom=new JSDOM(html,{url:'https://glasscola.github.io/aiPromteca/'}),doc=dom.window.document,opened=[],copied=[];
 dom.window.confirm=()=>true;dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
 dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
 if(saved)dom.window.localStorage.setItem('promteca-v1',JSON.stringify(saved));
 const app=mountBuilder(doc,{open:href=>opened.push(href),clipboard:{writeText:async text=>{if(failCopy)throw Error('denied');copied.push(text)}}});
 return {doc,app,opened,copied,dom,finish(){app.dispose();dom.window.close()}};
}
function input(t,value,dom){t.value=value;t.dispatchEvent(new dom.window.Event('input',{bubbles:true}))}
for(const task of tasks)test('public builder: '+task.id+' selection → settings → prompt without setup',()=>{
 const x=setup();try{
  x.doc.querySelector('[data-select="'+task.id+'"]').click();
  assert.equal(x.doc.getElementById('selection-count').textContent,'1개 선택');
  assert.deepEqual(x.app.getState().selected,[task.id]);assert.equal(x.opened.length,0);
  x.doc.getElementById('next').click();
  assert.ok(x.doc.querySelector('[data-task="'+task.id+'"]'));
  assert.ok(x.doc.getElementById('prompt').value.includes('['+task.title+']'));
  assert.ok(!x.doc.getElementById('editor').textContent.includes('카카오 로그인'));
  x.doc.getElementById('next').click();
  assert.ok(x.doc.querySelector('[data-key="intent"]'));
  assert.equal(x.doc.querySelector('[data-key="channel"]'),null);
  assert.equal(x.doc.querySelector('[data-key="repeat"]'),null);
 }finally{x.finish()}
});
test('weather region reaches ChatGPT URL directly without cloud or Kakao',()=>{
 const x=setup();try{x.doc.querySelector('[data-select="weather"]').click();x.doc.getElementById('next').click();input(x.doc.querySelector('[data-task="weather"][data-key="지역"]'),'부산',x.dom);x.doc.getElementById('open-gpt').click();assert.equal(x.opened.length,1);const u=new URL(x.opened[0]);assert.equal(u.origin,'https://chatgpt.com');assert.ok(u.searchParams.get('prompt').includes('지역: 부산'));assert.ok(!u.searchParams.get('prompt').includes('카카오톡'));assert.equal(x.copied.length,0)}finally{x.finish()}
});
test('stock scope, markets and ticker update and hidden values do not leak',()=>{
 const x=setup();try{x.doc.querySelector('[data-select="stocks"]').click();x.doc.getElementById('next').click();
 x.doc.querySelector('[data-key="관심 시장"][value="미국"]').click();x.doc.querySelector('[data-key="관심 범위"][value="특정 종목"]').click();
 input(x.doc.querySelector('[data-key="관심 종목"]'),'NVIDIA',x.dom);assert.ok(x.doc.getElementById('prompt').value.includes('NVIDIA'));
 x.doc.getElementById('open-gpt').click();assert.equal(x.opened.length,1);assert.ok(new URL(x.opened[0]).searchParams.get('prompt').includes('한국, 미국'));
 x.doc.querySelector('[data-key="관심 범위"][value="특정 종목"]').click();assert.equal(x.doc.querySelector('[data-key="관심 종목"]'),null);assert.ok(!x.doc.getElementById('prompt').value.includes('NVIDIA'));
 }finally{x.finish()}
});
test('free input does not invent a checklist or demand a connection',()=>{
 const x=setup();try{input(x.doc.querySelector('[data-key="custom"]'),'내 여행 계획을 같이 짜줘',x.dom);x.doc.getElementById('next').click();assert.equal(x.doc.querySelector('[data-task]:not([data-task=""])'),null);assert.ok(x.doc.getElementById('prompt').value.includes('내 여행 계획을 같이 짜줘'));assert.ok(!x.doc.getElementById('prompt').value.includes('카카오톡'))}finally{x.finish()}
});
test('opting out of delivery removes Kakao and schedule rules',()=>{
 const x=setup();try{x.doc.querySelector('[data-select="weather"]').click();x.doc.querySelector('[data-step="2"]').click();x.doc.querySelector('[data-advanced]').click();x.doc.querySelector('[data-key="channel"][value="카카오톡"]').click();x.doc.querySelector('[data-key="repeat"][value="매일"]').click();assert.ok(x.doc.getElementById('prompt').value.includes('대체 예약을 만들지 마라'));x.doc.querySelector('[data-advanced]').click();assert.equal(x.app.getState().channel,'ChatGPT');assert.equal(x.app.getState().repeat,'지금 한 번');assert.ok(!x.doc.getElementById('prompt').value.includes('카카오톡'))}finally{x.finish()}
});
test('long prompt opens explicit paste handoff; failed clipboard never silently opens empty GPT',async()=>{
 for(const failCopy of [false,true]){const x=setup({failCopy});try{
  for(const t of tasks)x.doc.querySelector('[data-select="'+t.id+'"]').click();
  x.doc.getElementById('open-gpt').click();await new Promise(r=>setImmediate(r));
  assert.equal(x.opened.length,0);
  if(failCopy){assert.equal(x.copied.length,0);assert.ok(x.doc.getElementById('toast').textContent.includes('직접 복사'));assert.ok(!x.doc.getElementById('transfer-dialog').hasAttribute('open'))}
  else{assert.equal(x.copied.length,1);assert.ok(x.doc.getElementById('transfer-dialog').hasAttribute('open'));assert.equal(x.doc.querySelector('#transfer-dialog a').href,'https://chatgpt.com/')}
 }finally{x.finish()}}
});
test('returning user starts on checklist and retains previous selections',()=>{
 const x=setup({saved:{step:3,selected:['stocks'],values:{stocks:{'관심 종목':'NVIDIA'}},custom:''}});try{assert.equal(x.app.getState().step,0);assert.ok(x.doc.querySelector('[data-select="stocks"]').checked)}finally{x.finish()}
});
test('method-first mode does not authorize immediate external actions',()=>{
 const x=setup();try{x.doc.querySelector('[data-select="jobs"]').click();x.doc.querySelector('[data-step="2"]').click();x.doc.querySelector('[data-key="intent"][value="하는 방법부터 안내받기"]').click();assert.ok(x.doc.getElementById('prompt').value.includes('아직 외부 발송·예약을 실행하지 마'))}finally{x.finish()}
});

test('older external delivery defaults migrate to GPT without losing task settings',()=>{
 const x=setup({saved:{selected:['stocks'],values:{stocks:{'관심 종목':'NVIDIA'}},channel:'카카오톡',repeat:'매일',advancedDelivery:true}});
 try{assert.equal(x.app.getState().channel,'ChatGPT');assert.equal(x.app.getState().repeat,'지금 한 번');assert.equal(x.app.getState().advancedDelivery,false);assert.equal(x.app.getState().values.stocks['관심 종목'],'NVIDIA')}finally{x.finish()}
});
test('explicit optional choice after migration is retained',()=>{
 const x=setup({saved:{preferencesVersion:2,selected:['weather'],values:{},channel:'노션',repeat:'지금 한 번',advancedDelivery:true}});
 try{assert.equal(x.app.getState().channel,'노션')}finally{x.finish()}
});
test('connection guides open only on request and never mark an integration connected',()=>{
 for(const channel of ['카카오톡','노션']){const x=setup();try{
  x.doc.querySelector('[data-select="weather"]').click();x.doc.querySelector('[data-step="2"]').click();
  assert.equal(x.doc.querySelector('[data-connection-guide]'),null);
  assert.ok(x.doc.querySelector('.default-destination').textContent.includes('GPT'));
  x.doc.querySelector('[data-advanced]').click();x.doc.querySelector('[data-key="channel"][value="'+channel+'"]').click();
  assert.equal(x.doc.getElementById('connection-guide'),null);
  x.doc.querySelector('[data-connection-guide]').click();
  const guide=x.doc.getElementById('connection-guide');assert.ok(guide.hasAttribute('open'));assert.equal(guide.querySelectorAll('li').length,channel==='노션'?4:0);if(channel==='카카오톡')assert.equal(guide.querySelector('a').href,'http://localhost:4317/kakao.html');assert.equal(x.opened.length,0);
  if(channel==='노션')assert.ok(guide.textContent.includes('직접 로그인·저장 기능이 없습니다'));
  guide.querySelector('button').click();assert.ok(!guide.hasAttribute('open'));
 }finally{x.finish()}}
});
