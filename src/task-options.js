const text=(label,placeholder='')=>({label,type:'text',placeholder});
const one=(label,options)=>({label,type:'one',options});
const many=(label,options)=>({label,type:'many',options});
const employment=f=>({...f,when:{field:'찾을 것',values:['채용','인턴']}});
const activity=f=>({...f,when:{field:'찾을 것',values:['공모전','대외활동']}});
export const extraFields={
weather:[text('활동 시간','출근 07:00~09:00, 퇴근 18:00~20:00')],
air:[one('조회 기준',['현재 관측','오늘 예보','내일 예보'])],
schedule:[text('준비·이동 조건')],todo:[text('할 일과 마감')],reminder:[text('반복 종료 조건')],
company:[one('조사 목적',['최근 소식','사업·경쟁력 조사','재무·위험요인 조사'])],
earnings:[{...text('지정 회계기간','2026년 3분기'),when:{field:'대상',values:['직접 지정']}}],
currency:[one('환율 기준',['시장 동향','은행 매매기준율','실제 환전 적용률']),text('은행·환전 조건')],
economic:[one('표시 시간대',['한국 시간과 현지 시간','한국 시간'])],
news:[one('조회 기간',['최근 24시간','최근 3일','최근 1주일'])],
ai:[one('소식 개수',['5개','10개','20개']),one('독자',['일반 사용자','개발자'])],
topic:[text('조사 목적·질문')],
policy:[one('접수 상태',['현재 신청 가능','신청 예정 포함']),one('목표 건수',['10건','20건','가능한 만큼'])],
jobs:[employment(text('함께 찾을 직무','전기보전, 전기 유지보수, 설비보전, 공장 공무')),employment(one('경력무관 공고',['포함','제외'])),employment(one('학력',['제한 없이 보기','고졸 지원 가능','전문대졸 지원 가능','대졸 지원 가능'])),employment(text('보유 자격증','없음 / 전기기능사 등')),employment(many('고용 형태',['전체','정규직','계약직','인턴'])),employment(one('근무 형태',['무관','주간','교대'])),activity(text('참가 자격')),activity(one('참가 방식',['무관','개인','팀'])),activity(one('참가비',['무료만','유료 포함'])),one('공고 상태',['현재 접수 중','최근 7일 등록 중 접수 중','마감 임박']),one('목표 공고 수',['20건','10건','30건','가능한 만큼']),one('정렬',['마감 임박 순','최근 등록 순','조건 일치도 순'])],
email:[text('요약할 이메일 본문','여기에 붙여넣거나 GPT에서 제공')],
meeting:[text('회의 자료','메모를 붙여넣거나 GPT에서 파일 제공')],
document:[text('문서 원문·링크','파일은 GPT에서 직접 첨부')],
report:[text('실제 진행 자료')],reply:[text('받은 메시지 원문'),text('피해야 할 약속·표현')],
english:[one('교정 시점',['내 답변 직후','대화가 끝난 뒤']),one('설명 언어',['한국어','영어'])],
study:[text('현재 진도'),text('쉬는 날·제약')],explain:[text('알고 있는 내용·사용 목적')],
quiz:[text('출제 기준 자료')],writing:[text('목표 분량'),text('필수·금지 표현')],
shopping:[text('필수 기능·호환 조건'),one('제품 상태',['새 제품','중고 포함'])],
deals:[text('정확한 모델·옵션'),text('사용 가능한 쿠폰·회원 조건')],
travel:[text('출발지'),text('예약된 일정·필수 조건')],
places:[text('방문 날짜·시간'),one('추천 개수',['5곳','10곳'])],
events:[text('참가 대상·연령'),one('목표 건수',['10건','20건'])]
};
export function visibleField(id,f,v){
 if(id==='stocks'&&['관심 업종','관심 종목'].includes(f.label))return (v['관심 범위']||[]).includes(f.label==='관심 업종'?'특정 업종':'특정 종목');
 return !f.when||f.when.values.includes(v[f.when.field]);
}
export function effectiveValues(task,values={}){
 return Object.fromEntries(task.fields.map(f=>[f.label,values[f.label]??(f.options?(f.type==='many'?[f.options[0]]:f.options[0]):'')]));
}

