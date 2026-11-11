export const TYPES=['weather','news','jobs','reminder'];
const text=(v,max=200)=>String(v??'').trim().slice(0,max);
export function validateJob(input){
 const type=input.type;if(!TYPES.includes(type))throw Error('지원되지 않는 자동 실행 작업입니다.');
 const name=text(input.name,60);if(!name)throw Error('작업 이름을 입력하세요.');
 const time=text(input.time);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('실행 시간을 확인하세요.');
 const days=Array.isArray(input.days)?[...new Set(input.days.map(Number))]:[0,1,2,3,4,5,6];if(!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('요일을 선택하세요.');
 const j={name,type,time,days,zone:'Asia/Seoul',count:Math.max(1,Math.min(30,Math.trunc(Number(input.count)||10))),onlyNew:!!input.onlyNew,noUpdates:input.noUpdates==='silent'?'silent':'notify'};
 if(type==='weather'){const lat=Number(input.latitude),lon=Number(input.longitude);if(!Number.isFinite(lat)||lat< -90||lat>90||!Number.isFinite(lon)||lon< -180||lon>180||!text(input.location))throw Error('날씨 지역을 선택하세요.');Object.assign(j,{latitude:lat,longitude:lon,location:text(input.location)})}
 if(type==='news'){j.query=text(input.query);if(!j.query)throw Error('뉴스 검색어를 입력하세요.')}
 if(type==='jobs'){j.keywords=Array.isArray(input.keywords)?input.keywords.map(x=>text(x,50)).filter(Boolean).slice(0,8):[];if(!j.keywords.length)throw Error('찾을 직무를 입력하세요.');j.region=text(input.region,50)||'전국';j.includeAny=input.includeAny!==false;j.education=text(input.education,30);j.employment=['all','permanent','contract'].includes(input.employment)?input.employment:'all'}
 if(type==='reminder'){j.message=text(input.message,2000);if(!j.message)throw Error('알림 내용을 입력하세요.')}return j;
}
export function scheduleSlot(job,now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:job.zone||'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(now).map(p=>[p.type,p.value]));
 const weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);if(!job.enabled||!job.days.includes(weekday))return null;
 const current=Number(p.hour)*60+Number(p.minute),[h,m]=job.time.split(':').map(Number);
 if(current<h*60+m||current-h*60-m>360)return null;return job.id+':'+p.year+'-'+p.month+'-'+p.day;
}
