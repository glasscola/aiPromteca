# 프롬테카 — 개인 비서

공개 사이트: https://glasscola.github.io/aiPromteca/

## 시작
- Windows: 저장소 ZIP을 풀고 start-assistant.cmd 실행
- Node.js 24 이상: npm ci 후 npm start
- 개인 실행 화면: http://localhost:4317

## 구성
- 공개 사이트: 30개 작업 선택 → 상세 조건 → 답변 방식 → GPT 요청문 전달. 카카오·클라우드 연결 없이 사용합니다.
- 선택 기능 automation.html의 개인 실행 서버: 설정, 카카오 OAuth, 테스트 발송·수신 확인, 작업 편집, 실행 기록
- GitHub Actions: PC가 꺼져도 15분 간격으로 예약 확인. 정시 도착 보장 없음.
- 날씨(Open-Meteo), 뉴스 제목·링크(Google 뉴스 RSS), 신입 채용(고용24 공식 API), 직접 작성한 알림
- 카카오 기본 텍스트 메시지 + 별도 키로 암호화한 전체 결과 링크
- GPT API를 호출하지 않음. 뉴스 AI 요약, 채용 원문 전수 검증이나 30개 작업의 무인 실행을 제공한다고 표시하지 않음.

## 사용자 연결이 필요한 부분
카카오 개발자 앱 등록·로그인·메시지 권한 동의와 테스트 수신 확인은 사용자가 진행합니다.
채용 자동 조회에는 고용24 인증키가 필요합니다.
키 저장만으로 실제 연결이나 수신 완료로 표시하지 않습니다.

## 파일
- src/dashboard.js, dashboard.css: 새 관리 화면
- src/catalog.js, task-options.js, task-rules.js, prompt.js, execution-rules.js: GPT 요청문 도구
- server/index.js: 개인 화면 HTTP API, 세션·CSRF·OAuth state
- server/kakao.js: 로그인 토큰·갱신·발송
- server/sources.js: 실제 자료 수집
- server/runner.js, validation.js: 예약, 중복 방지, 실행 상태
- server/store.js, crypto.js, github.js: 암호화 저장과 클라우드 연결
- server/reports.js, report.html, src/report.js: 개인 결과 링크
- .github/workflows/assistant.yml: 클라우드 실행
- docs/OPERATIONS.md: 실행 구조·제약·운영 안내

npm test로 회귀 검사를 실행합니다.
.assistant 폴더는 비밀정보이므로 공유하거나 Git에 올리지 마세요. 기존 클라우드 복구에 필요한 키가 들어 있습니다.

## 메인 이용 흐름 복원
- 카카오·클라우드 설정은 메인 흐름에 없습니다. 페이지 아래 선택 기능 링크로 분리했습니다.
- 답변 방식에서 직접 선택한 경우에만 반복·외부 전달 조건을 요청문에 넣습니다.
- 날씨·증권 뉴스·채용의 기본 요청문은 GPT 질문창 전달 경로를 사용합니다.
- 긴 요청은 복사 성공 후 별도 GPT 열기 버튼을 제공합니다. 복사 실패 시 빈 GPT로 보내지 않습니다.
- Codex 앱을 GPT 앱처럼 표시하던 버튼을 제거했습니다.
- tests/builder-ui.test.js: 30개 작업의 공개 화면 클릭·입력 흐름과 선택 기능 분리 검증.
