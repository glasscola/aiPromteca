const root=document.getElementById('report'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
try{
 const [id,key]=location.hash.slice(1).split('.');if(!/^[a-f0-9-]{36}$/.test(id)||!key)throw Error('카카오톡 메시지의 결과 보기 링크로 열어주세요.');
 const r=await fetch('https://raw.githubusercontent.com/glasscola/aiPromteca/assistant-state/reports/'+id+'.json',{referrerPolicy:'no-referrer',cache:'no-store'});if(!r.ok)throw Error('결과가 아직 준비되지 않았거나 삭제되었습니다. 잠시 후 다시 열어주세요.');
 const blob=await r.json(),data=bytes(blob.data),tag=bytes(blob.tag),cipher=new Uint8Array(data.length+tag.length);cipher.set(data);cipher.set(tag,data.length);
 const raw=key.replace(/-/g,'+').replace(/_/g,'/'),k=await crypto.subtle.importKey('raw',bytes(raw),{name:'AES-GCM'},false,['decrypt']);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(blob.iv)},k,cipher),result=JSON.parse(new TextDecoder().decode(plain));
 root.innerHTML='<span class="badge">개인 결과 링크</span><h1>'+esc(result.title)+'</h1><p>조회 '+esc(new Date(result.checkedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+' · 한국 시간</p>'+result.items.map(x=>'<article class="result-item"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||'')+'</p><p>'+esc(x.source)+' · '+esc(x.published||'')+'</p>'+(/^https?:\/\//.test(x.url||'')?'<a target="_blank" rel="noopener noreferrer" href="'+esc(x.url)+'">원문 확인 ↗</a>':'')+'</article>').join('')+'<div class="help">'+result.notes.map(esc).join('<br>')+'</div><p>이 링크를 가진 사람은 결과를 읽을 수 있습니다.</p>';
}catch(e){root.innerHTML='<h1>결과를 열지 못했습니다.</h1><p>'+esc(e.message)+'</p>'}
