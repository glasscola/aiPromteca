const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={jobs:[],runs:[],connection:{},sources:{},cloud:{},test:null},local=false,view=location.hash.slice(1)||'home',timer;
const types={weather:{name:'날씨',icon:'☀',desc:'선택 지역의 기온·강수·바람 예보',badge:'바로 수집 가능'},news:{name:'뉴스·증권·AI 소식',icon:'▤',desc:'검색어별 기사 제목·게시 시각·원문 링크',badge:'제목·링크 수집'},jobs:{name:'신입 채용정보',icon:'⌕',desc:'관련 직무를 함께 찾고 조건·중복 정리',badge:'고용24 연결 필요'},reminder:{name:'내가 쓴 알림',icon:'◷',desc:'기억할 내용을 정해진 요일에 전달',badge:'직접 작성'}};
const statusNames={collecting:'자료 수집 중',sending:'발송 응답 대기',sent:'발송 API 성공',preview:'수집 확인',failed:'실패',uncertain:'결과 확인 필요',no_updates:'새 정보 없음'};
const date=v=>v?new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'아직 없음';
const badge=(text,cls='')=>'<span class="badge '+cls+'">'+esc(text)+'</span>';
const btn=(text,action,extra='',cls='secondary')=>'<button class="button '+cls+'" data-action="'+action+'" '+extra+'>'+text+'</button>';
function toast(text){$('toast').textContent=text;clearTimeout(timer);timer=setTimeout(()=>$('toast').textContent='',6000)}
async function api(path,data){const response=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(data===undefined?{}:{'x-csrf-token':state.csrf})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw Error(result.error||'요청을 처리하지 못했습니다.');return result}
function mustLocal(){if(local)return true;toast('개인 실행 화면에서 설정할 수 있습니다. 아래 실행 안내를 확인하세요.');return false}
async function refresh(){
 if(['localhost','127.0.0.1'].includes(location.hostname)){state=await api('state');local=true}
 $('mode').textContent=local?'개인 실행 화면':'공개 안내 화면';
 $('environment').innerHTML=local?'':'<div class="banner"><div><strong>개인 설정은 내 PC에서 안전하게 연결하세요.</strong><p>연결을 마친 뒤에는 GitHub 서버가 예약 작업을 실행합니다.</p></div><a class="button primary" href="http://localhost:4317/automation.html">개인 실행 화면 열기 ↗</a></div>';
 render();
}
function hero(title,desc,icon='✦'){return '<div class="hero"><div><div class="eyebrow">YOUR EVERYDAY ASSISTANT</div><h1>'+title+'</h1><p>'+desc+'</p></div><div class="hero-art">'+icon+'</div></div>'}
function jobCard(j){const t=types[j.type];return '<article class="card"><div class="card-top"><span class="icon">'+t.icon+'</span>'+badge(j.enabled?'예약 켜짐':'예약 꺼짐',j.enabled?'on':'')+'</div><h3>'+esc(j.name)+'</h3><p>'+esc(j.time)+' · 한국 시간 · '+j.days.map(d=>['일','월','화','수','목','금','토'][d]).join('·')+'<br>'+esc(j.type==='jobs'?j.keywords.join(', '):j.type==='weather'?j.location:j.type==='news'?j.query:j.message.slice(0,60))+'</p>'+badge(j.previewAt?'수집 확인됨':'수집 확인 필요',j.previewAt?'on':'warn')+'<div class="card-actions">'+btn('수집 미리보기','preview','data-id="'+j.id+'"')+btn('지금 카톡 발송','run','data-id="'+j.id+'"')+btn(j.enabled?'예약 끄기':'예약 켜기','toggle','data-id="'+j.id+'"','ghost')+btn('수정','edit','data-id="'+j.id+'"','ghost')+'</div></article>'}
function home(){
 const count=state.jobs.filter(j=>j.enabled).length,connected=state.test?.receivedAt?'수신 확인됨':state.connection.loggedIn?'테스트 필요':'연결 필요';
 let html=hero('자동 발송을 원하는 분만 설정하세요.','GPT 요청문은 메인 화면에서 연결 없이 만들 수 있습니다.');
 html+='<div class="stats"><div class="stat"><span>켜진 예약</span><strong>'+count+'개</strong></div><div class="stat"><span>카카오톡</span><strong>'+connected+'</strong></div><div class="stat"><span>클라우드 실행</span><strong>'+(state.cloud.lastHeartbeat?'점검 확인':state.cloud.enabled?'점검 대기':'연결 필요')+'</strong></div></div>';
 if(!state.test?.receivedAt||!state.cloud.lastHeartbeat)html+='<div class="banner green"><div><strong>처음 한 번, 연결을 끝내세요.</strong><p>카카오 설정 → 로그인 → 테스트 수신 → 클라우드 점검</p></div>'+btn('연결 설정하기','connect','','primary')+'</div>';
 html+='<div class="section-title"><h2>자동으로 받을 일</h2>'+btn('＋ 새 작업','new')+'</div>';
 html+=state.jobs.length?'<div class="grid">'+state.jobs.slice(0,4).map(jobCard).join('')+'</div>':'<div class="empty"><h3>아직 등록한 작업이 없습니다.</h3>채용·날씨·뉴스·알림 중 필요한 일부터 선택하세요.</div>';
 html+='<div class="section-title"><h2>무엇을 맡길까요?</h2></div><div class="grid">'+Object.entries(types).map(([id,t])=>'<article class="card"><div class="card-top"><span class="icon">'+t.icon+'</span>'+badge(t.badge,id==='jobs'?'warn':'')+'</div><h3>'+t.name+'</h3><p>'+t.desc+'</p>'+btn('이 작업 만들기 →','new','data-type="'+id+'"')+'</article>').join('')+'</div>';
 html+='<div class="card" style="margin-top:24px"><h3>자료 요약·글쓰기·학습은 GPT와 함께</h3><p>30개 작업의 상세 조건으로 요청문을 만듭니다. 이 작업들은 자동 카카오 실행 작업으로 등록되지 않습니다.</p><a class="button secondary" href="prompt.html">GPT 요청문 만들기 ↗</a></div>';return html;
}
function connections(){
 let html=hero('연결을 한 번만 준비하세요.','키와 로그인 정보는 공개 페이지나 채팅에 입력하지 않습니다.','⇄');
 if(!local)html+='<section class="card"><h2>내 PC에서 시작하기</h2><ol class="instructions"><li><a href="https://github.com/glasscola/aiPromteca/archive/refs/heads/main.zip">프로그램 ZIP 다운로드</a> 후 압축을 풉니다.</li><li>Node.js 24 이상이 없다면 <a href="https://nodejs.org/" target="_blank" rel="noreferrer">공식 Node.js</a>를 설치합니다.</li><li>폴더의 <strong>start-assistant.cmd</strong>를 실행합니다.</li><li>열린 개인 화면에서 아래 연결을 진행합니다.</li></ol><a class="button primary" href="http://localhost:4317/automation.html">개인 실행 화면 열기</a></section>';
 html+='<div class="grid" style="margin-top:22px"><section class="card"><div class="card-top"><span class="icon">1</span>'+badge(state.connection.configured?'설정 저장됨':'설정 필요',state.connection.configured?'on':'warn')+'</div><h3>카카오 앱 등록</h3><p>설치하는 앱이 아닙니다. 내 카카오톡에 메시지를 보낼 프로그램을 등록하는 과정입니다.</p><ol class="instructions"><li><a href="https://developers.kakao.com/console/app" target="_blank" rel="noreferrer">카카오디벨로퍼스</a>에서 로그인하고 앱을 만듭니다.</li><li>카카오 로그인을 켜고 아래 Redirect URI를 등록합니다.</li></ol><div class="code-row"><code>http://localhost:4317/api/kakao/callback</code>'+btn('복사','copy','data-value="http://localhost:4317/api/kakao/callback"','ghost')+'</div><ol class="instructions" start="3"><li>동의 항목에서 <strong>카카오톡 메시지 전송(talk_message)</strong>을 설정합니다.</li><li>제품 링크 관리의 웹 도메인에 아래 주소를 등록합니다.</li></ol><div class="code-row"><code>https://glasscola.github.io</code>'+btn('복사','copy','data-value="https://glasscola.github.io"','ghost')+'</div><details><summary>공식 설정 안내 열기</summary><p><a href="https://developers.kakao.com/docs/ko/tutorial/custom-msg-template" target="_blank" rel="noreferrer">나에게 메시지 보내기 설정 ↗</a></p></details><form id="kakao-form"><label class="field"><span>REST API 키</span><input name="clientId" type="password" autocomplete="off" placeholder="'+(state.connection.configured?'변경할 때만 새 키 입력':'앱 키에서 복사한 32자리')+'" required minlength="32" maxlength="32" '+(!local?'disabled':'')+'></label><label class="field"><span>Client Secret (활성화했다면 입력)</span><input name="clientSecret" type="password" autocomplete="off" '+(!local?'disabled':'')+'></label><button class="button primary" '+(!local?'disabled':'')+'>앱 설정 저장</button></form></section>';
 html+='<section class="card"><div class="card-top"><span class="icon">2</span>'+badge(state.test?.receivedAt?'수신 확인 완료':state.connection.loggedIn?'로그인 완료':'로그인 필요',state.test?.receivedAt?'on':'warn')+'</div><h3>로그인하고 실제로 받아보기</h3><p>본인 카카오톡의 나와의 채팅으로 테스트 메시지를 보냅니다.</p><div class="card-actions">'+btn('카카오 로그인','login',!local||!state.connection.configured?'disabled':'','primary')+btn('테스트 메시지 보내기','test',!local||!state.connection.loggedIn?'disabled':'')+'</div><div class="help" style="margin-top:20px">테스트 발송: '+date(state.test?.sentAt)+'<br>수신 확인: '+date(state.test?.receivedAt)+'</div><div class="card-actions">'+btn('카톡에서 받았어요','received',!local||!state.test?.sentAt?'disabled':'')+'</div><details><summary>연결 해제</summary><p>저장된 인증정보를 지우고 모든 예약을 끕니다. 카카오 계정의 동의 철회는 카카오 설정에서 별도로 할 수 있습니다.</p>'+btn('연결 해제','disconnect',!local?'disabled':'','danger')+'</details></section>';
 html+='<section class="card"><div class="card-top"><span class="icon">3</span>'+badge(state.cloud.lastHeartbeat?'실행 점검됨':state.cloud.enabled?'연결됨 · 점검 필요':'연결 필요',state.cloud.lastHeartbeat?'on':'warn')+'</div><h3>PC를 꺼도 실행되게</h3><p>GitHub 서버가 15분 간격으로 예약을 확인합니다. 실행 지연이 있을 수 있으며, 설정한 시각 이후 최대 6시간까지 당일 작업을 확인합니다.</p><div class="help">별도 GPT API를 호출하지 않습니다. 이 공개 저장소의 GitHub Actions를 사용합니다. 정확한 정시 발송 서비스는 아닙니다.</div><p>내 설정·인증·기록은 암호화하고, 암호화 키는 GitHub Secrets에 저장합니다.</p><div class="card-actions">'+btn('GitHub 연결','cloud',!local||state.cloud.enabled?'disabled':'','primary')+btn('클라우드 실행 점검','check',!local||!state.cloud.enabled?'disabled':'')+'</div><p>마지막 실제 실행: '+date(state.cloud.lastHeartbeat)+'</p><a href="https://github.com/glasscola/aiPromteca/actions/workflows/assistant.yml" target="_blank" rel="noreferrer">GitHub 실행 기록 ↗</a><details><summary>연결이 안 될 때</summary><p>GitHub Desktop 또는 Git에서 glasscola 계정으로 로그인하세요. 실행 점검 후 잠시 기다렸다가 상태 새로고침을 눌러주세요. 공개 저장소는 장기간 활동이 없으면 예약이 중단될 수 있으므로 실행 기록을 확인하세요.</p></details></section>';
 html+='</div>';return html;
}
function jobSource(){ return '<section class="card"><div class="card-top"><span class="icon">4</span>'+badge(state.sources.work24?'키 저장됨 · 수집 확인 필요':'채용 작업에만 필요',state.sources.work24?'on':'')+'</div><h3>채용정보 연결</h3><p>고용24 공식 자료로 신입·경력무관 공고를 찾습니다. 사람인·잡코리아 전체 검색이나 AI 분석으로 표시하지 않습니다.</p><a class="button ghost" href="https://www.work24.go.kr/cm/e/a/0110/selectOpenApiSvcInfo.do?fullApiSvcId=000000000000000000000000000000" target="_blank" rel="noreferrer">고용24 이용 신청 열기 ↗</a><form id="work24-form"><label class="field"><span>고용24 채용정보 인증키</span><input name="key" type="password" autocomplete="off" required '+(!local?'disabled':'')+'></label><button class="button primary" '+(!local?'disabled':'')+'>인증키 저장</button></form><p>키 저장만으로 연결 성공을 표시하지 않습니다. 채용 작업의 수집 미리보기로 확인합니다.</p></section>';}
function history(){return hero('무슨 일이 실행됐는지, 그대로.','수집 성공·발송 성공·실패를 구분합니다. 발송 성공은 실제 읽음 확인과 다릅니다.','▤')+(state.runs.length?'<section class="card">'+state.runs.map(r=>'<article class="history"><div><strong>'+esc(r.title)+'</strong><p>'+date(r.startedAt)+'</p>'+(r.error?'<div class="error">'+esc(r.error)+'</div>':'')+'</div><div>'+badge(statusNames[r.status]||r.status,r.status==='sent'?'on':['failed','uncertain'].includes(r.status)?'bad':'')+'<div class="card-actions">'+(r.result?btn('수집 결과','result','data-id="'+r.id+'"'):'')+(r.reportUrl?'<a class="button secondary" target="_blank" rel="noreferrer" href="'+esc(r.reportUrl)+'">받은 결과 열기 ↗</a>':'')+'</div></div></article>').join('')+'</section>':'<div class="empty"><h3>아직 실행 기록이 없습니다.</h3>작업의 수집 미리보기를 실행하면 기록이 남습니다.</div>')}
function render(){
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 if(view==='connections')$('content').innerHTML=connections();
 else if(view==='history')$('content').innerHTML=history();
 else if(view==='jobs')$('content').innerHTML=hero('반복할 일은 여기에 맡기세요.','수집 확인과 카카오 수신 테스트를 마친 작업만 예약을 켤 수 있습니다.','◷')+'<div class="section-title"><h2>내 작업 '+state.jobs.length+'개</h2>'+btn('＋ 새 작업','new','','primary')+'</div>'+(state.jobs.length?'<div class="grid">'+state.jobs.map(jobCard).join('')+'</div>':'<div class="empty">새 작업을 등록하세요.</div>');
 else $('content').innerHTML=home();
 if(view==='jobs'&&state.jobs.some(j=>j.type==='jobs'))$('content').innerHTML+=jobSource();
}
const field=(label,name,value='',placeholder='',type='text')=>'<label class="field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" placeholder="'+esc(placeholder)+'"></label>';
function editor(type='jobs',job={}){
 const defaults={type,name:types[type].name,time:'08:00',days:[0,1,2,3,4,5,6],count:type==='jobs'?20:5,includeAny:true,region:'전국',keywords:['전기 정비','전기보전','전기 유지보수','설비보전'],location:'서울',latitude:37.5665,longitude:126.978,...job};
 $('job-form').elements.id.value=job.id||'';
 let html='<label class="field"><span>작업 종류</span><select name="type">'+Object.entries(types).map(([id,t])=>'<option value="'+id+'" '+(id===type?'selected':'')+'>'+t.name+'</option>').join('')+'</select></label>'+field('작업 이름','name',defaults.name);
 if(type==='jobs')html+=field('찾을 직무 (쉼표로 구분)','keywords',defaults.keywords.join(', '))+field('지역','region',defaults.region,'전국 또는 경기, 부산 등')+'<div class="choices"><label><input type="checkbox" name="includeAny" '+(defaults.includeAny?'checked':'')+'> 경력무관 포함</label></div><div class="cols">'+field('학력 필터 (비워두면 전체)','education',defaults.education||'','고졸 등')+'<label class="field"><span>고용 형태</span><select name="employment"><option value="all">전체</option><option value="permanent" '+(defaults.employment==='permanent'?'selected':'')+'>기간 정함 없음 (무기계약 포함)</option><option value="contract" '+(defaults.employment==='contract'?'selected':'')+'>기간제 계약</option></select></label></div><div class="help">고용24의 신입·경력무관 목록을 조회합니다. 세부 업무·필수 자격증은 결과의 원문에서 확인하세요.</div>';
 if(type==='news')html+=field('검색어','query',defaults.query||'','예: 반도체 실적, 국내 증시, OpenAI')+'<div class="help">최근 기사 제목과 링크를 수집합니다. AI 요약·투자 판단은 수행하지 않습니다.</div>';
 if(type==='weather')html+='<label class="field"><span>지역</span><select name="weatherCity">'+[['서울',37.5665,126.978],['부산',35.1796,129.0756],['대구',35.8714,128.6014],['인천',37.4563,126.7052],['광주',35.1595,126.8526],['대전',36.3504,127.3845],['울산',35.5384,129.3114],['제주',33.4996,126.5312]].map(([n,lat,lon])=>'<option value="'+n+'|'+lat+'|'+lon+'" '+(defaults.location===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';
 if(type==='reminder')html+='<label class="field"><span>알림 내용</span><textarea name="message">'+esc(defaults.message||'')+'</textarea></label>';
 html+='<div class="cols">'+field('희망 수신 시각 · 한국 시간','time',defaults.time,'','time')+(['jobs','news'].includes(type)?field('결과 개수 (최대 30)','count',defaults.count,'','number'):'')+'</div><label class="field"><span>실행 요일</span></label><div class="choices">'+['일','월','화','수','목','금','토'].map((d,i)=>'<label><input type="checkbox" name="days" value="'+i+'" '+(defaults.days.includes(i)?'checked':'')+'>'+d+'</label>').join('')+'</div>';
 if(['jobs','news'].includes(type))html+='<label class="field"><span>반복 보고</span></label><div class="choices"><label><input type="checkbox" name="onlyNew" '+(defaults.onlyNew?'checked':'')+'> 이전에 보낸 항목 제외</label><label><input type="checkbox" name="silent" '+(defaults.noUpdates==='silent'?'checked':'')+'> 새 정보가 없으면 보내지 않기</label></div>';
 html+='<div class="help" style="margin-top:22px">저장하면 예약은 꺼진 상태입니다. 수집 미리보기 → 연결 확인 → 예약 켜기 순서로 진행하세요.</div>';
 if(job.id)html+='<div class="card-actions">'+btn('이 작업 삭제','delete','data-id="'+job.id+'"','danger')+'</div>';
 $('job-fields').innerHTML=html;
}
function showResult(result){$('result-body').innerHTML='<p>조회 '+date(result.checkedAt)+' · 한국 시간</p>'+(!result.items.length?'<div class="empty">확인된 결과가 없습니다.</div>':'')+result.items.map(x=>'<article class="result-item"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p><p>'+esc(x.source)+' · '+esc(x.published||'')+'</p>'+(/^https?:\/\//.test(x.url||'')?'<a target="_blank" rel="noreferrer" href="'+esc(x.url)+'">원문 확인 ↗</a>':'')+'</article>').join('')+'<div class="help">'+result.notes.map(esc).join('<br>')+'</div>';$('result-dialog').showModal()}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.view){view=b.dataset.view;location.hash=view;render();return}
 if(b.hasAttribute('data-close')){b.closest('dialog').close();return}
 const action=b.dataset.action;if(!action){if(b.id==='refresh')try{await refresh()}catch(e){toast(e.message)}return}
 if(action==='copy'){try{await navigator.clipboard.writeText(b.dataset.value);toast('복사했습니다.')}catch{toast('주소를 직접 선택해 복사해주세요.')}return}
 if(action==='connect'){view='connections';location.hash=view;render();return}
 if(!mustLocal())return;
 b.disabled=true;
 try{
  const id=b.dataset.id;
  if(action==='new'||action==='edit'){const j=state.jobs.find(x=>x.id===id);editor(j?.type||b.dataset.type||'jobs',j||{});$('job-dialog').showModal();return}
  if(action==='login'){const r=await api('kakao/start',{});location.href=r.url;return}
  if(action==='test'){await api('test/send',{});toast('카카오 발송 API가 성공했습니다. 실제 수신을 확인해주세요.')}
  if(action==='received'){await api('test/confirm',{});toast('수신 확인을 기록했습니다.')}
  if(action==='disconnect'){if(!confirm('연결을 해제하고 모든 예약을 끌까요?'))return;await api('kakao/disconnect',{})}
  if(action==='cloud'){await api('cloud/connect',{});toast('클라우드를 연결했습니다. 실행 점검을 눌러주세요.')}
  if(action==='check'){await api('cloud/check',{});toast('GitHub에 점검을 요청했습니다. 잠시 후 상태를 새로고침하세요.')}
  if(action==='preview'){showResult(await api('jobs/preview',{id}))}
  if(action==='run'){if(!confirm('이 작업의 결과를 내 카카오톡으로 지금 발송할까요?'))return;await api('jobs/run',{id});toast('발송 API가 성공했습니다. 카카오톡에서 확인하세요.')}
  if(action==='toggle'){const j=state.jobs.find(x=>x.id===id);await api('jobs/toggle',{id,enabled:!j.enabled});toast(j.enabled?'예약을 껐습니다.':'예약을 켰습니다. 첫 실제 실행은 기록에서 확인하세요.')}
  if(action==='delete'){if(!confirm('이 작업을 삭제할까요?'))return;await api('jobs/delete',{id});$('job-dialog').close()}
  if(action==='result'){showResult(state.runs.find(x=>x.id===id).result);return}
  await refresh();
 }catch(e){toast(e.message)}finally{b.disabled=false}
});
document.addEventListener('change',e=>{if(e.target.name==='type'&&e.target.closest('#job-form'))editor(e.target.value)});
document.addEventListener('submit',async e=>{
 const f=e.target;if(!['job-form','kakao-form','work24-form'].includes(f.id))return;e.preventDefault();if(!mustLocal())return;
 const button=f.querySelector('button[type=submit]')||f.querySelector('button:not([type=button])');if(button)button.disabled=true;
 try{
  const data=Object.fromEntries(new FormData(f));
  if(f.id==='job-form'){
   data.days=new FormData(f).getAll('days').map(Number);data.count=Number(data.count);data.includeAny=!!data.includeAny;data.onlyNew=!!data.onlyNew;data.noUpdates=data.silent?'silent':'notify';data.keywords=(data.keywords||'').split(',').map(x=>x.trim()).filter(Boolean);
   if(data.weatherCity){const [location,latitude,longitude]=data.weatherCity.split('|');Object.assign(data,{location,latitude,longitude})}
   await api('jobs/save',data);$('job-dialog').close();view='jobs';toast('저장했습니다. 먼저 수집 미리보기를 확인하세요.');
  }else{await api(f.id==='kakao-form'?'kakao/config':'sources/work24',data);f.reset();toast('설정을 저장했습니다.')}
  await refresh();
 }catch(e){toast(e.message)}finally{if(button)button.disabled=false}
});
window.addEventListener('hashchange',()=>{view=location.hash.slice(1)||'home';render()});
refresh().catch(e=>{$('environment').innerHTML='<div class="error">개인 실행 화면에 연결하지 못했습니다. '+esc(e.message)+'</div>';render()});
