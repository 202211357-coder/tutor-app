# tutor-app

기계공학 과목별 AI 튜터 웹앱입니다. React(Vite) 프론트엔드와 Express 서버로 구성되며, 서버가 Claude API를 호출합니다.

- **튜터에게 질문**: 과목(정역학, 재료역학, 열역학, 유체역학, 기계동역학)과 모드(힌트 / 단계별 풀이)를 고르고 질문합니다. 손풀이 사진(PNG/JPG/WEBP, 최대 5MB)을 첨부할 수 있습니다.
- **연습 문제**: 답을 `값 + 단위`로 입력하면 자동 채점합니다. 단위가 달라도(예: `5000 N` = `5 kN`) 같은 물리량이면 정답으로 처리합니다.

## 실행 방법 (Windows 기준)

1. [Node.js](https://nodejs.org) LTS(22 이상)를 설치합니다.
2. 이 폴더에서 PowerShell을 열고 의존성을 설치합니다.
   ```powershell
   npm install
   ```
3. `.env.example`을 `.env`로 복사한 뒤 `ANTHROPIC_API_KEY=` 뒤에 API 키를 넣습니다. `.env`는 git에 올라가지 않습니다.
   ```powershell
   copy .env.example .env
   notepad .env
   ```
4. 빌드 후 실행하고 브라우저에서 http://localhost:3001 을 엽니다.
   ```powershell
   npm run build
   npm start
   ```

API 키가 없어도 앱은 실행됩니다. 이때 연습 문제 채점은 동작하고, 튜터 질문은 "API 키가 설정되지 않았습니다" 오류를 보여 줍니다.

### 개발 모드 (코드 수정 시 자동 반영)

터미널 두 개를 엽니다.

```powershell
npm run dev:server   # 터미널 1: Express 서버 (3001)
npm run dev          # 터미널 2: Vite 개발 서버 (5173), /api 요청은 3001로 전달
```

## 테스트

```powershell
npm test
```

Claude API는 실제로 호출하지 않습니다. 호출부(`client.beta.messages.create`)와 `fetch`는 모두 mock으로 대체합니다.

| 파일 | 검증 내용 |
|---|---|
| `shared/subjects.test.js` | 과목별·모드별 시스템 프롬프트 분기, 잘못된 과목/모드 거부 |
| `shared/units.test.js` | 답안 숫자·단위 파싱, 단위 환산, m/M 접두어 혼동 방지 |
| `shared/grading.test.js` | 빈 답안, 부분 점수 경계(1%·5%), 단위가 다른 답안, 단위 누락, 차원 불일치 |
| `shared/imagePolicy.test.js` | 확장자·MIME·용량·매직 넘버 검사 |
| `server/tutorService.test.js` | Claude 요청 구성(과목 프롬프트, 이미지 블록, 이력), 거절·잘림 처리, SDK 오류 변환 |
| `server/app.test.js` | API 라우트: 업로드 예외(415/413/400), 입력 검증, 오류 응답 형식 |
| `src/lib/api.test.js` | 클라이언트 업로드: 전송 전 검증, 네트워크 실패, 서버 오류 응답 처리 |

## 구조

```
shared/        프론트·서버 공용 순수 로직 (과목 프롬프트, 단위, 채점, 이미지 정책, 문제 데이터)
server/        Express 앱(app.js), Claude 호출부(tutorService.js), 진입점(index.js)
src/           React UI (App.jsx, components/), API 클라이언트(lib/api.js)
```

## 환경 변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 튜터 질문에 필요 | Claude API 키. 서버에서만 읽고 브라우저로 보내지 않습니다. |
| `PORT` | 선택 | 서버 포트 (기본 3001) |
| `CLAUDE_MODEL` | 선택 | 모델 ID (기본 `claude-opus-5-5`) |
