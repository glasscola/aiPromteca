import {taskSpecs} from './specs/index.js';
import {routines} from './routines.js';

import {visibleField,effectiveValues} from './task-options.js';
import {groups,tasks} from './catalog.js';
import {generate} from './prompt.js?v=20261114-gpt';
import {initial,restore,save} from './storage.js';

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['작업 선택','상세 조건','답변 방식','GPT로 옮기기'];
export function mountBuilder(doc,dependencies={}){
 const win=doc.defaultView,$=id=>doc.getElementById(id);
 let s=restore(win.localStorage),category='전체',query='',timer;
 s.selected=s.selected.filter(id=>tasks.some(t=>t.id===id));
 const clipboard=dependencies.clipboard||win.navigator.clipboard;
 const open=dependencies.open||(href=>{const a=doc.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.click()});
 function toast(text){$('toast').textContent=text;win.clearTimeout(timer);timer=win.setTimeout(()=>$('toast').textContent='',5000)}
 function persist(){if(!save(s,win.localStorage))$('save-state').textContent='저장 공간 사용 불가'}
 function changed(){s.edited=null;persist();preview()}
 function options(label,values,value,key,task='',multi=false){const current=Array.isArray(value)?value:[value];return '<fieldset class="field option-field"><legend class="field-title">'+esc(label)+'</legend><div class="options">'+values.map(v=>'<label class="option"><input type="'+(multi?'checkbox':'radio')+'" name="'+esc(task+key)+'" data-key="'+esc(key)+'" data-task="'+esc(task)+'" value="'+esc(v)+'" '+(current.includes(v)?'checked':'')+'>'+esc(v)+'</label>').join('')+'</div></fieldset>'}
 function input(label,value,key,task='',placeholder='',type='text'){
  const large=['요약할 이메일 본문','회의 자료','문서 원문·링크','실제 진행 자료','받은 메시지 원문','주제·원문','할 일과 마감','출제 기준 자료'].includes(label);
  const attrs='data-key="'+esc(key)+'" data-task="'+esc(task)+'" placeholder="'+esc(placeholder)+'"';
  return '<label class="field"><span class="field-title">'+esc(label)+'</span>'+(large?'<textarea '+attrs+'>'+esc(value)+'</textarea>':'<input type="'+type+'" '+attrs+' value="'+esc(value)+'">')+'</label>';
 }
 function detail(t){const v=effectiveValues(t,s.values[t.id]);return '<details open class="task-detail"><summary>'+esc(t.icon)+' '+esc(t.title)+'</summary><div class="outcome-card"><strong>'+esc(taskSpecs[t.id].goal)+'</strong><p>'+esc(taskSpecs[t.id].output)+'</p></div>'+t.fields.filter(f=>visibleField(t.id,f,v)).map(f=>f.type==='text'?input(f.label,v[f.label],f.label,t.id,f.placeholder):options(f.label,f.options,v[f.label],f.label,t.id,f.type==='many')).join('')+'</details>'}
 function grid(){const list=tasks.filter(t=>(category==='전체'||t.group===category)&&(t.title+' '+t.group+' '+t.fields.map(f=>f.options?.join(' ')||'').join(' ')).includes(query));return list.length?list.map(t=>'<label class="task"><span class="task-icon" aria-hidden="true">'+t.icon+'</span><span>'+esc(t.title)+'</span><input type="checkbox" data-select="'+t.id+'" '+(s.selected.includes(t.id)?'checked':'')+'></label>').join(''):'<div class="empty">찾는 작업이 없으면 아래에 직접 입력하세요.</div>'}
 function render(){
  $('steps').innerHTML=names.map((n,i)=>'<button data-step="'+i+'" class="'+(s.step===i?'active':'')+'" '+(s.step===i?'aria-current="step"':'')+'><span>'+(i+1)+'</span>'+n+'</button>').join('');
  let html='<h2>'+['무엇을 맡길까요?','선택한 일의 조건을 정해주세요.','어떤 답변을 원하세요?','완성된 요청을 GPT로 보내세요.'][s.step]+'</h2>';
  if(s.step===0)html+='<div class="routine-grid">'+routines.map(r=>'<button class="routine" data-routine="'+r.id+'"><span>'+r.icon+'</span><strong>'+r.title+'</strong><span>'+r.result+'</span></button>').join('')+'</div><input class="search" id="search" aria-label="작업 찾기" placeholder="날씨, 증권 뉴스, 여행…" value="'+esc(query)+'"><div class="categories">'+groups.map(g=>'<button data-category="'+esc(g)+'" class="'+(g===category?'active':'')+'" aria-pressed="'+(g===category)+'">'+g+'</button>').join('')+'</div><div class="task-grid" id="task-grid">'+grid()+'</div><label class="field custom"><span class="field-title">목록에 없는 일도 직접 입력하세요.</span><textarea data-key="custom" placeholder="원하는 일이나 추가 조건을 자유롭게 적어주세요.">'+esc(s.custom)+'</textarea></label>';
  if(s.step===1)html+=s.selected.map(id=>detail(tasks.find(t=>t.id===id))).join('')+(!s.selected.length?'<div class="empty">직접 입력한 요청으로 진행합니다.</div>':'')+(s.custom?'<label class="field"><span class="field-title">직접 입력한 요청</span><textarea data-key="custom">'+esc(s.custom)+'</textarea></label>':'');
  if(s.step===2){
   html+='<div class="default-destination">기본 전달처 · GPT</div>'+options('GPT에게 원하는 도움',['바로 답변받기','하는 방법부터 안내받기'],s.intent,'intent')+options('항목별 설명 길이',['짧게','보통','자세히'],s.length,'length')+options('말투',['편하게','정중하게'],s.tone,'tone');
   html+=options('표현 구성',['알아서 보기 좋게','표 중심','설명 중심'],s.layout,'layout')+options('시각 자료',['필요한 그래프·도식 자동','텍스트·표만'],s.visuals,'visuals')+options('설명용 이미지',['요청하지 않기','도움이 될 때 요청'],s.images,'images');
  }
  if(s.step===3)html+='<div class="review-row"><span>맡길 일</span><strong>'+esc(s.selected.map(id=>tasks.find(t=>t.id===id).title).join(', ')||'직접 입력')+'</strong></div><div class="review-row"><span>도움</span><strong>'+esc(s.intent)+'</strong></div><div class="review-row"><span>답변</span><strong>'+esc(s.length+' · '+s.tone+' · '+s.layout)+'</strong></div>'+(s.advancedDelivery?'<div class="review-row"><span>추가 요청</span><strong>'+esc(s.repeat+' · '+s.channel)+'</strong></div>':'')+'<div class="actions"><button class="secondary" id="edit-prompt">'+(s.edited===null?'요청문 직접 수정':'자동 생성으로 되돌리기')+'</button><button class="quiet" id="download">텍스트 저장 ↓</button></div>';
  html+='<div class="actions builder-navigation">'+(s.step?'<button class="secondary" id="back">← 이전</button>':'<span id="chosen-status"></span>')+(s.step<3?'<button class="primary" id="next">'+names[s.step+1]+' →</button>':'<button class="secondary" data-step="0">작업 더 고르기</button>')+'</div>';
  $('editor').innerHTML=html;preview();
 }
 function preview(){
  const p=s.edited??generate(s);if($('deliverables'))$('deliverables').innerHTML=s.selected.map(id=>'<li><strong>'+esc(tasks.find(t=>t.id===id).title)+'</strong><span>'+esc(taskSpecs[id].output)+'</span></li>').join('')||'<li>직접 입력한 요청을 바탕으로 작성합니다.</li>';$('prompt').value=p||'작업을 선택하면 요청문이 여기에 완성됩니다.';$('prompt').readOnly=s.edited===null;
  $('selection-count').textContent=s.selected.length+'개 선택';
  if($('chosen-status'))$('chosen-status').textContent=s.selected.length?s.selected.length+'개 선택됨':s.custom.trim()?'직접 입력한 요청':'여러 개 선택할 수 있어요';
  $('chips').innerHTML=s.selected.map(id=>{const t=tasks.find(x=>x.id===id);return '<button class="chip" data-remove="'+id+'" aria-label="'+esc(t.title)+' 선택 해제">'+esc(t.title)+' ×</button>'}).join('');
  $('preview-actions').innerHTML='<button id="open-gpt" class="primary full" '+(!p?'disabled':'')+'>'+(encodeURIComponent(p).length>7000?'복사해서 GPT로 옮기기':'GPT로 옮기기')+' ↗</button><button class="secondary full" id="copy" '+(!p?'disabled':'')+'>요청문 복사</button>';
 }
 function valid(){if(!s.selected.length&&!s.custom.trim()){toast('작업을 선택하거나 요청을 입력해주세요.');return false}if(s.repeat==='요일 선택'&&!s.days.length){toast('실행할 요일을 선택해주세요.');return false}if(s.repeat!=='지금 한 번'&&!s.time){toast('실행 시각을 입력해주세요.');return false}return true}
 function move(step){if(step>0&&!valid())return;s.step=step;persist();render();$('steps').scrollIntoView?.({block:'start',behavior:'instant'})}
 async function copy(){try{await clipboard.writeText(s.edited??generate(s));toast('요청문을 복사했습니다.');return true}catch{$('prompt').closest('details').open=true;$('prompt').focus();$('prompt').select();toast('자동 복사가 차단되었습니다. 선택된 요청문을 직접 복사해주세요.');return false}}
 async function click(e){
  const b=e.target.closest('button');if(!b)return;

  if(b.dataset.routine){const r=routines.find(x=>x.id===b.dataset.routine);s.selected=[...new Set([...s.selected,...r.tasks])];for(const id of r.tasks)s.values[id]??=effectiveValues(tasks.find(t=>t.id===id));changed();move(1);return}
  if(b.dataset.step!==undefined)return move(Number(b.dataset.step));
  if(b.dataset.category){category=b.dataset.category;render();return}
  if(b.dataset.remove){s.selected=s.selected.filter(x=>x!==b.dataset.remove);changed();render();return}
  if(b.id==='next')return move(s.step+1);if(b.id==='back')return move(s.step-1);
  if(b.id==='reset'){if(win.confirm('선택과 입력을 모두 지울까요?')){s=initial();category='전체';query='';persist();render()}return}
  if(b.id==='copy')return copy();
  if(b.id==='edit-prompt'){s.edited=s.edited===null?generate(s):null;persist();render();if(s.edited!==null){$('prompt').closest('details').open=true;$('prompt').focus();}return}
  if(b.id==='open-gpt'){
   if(!valid())return;const p=s.edited??generate(s),encoded=encodeURIComponent(p);
   if(encoded.length<=7000){open('https://chatgpt.com/?prompt='+encoded);return}
   if(!await copy())return;
   const dialog=$('transfer-dialog');if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');return;
  }
  if(b.id==='close-transfer'){const d=$('transfer-dialog');if(d.close)d.close();else d.removeAttribute('open');return}
  if(b.id==='download'){const url=win.URL.createObjectURL(new win.Blob([s.edited??generate(s)],{type:'text/plain;charset=utf-8'}));const a=doc.createElement('a');a.href=url;a.download='나의-비서-요청문.txt';a.click();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000)}
 }
 function inputEvent(e){const t=e.target;if(t.id==='search'){query=t.value.trim();$('task-grid').innerHTML=grid();return}if(t.id==='prompt'){s.edited=t.value;persist();return}if(t.matches('input[type=text],textarea,input[type=time]')&&t.dataset.key){if(t.dataset.task){s.values[t.dataset.task]??={};s.values[t.dataset.task][t.dataset.key]=t.value}else s[t.dataset.key]=t.value;changed()}}
 function change(e){
  const t=e.target;
  if(t.hasAttribute('data-advanced')){s.advancedDelivery=t.checked;if(!t.checked){s.repeat='지금 한 번';s.channel='ChatGPT'}changed();render();return}
  if(t.dataset.select){const id=t.dataset.select;if(t.checked){s.selected=[...new Set([...s.selected,id])];s.values[id]??=effectiveValues(tasks.find(x=>x.id===id))}else s.selected=s.selected.filter(x=>x!==id);changed();return}
  if(t.matches('input[type=checkbox],input[type=radio],select')&&t.dataset.key){const obj=t.dataset.task?(s.values[t.dataset.task]??={}):s,k=t.dataset.key;
   if(t.type==='checkbox'){let a=Array.isArray(obj[k])?obj[k]:[];a=t.checked?[...new Set([...a,t.value])]:a.filter(x=>x!==t.value);if(['고용 형태','관심 시간대'].includes(k)){const all=k==='고용 형태'?'전체':'하루 전체';a=t.value===all&&t.checked?[all]:a.filter(x=>x!==all)}obj[k]=a}else obj[k]=t.value;
   changed();if(['repeat','channel','관심 범위','찾을 것','대상'].includes(k))render();
  }
 }
 doc.addEventListener('click',click);doc.addEventListener('input',inputEvent);doc.addEventListener('change',change);render();
 return {getState:()=>structuredClone(s),dispose(){doc.removeEventListener('click',click);doc.removeEventListener('input',inputEvent);doc.removeEventListener('change',change);win.clearTimeout(timer)}};
}
if(typeof document!=='undefined')mountBuilder(document);
