
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image
import pypdfium2 as pdfium
out=Path('output/pdf');out.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Korean',r'C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('KoreanBold',r'C:/Windows/Fonts/malgunbd.ttf'))
pdf=out/'promteca-user-guide.pdf';c=canvas.Canvas(str(pdf),pagesize=(595.28,841.89))
c.setTitle('프롬테카 GPT 개인 비서 사용설명서')
def text(x,y,s,size=11,bold=False):
 c.setFont('KoreanBold' if bold else 'Korean',size);c.setFillColorRGB(.12,.19,.15);c.drawString(x,y,s)
def frame(n,title):
 c.setFillColorRGB(.97,.98,.96);c.rect(0,0,596,842,fill=1,stroke=0)
 text(40,800,'PROMTECA / GPT ASSISTANT',10,True);text(40,760,title,21,True)
 text(40,25,'2026-11-14  |  GPT 전용 사용설명서',9);text(530,25,str(n),9)
def lines(y,items):
 for item in items:text(40,y,item,10);y-=22
def shot(n,title,file,tips):
 frame(n,title);img=Image.open(out/file);w,h=img.size
 scale=min(515/w,545/h);ww,hh=w*scale,h*scale
 c.drawImage(ImageReader(img),40,710-hh,width=ww,height=hh)
 lines(710-hh-28,tips);c.showPage()
frame(1,'나의 일을 GPT에게 맡기는 방법')
text(40,690,'선택 → 조건 → 표현 → GPT에서 실행',17,True)
lines(640,['프롬테카는 필요한 업무 지시를 조립하는 사이트입니다.',
'원하는 작업과 개인 조건을 고르면 상세한 요청문이 만들어집니다.',
'그 요청을 GPT에 붙여넣어 실행하고 같은 대화에서 이어서 요청합니다.',
'',
'시작 주소: https://glasscola.github.io/aiPromteca/',
'설치나 외부 계정 연결 없이 작업을 고를 수 있습니다.',
'GPT 로그인과 도구 이용 범위는 사용하는 계정·환경에 따릅니다.',
'',
'이 설명서의 화면은 수정된 사이트를 실제 브라우저에서 캡처했습니다.',
'예시 입력은 사용 방법을 보여주기 위한 것이며 실제 날씨 조회 결과가 아닙니다.',
'GPT 답변 생성이나 자동 예약 완료를 증명하는 화면은 아닙니다.'])
c.linkURL('https://glasscola.github.io/aiPromteca/',(40,490,550,530),relative=0)
c.showPage()
shot(2,'01. 맡길 일을 선택하세요','01-select.jpg',[
'날씨·증권·채용 등 30개 작업을 여러 개 선택할 수 있습니다.',
'출근 준비·시장 점검·취업 준비는 관련 작업을 한 번에 추가합니다.',
'목록에 없는 일은 직접 입력하고 상세 조건으로 이동하세요.'])
shot(3,'02. 내 조건을 입력하세요','02-conditions.jpg',[
'지역·시간·관심 대상 등 실제 조건을 입력합니다. 회색 예시는 저장된 값이 아닙니다.',
'예: 지역 서울 강남구 / 활동 시간 출근 08:00, 귀가 19:00.',
'필수 정보가 부족하면 GPT가 질문할 수 있습니다. 개인 사실을 추정하지 않도록 지시합니다.'])
shot(4,'03. 읽기 쉬운 표현을 고르세요','03-style.jpg',[
'기본 추천: 알아서 보기 좋게 + 필요한 그래프·도식 자동.',
'텍스트·표만을 고르면 그림 생성 없이 정리하도록 요청합니다.',
'그림·그래프는 실제 도구 지원과 데이터가 있을 때 사용합니다.'])
shot(5,'04. 복사한 요청을 GPT에 붙여넣으세요','04-transfer.jpg',[
'복사해서 GPT로 옮기기를 누르면 전체 요청문을 복사합니다.',
'GPT 열기를 누르고 질문창에 붙여넣은 뒤 전송하세요.',
'복사 실패 시 펼쳐진 전체 명령문을 직접 선택해 복사하세요.',
'이 버튼은 GPT에서 답변을 자동 전송하거나 예약을 등록하지 않습니다.'])
frame(6,'05. 같은 대화에서 계속 활용하세요')
lines(700,['날씨: “퇴근이 밤 10시로 바뀌었어. 귀가 준비를 다시 정리해줘.”',
'채용: “채용 2번과 4번의 필수 자격과 마감을 비교해줘.”',
'주식: “이슈 1번이 왜 중요한지 초보자도 알게 설명해줘.”',
'공부: “이틀 밀렸어. 남은 시간에 맞춰 계획을 조정해줘.”',
'',
'문제가 생겼을 때',
'• 복사가 안 됨: 전체 명령문을 펼쳐 직접 복사합니다.',
'• 그림이 안 나옴: “같은 내용을 표와 텍스트로 정리해줘”라고 요청합니다.',
'• 표가 너무 넓음: “휴대폰에서 읽기 좋게 표를 나눠줘”라고 요청합니다.',
'• 최신 자료 확인 불가: 최신 결과라고 가정하지 말고 자료를 제공하거나 재확인합니다.',
'• 새 대화로 이동: 기존 조건을 다시 전달하거나 이어쓰기 요약을 붙여넣습니다.',
'',
'결과를 읽는 기준',
'중요한 결론·마감은 실제 굵게, 상태는 문구·기호와 함께 표시하도록 요청합니다.',
'일반 글자색·폰트는 고정하지 않습니다. 생성 차트의 색에는 범례를 요청합니다.',
'개인 자격·수치·출처를 확인하고, 확인 필요 표시를 확정 사실로 받아들이지 마세요.'])
c.showPage();c.save()
doc=pdfium.PdfDocument(str(pdf))
for i,page in enumerate(doc):
 page.render(scale=1).to_pil().save(out/('guide-page-'+str(i+1)+'.png'))
print(str(pdf.resolve()),len(doc),'pages')

