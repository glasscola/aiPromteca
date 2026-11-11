# 프롬테카 — 개인 비서

공개 사이트: https://glasscola.github.io/aiPromteca/

## 시작
- Windows: 저장소 ZIP을 풀고 start-assistant.cmd 실행
- Node.js 24 이상: npm ci 후 npm start
- 개인 실행 화면: http://localhost:4317

## 구성
- 공개 사이트: 시작 안내, 자동화 기능 범위, 30개 GPT 요청문 생성
- 개인 실행 서버: 설정, 카카오 OAuth, 테스트 발송·수신 확인, 작업 편집, 실행 기록
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
