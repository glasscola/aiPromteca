import fs from 'node:fs/promises';
import path from 'node:path';
import {encrypt,decrypt,newKey} from './crypto.js';
import {github,BRANCH} from './github.js';
export const emptyState=()=>({version:2,jobs:[],runs:[],connection:{},sourceKeys:{},cloud:{enabled:false},test:null});
export class Store{
 constructor(root='.assistant'){this.root=root;this.queue=Promise.resolve();this.remote=Boolean(process.env.ASSISTANT_STATE_KEY)}
 async init(){
  await fs.mkdir(this.root,{recursive:true});const file=path.join(this.root,'key');
  if(process.env.ASSISTANT_STATE_KEY)this.key=process.env.ASSISTANT_STATE_KEY;
  else {try{this.key=(await fs.readFile(file,'utf8')).trim()}catch(e){if(e.code!=='ENOENT')throw e;this.key=newKey();await fs.writeFile(file,this.key,{mode:0o600,flag:'wx'})}}
  if(!this.remote){try{this.remote=JSON.parse(await fs.readFile(path.join(this.root,'mode.json'),'utf8')).remote}catch(e){if(e.code!=='ENOENT')throw e}}return this;
 }
 async read(){
  if(this.remote){const r=await github('/contents/state.enc?ref='+BRANCH);return {state:decrypt(Buffer.from(r.content,'base64').toString(),this.key),sha:r.sha}}
  try{return {state:decrypt(await fs.readFile(path.join(this.root,'state.enc'),'utf8'),this.key)}}catch(e){if(e.code!=='ENOENT')throw e;return {state:emptyState()}}
 }
 async write(state,sha){
  const data=encrypt(state,this.key);
  if(this.remote){await github('/contents/state.enc',{method:'PUT',body:JSON.stringify({branch:BRANCH,message:'Update encrypted assistant state',sha,content:Buffer.from(data).toString('base64')})});return}
  const file=path.join(this.root,'state.enc');await fs.writeFile(file+'.tmp',data,{mode:0o600});await fs.rename(file+'.tmp',file);
 }
 async transact(fn){const action=async()=>{for(let a=0;a<3;a++){const {state,sha}=await this.read();const result=fn(state);try{await this.write(state,sha);return result}catch(e){if(e.status!==409||a===2)throw e}}};const next=this.queue.then(action,action);this.queue=next.catch(()=>{});return next}
 async enableRemote(){this.remote=true;await fs.writeFile(path.join(this.root,'mode.json'),JSON.stringify({remote:true}),{mode:0o600})}
}
export function publicState(s){return {jobs:s.jobs,runs:s.runs.slice(-30).reverse(),cloud:s.cloud,test:s.test?{sentAt:s.test.sentAt,receivedAt:s.test.receivedAt}:null,connection:{configured:!!s.connection.clientId,loggedIn:!!s.connection.refreshToken,account:s.connection.account,connectedAt:s.connection.connectedAt},sources:{work24:!!s.sourceKeys.work24},version:s.version}}
