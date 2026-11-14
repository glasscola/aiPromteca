const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REDIRECT='http://localhost:4317/api/kakao/callback',DOMAIN='https://glasscola.github.io';
export function mountKakaoSetup(doc,deps={}){
 const win=doc.defaultView,root=doc.getElementById('setup-content'),error=doc.getElementById('setup-error');
 const fetcher=deps.fetch||win.fetch?.bind(win),navigate=deps.navigate||(url=>win.location.assign(url));
 const local=['localhost','127.0.0.1'].includes(win.location.hostname);
 let state=null,step=0,busy=false;
 const button=(text,action,disabled=false)=>'<button class="primary" data-action="'+action+'" '+(disabled?'disabled':'')+'>'+text+'</button>';
 const link=(text,url)=>'<a class="primary" target="_blank" rel="noopener noreferrer" href="'+url+'">'+text+' ↗</a>';
 const copy=(label,value)=>'<label class="field"><span class="field-title">'+label+'</span><div class="setup-copy"><input readonly value="'+value+'" aria-label="'+label+'"><button class="secondary" data-copy="'+value+'">복사</button></div></label>';
 async function request(path,data){const r=await fetcher('/api/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(data===undefined?{}:{'x-csrf-token':state.csrf})},body:data===undefined?undefined:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'요청에 실패했습니다.');return value}
 function render(){
  if(!local){root.innerHTML='<section class="setup-card"><h2>이 공개 페이지에는 카카오 로그인 서버가 연결되지 않았습니다.</h2><p>지금 준비된 것은 내 PC에서 설정하는 개인용 연결입니다. 아래 버튼으로 실제 설정·로그인·테스트 화면을 여세요.</p><div class="actions"><a class="primary" href="http://localhost:4317/kakao.html">내 PC에서 연결 시작 ↗</a></div><details><summary>개인 화면이 열리지 않나요?</summary><ol><li><a href="https://github.com/glasscola/aiPromteca/archive/refs/heads/main.zip">프로그램 내려받기</a> 후 압축을 풉니다.</li><li>Node.js 24 이상이 설치된 PC에서 <strong>start-assistant.cmd</strong>를 실행합니다.</li><li>다시 위 연결 시작 버튼을 누르세요.</li></ol></details><p>다른 사람도 사이트에서 로그인 한 번으로 연결하는 공용 서비스는 아직 준비되지 않았습니다.</p></section>';return}
  if(!state)return;
  if(state.test?.receivedAt){root.innerHTML='<section class="setup-card"><div class="status">사용자가 테스트 수신을 확인했습니다.</div><h2>카카오 연결 테스트 완료</h2><p>발송 API 성공: '+esc(state.test.sentAt)+'<br>수신 확인: '+esc(state.test.receivedAt)+'</p><a class="primary" href="automation.html#jobs">받을 작업과 시간 정하기 →</a></section>';return}
  if(state.connection.loggedIn){root.innerHTML='<section class="setup-card"><span class="setup-step">마지막 단계 · 실제 수신 확인</span><h2>내 카카오톡으로 테스트 보내기</h2><p>아래 버튼은 실제 발송 API를 호출합니다. 본인의 나와의 채팅을 확인하세요.</p><div class="actions">'+button('테스트 메시지 보내기','send')+button('카톡에서 받았어요','confirm',!state.test?.sentAt)+'</div>'+(state.test?.sentAt?'<p>카카오 발송 API 성공: '+esc(state.test.sentAt)+'<br>아직 실제 수신은 확인하지 않았습니다.</p>':'')+'</section>';return}
  if(state.connection.configured&&step!==2){root.innerHTML='<section class="setup-card"><span class="setup-step">앱 설정 저장됨 · 로그인 대기</span><h2>이제 실제 카카오 로그인으로 이동합니다.</h2><p>로그인 후 카카오톡 메시지 전송에 동의하면 이 화면으로 돌아옵니다.</p><div class="actions">'+button('카카오 로그인 시작','login')+'<button class="secondary" data-action="settings">앱 설정 수정</button></div></section>';return}
  if(step===0){root.innerHTML='<section class="setup-card"><span class="setup-step">1 / 3 · 운영자 최초 등록</span><h2>카카오 앱 설정이 아직 저장되지 않았습니다.</h2><p>사이트 운영자가 처음 한 번 준비하는 단계입니다. 먼저 카카오에 프로그램을 등록해야 실제 로그인 버튼이 동작합니다.</p><ol><li>아래 버튼으로 카카오디벨로퍼스를 열고 본인 계정으로 로그인하세요.</li><li>앱 목록에서 앱을 만들고 이름을 <strong>프롬테카</strong>로 입력하세요. 나머지 필수 정보는 본인의 실제 정보를 입력하세요.</li><li>이미 만든 앱이 있으면 그 앱을 선택하세요.</li></ol><div class="actions">'+link('카카오 앱 목록 열기','https://developers.kakao.com/console/app')+button('앱을 만들었어요 →','next')+'</div></section>';return}
  if(step===1){root.innerHTML='<section class="setup-card"><span class="setup-step">2 / 3 · 카카오 설정에 값 넣기</span><h2>아래 값을 복사해서 등록하세요.</h2><ol><li>선택한 앱의 <strong>카카오 로그인</strong> 설정에서 로그인을 활성화합니다.</li><li><strong>Redirect URI</strong> 항목에 아래 주소를 등록합니다.</li></ol>'+copy('Redirect URI',REDIRECT)+'<ol start="3"><li>동의 항목에서 <strong>카카오톡 메시지 전송(talk_message)</strong>을 설정합니다.</li><li><strong>제품 링크 관리 → 웹 도메인</strong>에 아래 주소를 등록합니다.</li></ol>'+copy('웹 도메인',DOMAIN)+'<div class="actions">'+link('카카오 설정 화면 열기','https://developers.kakao.com/console/app')+button('설정값을 등록했어요 →','next')+'</div><details><summary>설정 항목을 못 찾겠어요</summary><p><a href="https://developers.kakao.com/docs/ko/tutorial/custom-msg-template" target="_blank" rel="noreferrer">카카오 공식 화면별 안내 열기 ↗</a></p></details></section>';return}
  root.innerHTML='<section class="setup-card"><span class="setup-step">3 / 3 · 이 프로그램에 앱 연결</span><h2>앱의 REST API 키를 넣어주세요.</h2><p>카카오 앱 설정의 앱 키에서 <strong>REST API 키</strong>를 복사하세요. JavaScript 키나 Admin 키가 아닙니다.</p><form id="kakao-settings"><label class="field"><span class="field-title">REST API 키 (32자리)</span><input name="clientId" type="password" minlength="32" maxlength="32" autocomplete="off" required></label><label class="field"><span class="field-title">Client Secret (카카오에서 활성화한 경우)</span><input name="clientSecret" type="password" autocomplete="off"></label><button class="primary" type="submit">저장하고 로그인 단계로 →</button></form><p>키는 이 PC의 연결 서버로 보내 암호화해 저장합니다. 채팅에 보내거나 공개 페이지에 붙여넣지 마세요.</p></section>';
 }
 async function refresh(){state=await request('state');render();const message=new URL(win.location.href).searchParams.get('error');if(message)error.textContent=message}
 async function handle(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.copy){try{await win.navigator.clipboard.writeText(b.dataset.copy);b.textContent='복사됨'}catch{b.parentElement.querySelector('input').select();error.textContent='선택된 값을 직접 복사하세요.'}return}
  if(!b.dataset.action||busy)return;
  busy=true;b.disabled=true;error.textContent='';
  try{
   const a=b.dataset.action;
   if(a==='next'){step=Math.min(2,step+1);render()}
   if(a==='settings'){step=2;render()}
   if(a==='login'){const result=await request('kakao/start',{});const url=new URL(result.url);if(url.origin!=='https://kauth.kakao.com')throw Error('로그인 주소를 확인하지 못했습니다.');navigate(url.href)}
   if(a==='send'){await request('test/send',{});await refresh()}
   if(a==='confirm'){await request('test/confirm',{});await refresh()}
   if(a==='retry')await refresh();
  }catch(e){error.textContent=e.message}finally{busy=false;b.disabled=false}
 }
 async function submit(e){
  if(e.target.id!=='kakao-settings')return;e.preventDefault();if(busy)return;busy=true;error.textContent='';const form=e.target,button=form.querySelector('button');button.disabled=true;
  try{await request('kakao/config',Object.fromEntries(new win.FormData(form)));form.reset();step=0;await refresh()}catch(e){error.textContent=e.message}finally{busy=false;button.disabled=false}
 }
 root.addEventListener('click',handle);root.addEventListener('submit',submit);
 const ready=local?refresh().catch(e=>{error.textContent=e.message;root.innerHTML='<section class="setup-card"><h2>연결 상태를 불러오지 못했습니다.</h2>'+button('다시 확인','retry')+'</section>'}):Promise.resolve(render());
 return {ready,dispose(){root.removeEventListener('click',handle);root.removeEventListener('submit',submit)}};
}
if(typeof document!=='undefined')mountKakaoSetup(document);
