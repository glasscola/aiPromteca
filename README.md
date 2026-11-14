# 프롬테카 - GPT 개인 비서
원하는 작업과 개인 조건을 고르면 GPT에 보낼 상세 요청문이 완성됩니다.

## 사용
1. https://glasscola.github.io/aiPromteca/ 에 접속합니다.
2. 맡길 작업을 선택하고 필요한 조건을 입력합니다.
3. 설명 길이와 표·그래프·이미지 사용 방식을 고릅니다.
4. 완성된 요청을 복사해 GPT 질문창에 붙여넣고 전송합니다.
5. 같은 GPT 대화에서 비교·수정·추가 작업을 요청합니다.

## 사용설명서
사이트 하단의 PDF 사용설명서 또는 output/pdf/promteca-user-guide.pdf를 확인하세요.

## 개발
Node.js 24 이상에서 npm ci 후 npm test로 검증합니다.
프런트엔드는 정적 파일로 배포합니다.

## 파일 구성
- src/specs/: 분야별 30개 업무 정의
- src/prompt.js, prompt-contract.js: 명령문 조립
- src/presentation.js: 표현 및 후속 대화 규칙
- src/app.js, storage.js: 화면과 브라우저 저장
- docs/GPT-ONLY-ASSISTANT-PLAN.md: GPT 전용 기획
