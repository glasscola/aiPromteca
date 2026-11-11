import {tasks} from './catalog.js';
export function generate(s){
 if(!s.selected.length&&!s.custom.trim())return '';
 const sections=['다음 조건에 맞춰 나의 개인 비서로 도와줘.'];
 for(const id of s.selected){const t=tasks.find(x=>x.id===id);if(!t)continue;const v=s.values[id]||{};const rows=t.fields.map(f=>{const a=v[f.label];return a&&(Array.isArray(a)?a.length:true)?`${f.label}: ${Array.isArray(a)?a.join(', '):a}`:''}).filter(Boolean);sections.push(`[${t.title}]\n${rows.join('\n')}`)}
 if(s.custom.trim())sections.push(`[직접 작성한 요청]\n${s.custom.trim()}`);
 sections.push(`[답변 방식]\n길이: ${s.length}\n말투: ${s.tone}\n형식: ${s.format}\n강조는 실제 굵게 서식으로 표시하고 서식 기호를 그대로 노출하지 마.`);
 sections.push(`[실행과 전달]\n${s.repeat==='지금 한 번'?'지금 한 번 실행해줘.':`${s.repeat}${s.repeat==='요일 선택'?' ('+s.days.join(', ')+')':''}, ${s.time}, ${s.zone} 기준으로 반복하고 싶어.`}\n결과를 받을 곳: ${s.channel}`);
 sections.push('최신 정보가 필요한 요청은 실제 출처를 확인하고 날짜·조회 시각과 링크를 밝혀줘. 확인된 사실과 추정·전망을 구분하고, 확인할 수 없는 내용은 만들지 마. 작업에 꼭 필요한 자료나 지역 등이 빠졌으면 먼저 질문해줘.');
 if(s.channel!=='ChatGPT'||s.repeat!=='지금 한 번')sections.push('현재 환경에서 필요한 연결·발송·예약 기능을 사용할 수 있는지 먼저 확인해줘. 필요한 로그인이나 동의는 안내하고, 지원하지 않는 기능은 가능하다고 말하지 마. 테스트와 실제 등록이 확인된 경우에만 완료라고 알려줘. 추가 결제나 유료 API가 필요하면 실행 전에 설명해줘.');
 if(s.selected.some(id=>['email','schedule','meeting','document','reply','report'].includes(id)))sections.push('내 자료는 내가 제공했거나 연결을 허용한 자료만 사용해줘. 자료가 없으면 요청해줘. 타인에게 메시지를 보내거나 원본을 수정하기 전에는 내용을 보여주고 확인받아줘.');
 return sections.join('\n\n');
}
