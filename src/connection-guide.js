const guides={
 '카카오톡':{title:'카카오톡 연결 방법',steps:['연결을 제공하는 서비스에서 카카오 로그인을 시작합니다.','본인 계정으로 로그인하고 메시지 전송 권한에 동의합니다.','본인에게 테스트 메시지를 보내고 수신 여부를 확인합니다.','수신 확인 후 받을 작업과 시간을 설정합니다.'],note:'현재 사이트의 개인용 자동 발송 기능은 운영자 앱 설정이 필요합니다. 이 안내를 열거나 전달처를 선택하는 것만으로 연결되지는 않습니다.',link:'automation.html#connections',label:'개인용 자동 발송 설정 보기'},
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
