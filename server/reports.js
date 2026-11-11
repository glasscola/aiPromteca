import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {newKey,encrypt} from './crypto.js';
import {github,BRANCH} from './github.js';
import {SITE} from './kakao.js';
export async function publishReport(store,result){
 const reportId=randomUUID(),key=newKey(),data=encrypt(result,key);
 if(!store.remote)throw Error('클라우드를 연결해야 휴대폰에서 볼 수 있는 결과 링크를 만들 수 있습니다.');
 await github('/contents/reports/'+reportId+'.json',{method:'PUT',body:JSON.stringify({branch:BRANCH,message:'Store encrypted report',content:Buffer.from(data).toString('base64')})});
 return SITE+'report.html#'+reportId+'.'+Buffer.from(key,'base64').toString('base64url');
}
