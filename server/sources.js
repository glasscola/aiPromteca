import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false});
const array=x=>!x?[]:Array.isArray(x)?x:[x];
const str=x=>String(x??'').replace(/<[^>]*>/g,'').trim();
const id=x=>createHash('sha256').update(x).digest('hex').slice(0,24);
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'Promteca/2.0 personal assistant'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('자료 제공처 응답 실패 ('+r.status+')');return r}
export function parseWork24(xml){const root=parser.parse(xml).wantedRoot;if(!root||!Object.hasOwn(root,'total')||!Number.isFinite(Number(root.total)))throw Error('고용24 인증키 또는 응답 형식을 확인하세요.');return {total:Number(root.total)||0,items:array(root.wanted).map(x=>({id:str(x.wantedAuthNo),title:str(x.title),company:str(x.company),region:str(x.region),career:str(x.career),education:str(x.minEdubg),salary:str(x.salTpNm)+' '+str(x.sal),deadline:str(x.closeDt),published:str(x.regDt),employment:str(x.empTpCd),url:str(x.wantedInfoUrl),source:'고용24'}))}}
function deadlineDate(v){const m=v.match(/^(\d{2}|\d{4})[.\-/](\d{2})[.\-/](\d{2})/);return m?(m[1].length===2?'20'+m[1]:m[1])+'-'+m[2]+'-'+m[3]:null}
export function filterJobs(items,job,today){
 const seen=new Set();return items.filter(x=>{
  if(!x.id||!/^https?:\/\//.test(x.url))return false;
  if(/경력/.test(x.career)&&!/무관|관계없음|신입/.test(x.career))return false;
  if(!job.includeAny&&!/신입/.test(x.career))return false;
  if(job.region!=='전국'&&!x.region.includes(job.region))return false;
  if(job.education&&!x.education.includes(job.education)&&!/무관/.test(x.education))return false;
  if(job.employment==='permanent'&&!['10','11'].includes(x.employment))return false;
  if(job.employment==='contract'&&!['20','21'].includes(x.employment))return false;
  const date=deadlineDate(x.deadline);if(date&&date<today)return false;
  const key=x.company+'|'+x.title+'|'+x.region;if(seen.has(key))return false;seen.add(key);return true;
 });
}
export async function collect(job,keys={},now=new Date()){
 const checkedAt=now.toISOString();let items=[],notes=[],sources=[];
 if(job.type==='weather'){
  const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:job.latitude,longitude:job.longitude,daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',timezone:'Asia/Seoul',forecast_days:'1'});
  const d=(await (await get(u)).json()).daily;if(!d?.time?.length)throw Error('해당 지역의 예보가 없습니다.');
  items=[{id:id(job.location+d.time[0]),title:job.location+' '+d.time[0]+' 날씨',description:'최저 '+d.temperature_2m_min[0]+'°C / 최고 '+d.temperature_2m_max[0]+'°C · 강수 확률 '+d.precipitation_probability_max[0]+'% · 최대 풍속 '+d.wind_speed_10m_max[0]+'km/h',url:'https://open-meteo.com/',source:'Open-Meteo',published:d.time[0]}];sources=['Open-Meteo'];notes=['예보이며 실제 관측값과 다를 수 있습니다. Open-Meteo 데이터 출처를 표시합니다.'];
 }else if(job.type==='news'){
  const u=new URL('https://news.google.com/rss/search');u.search=new URLSearchParams({q:job.query+' when:1d',hl:'ko',gl:'KR',ceid:'KR:ko'});
  const root=parser.parse(await (await get(u)).text());const seen=new Set();
  items=array(root.rss?.channel?.item).map(x=>({id:id(str(x.link)),title:str(x.title),url:str(x.link),published:str(x.pubDate),source:str(x.source?.['#text']||x.source)||'Google 뉴스'})).filter(x=>{const date=Date.parse(x.published);if(!x.title||!/^https?:\/\//.test(x.url)||!Number.isFinite(date)||now-date>48*3600e3||seen.has(x.title))return false;seen.add(x.title);return true}).filter(x=>!job.onlyNew||!(job.seen||[]).includes(x.id)).slice(0,job.count);
  sources=['Google 뉴스 RSS'];notes=['기사 제목·게시 시각·링크 모음입니다. 기사 본문을 읽은 AI 요약이나 사실 검증 결과가 아닙니다.'];
 }else if(job.type==='jobs'){
  if(!keys.work24)throw Error('고용24 자료 연결이 필요합니다. 연결 설정에서 인증키를 저장하세요.');
  let all=[],pages=0,partial=false;const careers=job.includeAny?['N','Z']:['N'];
  for(const keyword of job.keywords){for(const career of careers){for(let page=1;page<=3;page++){
   const u=new URL('https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do');u.search=new URLSearchParams({authKey:keys.work24,callTp:'L',returnType:'XML',startPage:String(page),display:'100',keyword,career});
   const result=parseWork24(await (await get(u)).text());all.push(...result.items);pages++;if(page*100>=result.total)break;if(page===3)partial=true;
  }}}
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const filtered=filterJobs(all,job,today).filter(x=>!job.onlyNew||!(job.seen||[]).includes(x.id));items=filtered.sort((a,b)=>(deadlineDate(a.deadline)||'9999').localeCompare(deadlineDate(b.deadline)||'9999')).slice(0,job.count);
  items=items.map(x=>({...x,description:[x.company,x.region,x.career,x.education,x.salary,'마감 '+x.deadline].join(' · ')}));
  sources=['고용24 공식 채용정보 API'];notes=['검색어: '+job.keywords.join(', '),'조회 '+pages+'페이지 / 수집 '+all.length+'건 / 조건·중복 정리 후 '+filtered.length+'건 / 표시 '+items.length+'건','자료 출처는 고용24입니다. 다른 채용 사이트 전체를 검색한 결과가 아닙니다. 필수 자격증·세부 업무는 공고 원문에서 확인하세요.'];if(partial)notes.push('검색어별 최대 3페이지까지 조회했습니다. 전체 공고 수집을 보장하지 않습니다.');
 }else if(job.type==='reminder'){items=[{id:id(job.message),title:job.name,description:job.message,source:'내가 작성한 알림'}];notes=['사용자 입력을 그대로 전달합니다.'];sources=['사용자 입력'];
 }else throw Error('실행할 수 없는 작업입니다.');
 return {title:job.name,checkedAt,items,notes,sources};
}
