import {randomUUID} from 'node:crypto';
import {collect} from './sources.js';
import {sendKakao} from './kakao.js';
import {publishReport} from './reports.js';
import {scheduleSlot} from './validation.js';
export async function runJob(store,jobId,{slot=null,send=true,collector=collect,sender=sendKakao,publisher=publishReport}={}){
 const runId=slot||randomUUID();let job,keys;
 const claimed=await store.transact(s=>{job=s.jobs.find(x=>x.id===jobId);if(!job)throw Error('작업을 찾지 못했습니다.');if(s.runs.some(x=>x.id===runId))return false;if(slot&&!job.enabled)return false;if(send&&!s.test?.receivedAt)throw Error('테스트 메시지 수신 확인을 먼저 완료하세요.');keys=s.sourceKeys;s.runs.push({id:runId,jobId,title:job.name,status:'collecting',startedAt:new Date().toISOString()});s.runs=s.runs.slice(-100);return true});
 if(!claimed)return {skipped:true};
 try{
  let result=await collector(job,keys);
  if(job.onlyNew&&job.seen?.length)result={...result,items:result.items.filter(x=>!job.seen.includes(x.id)),notes:[...result.notes,'이전에 발송한 항목을 제외했습니다.']};
  if(!send){await store.transact(s=>{Object.assign(s.runs.find(x=>x.id===runId),{status:'preview',result,finishedAt:new Date().toISOString()});const j=s.jobs.find(x=>x.id===jobId);if(j)j.previewAt=new Date().toISOString()});return result;}
  if(!result.items.length&&job.noUpdates==='silent'){await store.transact(s=>Object.assign(s.runs.find(x=>x.id===runId),{status:'no_updates',finishedAt:new Date().toISOString(),result}));return result}
  const url=await publisher(store,result);
  // Persist intent before external side effect. Unknown outcomes must never auto-retry.
  await store.transact(s=>{if(slot&&!s.jobs.find(x=>x.id===jobId)?.enabled)throw Error('예약이 중지되어 발송하지 않았습니다.');Object.assign(s.runs.find(x=>x.id===runId),{status:'sending',reportUrl:url})});
  const sent=await sender(store,result.title+'\n'+result.items.length+'건 · '+new Date(result.checkedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+'\n'+(result.items[0]?.title||'새 정보가 없습니다.')+'\n전체 내용과 출처는 결과 보기를 눌러주세요.',url);
  await store.transact(s=>{Object.assign(s.runs.find(x=>x.id===runId),{status:'sent',...sent,finishedAt:new Date().toISOString(),count:result.items.length});const j=s.jobs.find(x=>x.id===jobId);if(j){j.lastSentAt=sent.acceptedAt;j.seen=[...new Set([...(j.seen||[]),...result.items.map(x=>x.id)])].slice(-1500)}});
  return {sent:true,url};
 }catch(e){await store.transact(s=>{const r=s.runs.find(x=>x.id===runId);if(r)Object.assign(r,{status:e.uncertain||r.status==='sending'?'uncertain':'failed',error:e.message,finishedAt:new Date().toISOString()})});throw e}
}
export async function tick(store,now=new Date()){
 await store.transact(s=>{s.cloud.lastHeartbeat=now.toISOString();for(const r of s.runs){if(['collecting','sending'].includes(r.status)&&now-new Date(r.startedAt)>20*60000){r.status='uncertain';r.error='실행이 중단되었습니다. 중복 전송 방지를 위해 자동 재시도하지 않습니다.'}}});
 const {state}=await store.read();const outcomes=[];
 for(const job of state.jobs){const slot=scheduleSlot(job,now);if(!slot||state.runs.some(x=>x.id===slot))continue;try{await runJob(store,job.id,{slot});outcomes.push({ok:true})}catch{outcomes.push({ok:false})}}
 return {checked:state.jobs.length,attempted:outcomes.length,failed:outcomes.filter(x=>!x.ok).length};
}
