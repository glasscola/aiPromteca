import {Store} from './store.js';
import {encrypt} from './crypto.js';
import {setupCloud,dispatch} from './github.js';
import {validateJob} from './validation.js';
import {randomUUID} from 'node:crypto';
const store=await new Store().init();
if(!store.remote){
 const {state}=await store.read();
 if(!state.jobs.length)state.jobs.push({...validateJob({name:'전국 신입 전기 정비 채용',type:'jobs',keywords:['전기 정비','전기보전','전기 유지보수','설비보전','공장 공무'],region:'전국',time:'08:00',days:[0,1,2,3,4,5,6],count:20,includeAny:true,onlyNew:true}),id:randomUUID(),enabled:false,createdAt:new Date().toISOString(),seen:[]});
 state.cloud.enabled=true;
 await setupCloud(store.key,encrypt(state,store.key));await store.enableRemote();
}
console.log('Cloud encrypted storage configured. No delivery tasks enabled.');
await dispatch();console.log('Cloud execution check requested.');
