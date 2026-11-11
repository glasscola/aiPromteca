import {test} from 'node:test';import assert from 'node:assert/strict';import {tasks} from '../src/catalog.js';import {generate} from '../src/prompt.js';import {initial} from '../src/storage.js';
test('catalog has unique tasks and complete fields',()=>{assert.equal(new Set(tasks.map(t=>t.id)).size,tasks.length);assert.equal(tasks.length,30);for(const t of tasks){assert.ok(t.fields.length>=2);assert.equal(new Set(t.fields.map(f=>f.label)).size,t.fields.length)}});
test('custom-only requests retain user wording',()=>{const s=initial();s.custom='내 일기를 정리해줘';assert.match(generate(s),/내 일기를 정리해줘/);assert.equal(generate(initial()),'')});
test('hidden stock filters do not leak into a market-wide request',()=>{const s=initial();s.selected=['stocks'];s.values.stocks={'관심 범위':['시장 전체'],'관심 종목':'NVIDIA'};assert.ok(!generate(s).includes('NVIDIA'));s.values.stocks['관심 범위']=['특정 종목'];assert.ok(generate(s).includes('NVIDIA'))});
test('selected tasks include settings and guard unattended claims',()=>{const s=initial();s.selected=['weather','stocks'];s.values={weather:{지역:'부산'},stocks:{'관심 시장':['한국','미국']}};s.repeat='요일 선택';s.days=['월','수'];s.channel='카카오톡';const p=generate(s);for(const text of ['부산','한국, 미국','월, 수','Asia/Seoul','현재 환경','추가 결제'])assert.ok(p.includes(text));assert.ok(!p.includes('undefined'))});

import {taskRules} from '../src/task-rules.js';
import {effectiveValues,visibleField} from '../src/task-options.js';

test('every task has an evidence rule and produces a complete request',()=>{
 for(const t of tasks){const s=initial();s.selected=[t.id];assert.ok(taskRules[t.id]);const p=generate(s);assert.ok(p.includes(taskRules[t.id]));assert.ok(!p.includes('undefined'));}
});
test('jobs retain result count separately from brevity and expand approved scope',()=>{
 const s=initial();s.selected=['jobs'];s.values.jobs={'직무·분야':'전기 정비','함께 찾을 직무':'전기보전','지역':'전국'};
 const p=generate(s);for(const term of ['목표 공고 수: 20건','경력무관 공고: 포함','항목별 설명 길이: 짧게','고용24','잡코리아','전기보전','요청한 결과 수를 임의로 줄이지 마'])assert.ok(p.includes(term));
});
test('switching jobs to contests removes hidden employment data in UI and prompt',()=>{
 const s=initial();s.selected=['jobs'];s.values.jobs={'찾을 것':'공모전','경력':'경력','보유 자격증':'전기기사','함께 찾을 직무':'전기보전'};
 const t=tasks.find(x=>x.id==='jobs'),v=effectiveValues(t,s.values.jobs);
 assert.ok(!t.fields.filter(f=>visibleField(t.id,f,v)).some(f=>f.label==='경력'));
 const p=generate(s);assert.ok(!p.includes('전기기사'));assert.ok(!p.includes('함께 찾을 직무:'));assert.ok(p.includes('참가 방식: 무관'));
});
test('external delivery keeps destination and demands evidence before completion',()=>{
 for(const channel of ['카카오톡','노션']){const s=initial();s.custom='매일 정보 조사';s.channel=channel;s.repeat='매일';const p=generate(s);
 for(const term of ['내 명시적 동의 없이','대체 예약을 만들지 마라','설정 위치','추가 결제','무한 재시도하지 마라','수신 확인','미리 성공 처리하지 마라','이전 발송 기록'])assert.ok(p.includes(term),term);}
});
test('empty selections are not silently defaulted and old drafts gain missing defaults',()=>{
 const t=tasks.find(x=>x.id==='jobs');assert.deepEqual(effectiveValues(t,{'고용 형태':[]})['고용 형태'],[]);assert.equal(effectiveValues(t,{})['목표 공고 수'],'20건');
});
test('material and learning tasks demand real inputs and respect interaction',()=>{
 for(const id of ['email','document','meeting']){const s=initial();s.selected=[id];assert.ok(generate(s).includes('[자료 접근]'));}
 const s=initial();s.selected=['quiz'];assert.ok(generate(s).includes('정답을 먼저 노출하지 마라'));
});
