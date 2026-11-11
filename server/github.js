import {execFileSync} from 'node:child_process';
export const REPO='glasscola/aiPromteca',BRANCH='assistant-state';
export function credential(){
 if(process.env.GITHUB_TOKEN)return process.env.GITHUB_TOKEN;
 try{return execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true,timeout:15000,stdio:['pipe','pipe','pipe']}).split(/\r?\n/).find(x=>x.startsWith('password='))?.slice(9)||''}catch{return ''}
}
export async function github(path,options={}){
 const token=credential();if(!token)throw Error('GitHub 로그인이 필요합니다. GitHub Desktop 또는 Git에서 로그인하세요.');
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{...options,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
 if(!r.ok){const e=Error('GitHub 연결 실패 ('+r.status+'). 저장소 권한을 확인하세요.');e.status=r.status;throw e}return r.status===204?null:r.json();
}
export async function setupCloud(key,encrypted){
 const {default:sodium}=await import('libsodium-wrappers');await sodium.ready;
 const pub=await github('/actions/secrets/public-key');const sealed=sodium.to_base64(sodium.crypto_box_seal(sodium.from_string(key),sodium.from_base64(pub.key,sodium.base64_variants.ORIGINAL)),sodium.base64_variants.ORIGINAL);
 let exists=false;try{await github('/contents/state.enc?ref='+BRANCH);exists=true}catch(e){if(e.status!==404)throw e}
 if(exists)throw Error('클라우드가 이미 있습니다. 기존 .assistant 폴더를 사용하세요.');
 await github('/actions/secrets/ASSISTANT_STATE_KEY',{method:'PUT',body:JSON.stringify({encrypted_value:sealed,key_id:pub.key_id})});
 try{await github('/git/ref/heads/'+BRANCH)}catch(e){if(e.status!==404)throw e;const base=await github('/git/ref/heads/main');await github('/git/refs',{method:'POST',body:JSON.stringify({ref:'refs/heads/'+BRANCH,sha:base.object.sha})})}
 await github('/contents/state.enc',{method:'PUT',body:JSON.stringify({branch:BRANCH,message:'Initialize encrypted assistant state',content:Buffer.from(encrypted).toString('base64')})});
}
export const dispatch=()=>github('/actions/workflows/assistant.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'main'})});
export async function cloudRuns(){const r=await github('/actions/workflows/assistant.yml/runs?per_page=3');return r.workflow_runs.map(x=>({status:x.status,conclusion:x.conclusion,url:x.html_url,created:x.created_at}))}
