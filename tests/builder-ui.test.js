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
test('weather region reaches GPT through complete clipboard handoff without cloud or Kakao',async()=>{
 const x=setup();try{x.doc.querySelector('[data-select="weather"]').click();x.doc.getElementById('next').click();input(x.doc.querySelector('[data-task="weather"][data-key="지역"]'),'부산',x.dom);x.doc.getElementById('open-gpt').click();await new Promise(r=>setImmediate(r));assert.equal(x.copied.length,1);assert.ok(x.copied[0].includes('지역: 부산'));assert.ok(x.copied[0].includes('옷차림'));assert.ok(!x.copied[0].includes('카카오톡'));assert.ok(x.doc.getElementById('transfer-dialog').hasAttribute('open'));assert.equal(x.opened.length,0)}finally{x.finish()}
});

test('stock scope, markets and ticker update and hidden values do not leak',async()=>{
 const x=setup();try{x.doc.querySelector('[data-select="stocks"]').click();x.doc.getElementById('next').click();
 x.doc.querySelector('[data-key="관심 시장"][value="미국"]').click();x.doc.querySelector('[data-key="관심 범위"][value="특정 종목"]').click();
 input(x.doc.querySelector('[data-key="관심 종목"]'),'NVIDIA',x.dom);assert.ok(x.doc.getElementById('prompt').value.includes('NVIDIA'));
 x.doc.getElementById('open-gpt').click();await new Promise(r=>setImmediate(r));assert.equal(x.copied.length,1);assert.ok(x.copied[0].includes('한국, 미국'));
 x.doc.querySelector('[data-key="관심 범위"][value="특정 종목"]').click();assert.equal(x.doc.querySelector('[data-key="관심 종목"]'),null);assert.ok(!x.doc.getElementById('prompt').value.includes('NVIDIA'));
 }finally{x.finish()}
});
test('free input does not invent a checklist or demand a connection',()=>{
 const x=setup();try{input(x.doc.querySelector('[data-key="custom"]'),'내 여행 계획을 같이 짜줘',x.dom);x.doc.getElementById('next').click();assert.equal(x.doc.querySelector('[data-task]:not([data-task=""])'),null);assert.ok(x.doc.getElementById('prompt').value.includes('내 여행 계획을 같이 짜줘'));assert.ok(!x.doc.getElementById('prompt').value.includes('카카오톡'))}finally{x.finish()}
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


test('routine adds work without losing entered criteria and previews actual deliverables',()=>{
 const x=setup({saved:{selected:['weather'],values:{weather:{지역:'부산'}},custom:''}});try{
 x.doc.querySelector('[data-routine="morning"]').click();
 assert.equal(x.app.getState().step,1);
 assert.deepEqual(x.app.getState().selected,['weather','air','schedule','todo']);
 assert.equal(x.app.getState().values.weather.지역,'부산');
 assert.equal(x.doc.querySelectorAll('#deliverables li').length,4);
 assert.ok(x.doc.getElementById('prompt').value.includes('[통합 보고]'));
 assert.ok(x.doc.querySelector('.outcome-card').textContent.includes('옷차림'));
 assert.ok(!x.doc.querySelector('.raw-prompt').open);
 }finally{x.finish()}
});

test('GPT presentation controls update prompt and remove legacy delivery',()=>{
 const x=setup({saved:{preferencesVersion:2,selected:['weather'],values:{},channel:'카카오톡',repeat:'매일',advancedDelivery:true}});try{
 x.doc.querySelector('[data-step="2"]').click();
 assert.equal(x.doc.querySelector('[data-advanced]'),null);
 assert.equal(x.app.getState().channel,'ChatGPT');
 x.doc.querySelector('[data-key="visuals"][value="텍스트·표만"]').click();
 assert.ok(x.doc.getElementById('prompt').value.includes('그래프·도식·이미지 생성 없이'));
 assert.ok(!x.doc.getElementById('prompt').value.includes('카카오톡'));
 }finally{x.finish()}
});
