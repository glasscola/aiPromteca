import {Store} from './store.js';
import {tick} from './runner.js';
if(!process.env.ASSISTANT_STATE_KEY){console.log('Cloud not configured. No tasks executed.');process.exit(0)}
const store=await new Store().init();
try{const result=await tick(store);console.log(JSON.stringify(result));if(result.failed)process.exitCode=1}catch{console.error('Assistant run failed. Open the private dashboard to inspect connection and execution records.');process.exitCode=1}
