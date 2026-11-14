const guides={
 '카카오톡':{title:'카카오톡 실제 연결 시작',steps:[],note:'현재는 내 PC에서 설정하는 개인용 연결입니다. 아래 버튼을 누르면 현재 상태를 확인하고, 앱 설정 → 실제 카카오 로그인 → 테스트 발송을 진행합니다. 공개 사이트의 공용 로그인 연동은 아직 준비되지 않았습니다.',link:'http://localhost:4317/kakao.html',label:'내 PC에서 실제 연결 화면 열기'},
 '노션':{title:'노션 연결 방법',steps:['GPT에 현재 환경에서 노션 연결과 쓰기를 지원하는지 확인하도록 요청합니다.','지원되는 연결 화면에서 노션에 로그인하고 접근할 페이지를 허용합니다.','결과를 저장할 페이지 또는 데이터베이스를 지정합니다.','테스트 내용을 저장하고 실제 생성된 페이지를 확인한 뒤 사용합니다.'],note:'현재 이 사이트에는 노션 직접 로그인·저장 기능이 없습니다. GPT에서 사용할 수 있는 연결을 확인하도록 요청문에 포함합니다. 권한이나 저장 기능이 없으면 그 사실과 가능한 다음 단계를 안내받습니다.'}
};
export function showConnectionGuide(doc,channel){
 const guide=guides[channel];if(!guide)return;
 let dialog=doc.getElementById('connection-guide');
 if(!dialog){dialog=doc.createElement('dialog');dialog.id='connection-guide';dialog.setAttribute('aria-labelledby','connection-guide-title');doc.body.append(dialog)}
 dialog.replaceChildren();
 const title=doc.createElement('h2');title.id='connection-guide-title';title.textContent=guide.title;dialog.append(title);
 const list=doc.createElement('ol');for(const step of guide.steps){const item=doc.createElement('li');item.textContent=step;list.append(item)}dialog.append(list);
 const note=doc.createElement('p');note.textContent=guide.note;dialog.append(note);
 const actions=doc.createElement('div');actions.className='actions';
 const close=doc.createElement('button');close.className='secondary';close.textContent='닫기';close.addEventListener('click',()=>dialog.close?dialog.close():dialog.removeAttribute('open'));actions.append(close);
 if(guide.link){const a=doc.createElement('a');a.className='primary';a.href=guide.link;a.textContent=guide.label;actions.append(a)}
 dialog.append(actions);if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
}
