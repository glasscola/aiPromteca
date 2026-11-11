const AUTH='https://kauth.kakao.com/oauth/token';
export const SITE='https://glasscola.github.io/aiPromteca/';
export const REDIRECT='http://localhost:4317/api/kakao/callback';
async function post(url,body,token){
 let r;try{r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...(token?{Authorization:'Bearer '+token}:{})},body:new URLSearchParams(body),signal:AbortSignal.timeout(20000)})}catch{const e=Error('카카오 응답을 확인하지 못했습니다. 중복 전송 방지를 위해 자동 재전송하지 않습니다.');e.uncertain=true;throw e}
 const data=await r.json();if(!r.ok){const e=Error('카카오 요청 실패 ('+r.status+', '+(data.error_code||data.code||'unknown')+'). 앱 설정·동의 항목·로그인을 확인하세요.');e.reconnect=r.status===401;throw e}return data;
}
export async function exchange(code,config){return post(AUTH,{grant_type:'authorization_code',client_id:config.clientId,redirect_uri:REDIRECT,code,...(config.clientSecret?{client_secret:config.clientSecret}:{})})}
export async function tokenFor(store){
 const {state}=await store.read(),c=state.connection;if(!c.refreshToken)throw Error('먼저 카카오 로그인과 메시지 전송 동의를 완료하세요.');
 if(c.expiresAt>Date.now()+60000)return c.accessToken;
 const data=await post(AUTH,{grant_type:'refresh_token',client_id:c.clientId,refresh_token:c.refreshToken,...(c.clientSecret?{client_secret:c.clientSecret}:{})});
 await store.transact(s=>{if(s.connection.refreshToken!==c.refreshToken)throw Error('연결 정보가 변경됐습니다. 다시 시도하세요.');s.connection.accessToken=data.access_token;s.connection.expiresAt=Date.now()+data.expires_in*1000;if(data.refresh_token)s.connection.refreshToken=data.refresh_token;});return data.access_token;
}
export async function sendKakao(store,text,url=SITE){
 const token=await tokenFor(store);
 const template={object_type:'text',text:Array.from(text).slice(0,200).join(''),link:{web_url:url,mobile_web_url:url},button_title:'결과 보기'};
 const r=await post('https://kapi.kakao.com/v2/api/talk/memo/default/send',{template_object:JSON.stringify(template)},token);
 if(r.result_code!==0)throw Error('카카오가 발송 성공을 확인하지 않았습니다.');return {acceptedAt:new Date().toISOString()};
}
