import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {Store,publicState} from './store.js';
import {encrypt} from './crypto.js';
import {setupCloud,dispatch,cloudRuns} from './github.js';
import {exchange,sendKakao,REDIRECT} from './kakao.js';
import {validateJob} from './validation.js';
import {runJob} from './runner.js';

const root=process.cwd(),store=await new Store().init(),sessions=new Map(),oauth=new Map();
const COOKIE='promteca_session';
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
function session(req,res){const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim());let sid=cookies.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);let s=sessions.get(sid);if(!s||s.expires<Date.now()){sid=randomBytes(32).toString('hex');s={csrf:randomBytes(32).toString('hex'),expires:Date.now()+12*3600e3};sessions.set(sid,s);res.setHeader('Set-Cookie',COOKIE+'='+sid+'; HttpOnly; SameSite=Lax; Path=/')}return {sid,...s}}
async function body(req){let size=0,data='';for await(const chunk of req){size+=chunk.length;if(size>100000)throw Error('입력 내용이 너무 큽니다.');data+=chunk}return JSON.parse(data||'{}')}
let active=false;
async function exclusive(fn){if(active)throw Error('다른 실행이 진행 중입니다. 잠시 후 다시 시도하세요.');active=true;try{return await fn()}finally{active=false}}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 if(!['localhost:4317','127.0.0.1:4317'].includes(req.headers.host)){json(res,{error:'Invalid host'},403);return}
 const url=new URL(req.url,'http://localhost:4317'),s=session(req,res);
 try{
  if(url.pathname.startsWith('/api/')){
   if(!['GET','POST'].includes(req.method))return json(res,{error:'Method not allowed'},405);
   if(req.method==='POST'){
    if(req.headers.origin!=='http://'+req.headers.host||req.headers['x-csrf-token']!==s.csrf)return json(res,{error:'페이지를 새로고침한 뒤 다시 시도하세요.'},403);
   }
   if(url.pathname==='/api/state'&&req.method==='GET'){const {state}=await store.read();return json(res,{...publicState(state),csrf:s.csrf,local:true,redirect:REDIRECT})}
   if(url.pathname==='/api/kakao/callback'&&req.method==='GET'){
    const stateToken=url.searchParams.get('state'),pending=oauth.get(stateToken);oauth.delete(stateToken);
    if(!pending||pending.sid!==s.sid||pending.expires<Date.now())throw Error('로그인 요청이 만료되었습니다. 연결 화면에서 다시 시작하세요.');
    if(url.searchParams.get('error')||!url.searchParams.get('code'))throw Error('카카오 로그인이 취소되었습니다.');
    const {state}=await store.read(),data=await exchange(url.searchParams.get('code'),state.connection);
    await store.transact(x=>{Object.assign(x.connection,{accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+data.expires_in*1000,connectedAt:new Date().toISOString()});x.test=null;x.jobs.forEach(j=>j.enabled=false)});
    res.writeHead(303,{Location:'/automation.html?connected=1#connections'});return res.end();
   }
   if(req.method==='GET'&&url.pathname==='/api/cloud/runs')return json(res,await cloudRuns());
   if(req.method!=='POST')return json(res,{error:'Not found'},404);
   const b=await body(req);
   if(url.pathname==='/api/kakao/config'){
    if(!/^[a-fA-F0-9]{32}$/.test(b.clientId||''))throw Error('카카오 REST API 키 32자리를 입력하세요.');
    if(b.clientSecret&&!/^[a-zA-Z0-9_-]{16,200}$/.test(b.clientSecret))throw Error('Client Secret 값을 확인하세요.');
    await store.transact(x=>{x.connection={clientId:b.clientId,clientSecret:b.clientSecret||''};x.test=null;x.jobs.forEach(j=>j.enabled=false)});
    return json(res,{saved:true});
   }
   if(url.pathname==='/api/kakao/start'){
    const {state}=await store.read();if(!state.connection.clientId)throw Error('카카오 앱 설정을 먼저 저장하세요.');
    const nonce=randomBytes(32).toString('hex');oauth.set(nonce,{sid:s.sid,expires:Date.now()+10*60000});
    const q=new URLSearchParams({client_id:state.connection.clientId,redirect_uri:REDIRECT,response_type:'code',scope:'talk_message',state:nonce});
    return json(res,{url:'https://kauth.kakao.com/oauth/authorize?'+q});
   }
   if(url.pathname==='/api/kakao/disconnect'){await store.transact(x=>{x.connection={};x.test=null;x.jobs.forEach(j=>j.enabled=false)});return json(res,{disconnected:true})}
   if(url.pathname==='/api/test/send'){
    return json(res,await exclusive(async()=>{const {state}=await store.read();if(state.test?.sentAt&&Date.now()-Date.parse(state.test.sentAt)<60000)throw Error('방금 테스트를 보냈습니다. 카카오톡을 확인하세요.');
    const sent=await sendKakao(store,'프롬테카 연결 테스트\n이 메시지를 받았다면 개인 실행 화면에서 “받았어요”를 눌러주세요.\n'+new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}));await store.transact(x=>x.test={sentAt:sent.acceptedAt,receivedAt:null});return sent}));
   }
   if(url.pathname==='/api/test/confirm'){await store.transact(x=>{if(!x.test?.sentAt)throw Error('먼저 테스트 메시지를 보내세요.');x.test.receivedAt=new Date().toISOString()});return json(res,{confirmed:true})}
   if(url.pathname==='/api/sources/work24'){if(!b.key||String(b.key).length>300)throw Error('고용24 인증키를 입력하세요.');await store.transact(x=>{x.sourceKeys.work24=String(b.key).trim();x.jobs.filter(j=>j.type==='jobs').forEach(j=>{j.previewAt=null;j.enabled=false})});return json(res,{saved:true})}
   if(url.pathname==='/api/cloud/connect'){
    return json(res,await exclusive(async()=>{if(store.remote)return {connected:true};const {state}=await store.read();state.cloud.enabled=true;await setupCloud(store.key,encrypt(state,store.key));await store.enableRemote();return {connected:true}}));
   }
   if(url.pathname==='/api/cloud/check'){await dispatch();return json(res,{queued:true})}
   if(url.pathname==='/api/jobs/save'){
    const job=validateJob(b);await store.transact(x=>{const old=x.jobs.find(j=>j.id===b.id);if(old)Object.assign(old,job,{enabled:false,previewAt:null});else {if(x.jobs.length>=10)throw Error('최대 10개 작업까지 저장할 수 있습니다.');x.jobs.push({...job,id:randomUUID(),enabled:false,createdAt:new Date().toISOString(),seen:[]})}});return json(res,{saved:true});
   }
   if(url.pathname==='/api/jobs/toggle'){
    await store.transact(x=>{const job=x.jobs.find(j=>j.id===b.id);if(!job)throw Error('작업을 찾지 못했습니다.');if(b.enabled){if(!x.test?.receivedAt)throw Error('카카오 테스트 수신 확인이 필요합니다.');if(!x.cloud.enabled||!x.cloud.lastHeartbeat)throw Error('클라우드 연결과 실행 점검이 필요합니다.');if(!job.previewAt)throw Error('이 작업의 수집 미리보기를 먼저 확인하세요.')}job.enabled=!!b.enabled});return json(res,{saved:true});
   }
   if(url.pathname==='/api/jobs/delete'){await store.transact(x=>x.jobs=x.jobs.filter(j=>j.id!==b.id));return json(res,{deleted:true})}
   if(url.pathname==='/api/jobs/preview'||url.pathname==='/api/jobs/run'){return json(res,await exclusive(()=>runJob(store,b.id,{send:url.pathname.endsWith('/run')})))}
   return json(res,{error:'Not found'},404);
  }
  const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
  if(!/^(index\.html|automation\.html|prompt\.html|report\.html|styles\.css|dashboard\.css|src\/[a-z-]+\.js)$/.test(file))return json(res,{error:'Not found'},404);
  const mime=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript';
  const data=await fs.readFile(path.join(root,file));res.writeHead(200,{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-store'});res.end(data);
 }catch(e){json(res,{error:e.code==='ENOENT'?'파일을 찾지 못했습니다.':e.message},400)}
});
server.listen(4317,'127.0.0.1',()=>console.log('프롬테카 개인 실행 화면: http://localhost:4317'));
