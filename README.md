# tutor-app

기계공학 과목별 튜터 웹앱입니다. 강의실 칠판과 문제지를 본뜬 디자인(명조 제목·고딕 본문, 대학 조교 말투)이며, React(Vite) 프론트엔드와 Express 서버로 구성됩니다. API 키를 넣으면 서버가 Claude API로 질문에 답합니다.

과목·탭을 오가도 화면을 다시 만들지 않고 숨김/표시만 바꾸므로, 입력하던 답·바꾼 수치·채점 결과가 그대로 유지되고 화면이 깜빡이지 않습니다. 모든 과목의 문제 목록은 앱 시작 시 미리 받아 둡니다.

- **연습 문제** (API 키 불필요): 과목(정역학, 재료역학, 열역학, 유체역학, 기계동역학)별로 5~6문제, 총 26문제가 있고 주제(마찰, 트러스, 좌굴, 관마찰 등)별로 골라 볼 수 있습니다. 답을 `값 + 단위`로 입력하면 자동 채점합니다. 단위가 달라도(예: `5000 N` = `5 kN`) 같은 물리량이면 정답으로 처리합니다. 단계별 힌트를 하나씩 열어 볼 수 있고, 한 번 채점한 뒤에는 풀이와 정답을 볼 수 있습니다.
  - **새 수치로 풀기**: 문제마다(또는 전체) 수치를 무작위로 바꿔 같은 유형을 새로 풀 수 있습니다. 각 변수는 공학적으로 타당한 범위에서 일정 간격으로 뽑아 문제당 수백~수천 가지 조합이 나오고, 카드마다 최근 10개와 같은 수치는 다시 나오지 않습니다. 정답과 풀이는 서버가 공식으로 다시 계산하며, 응력이 항복강도를 넘거나 박육 가정·오일러 좌굴 세장비 조건이 깨지는 등 물리적으로 맞지 않는 조합은 나오지 않습니다.
- **학습 현황** (API 키 불필요): 채점할 때마다 자동으로 기록됩니다. 과목별 진도(만점 문제 수), 아직 만점이 아닌 "다시 풀어 볼 문제", 최근 채점 내역을 보여 줍니다. 기록은 `data/history.json`에 저장되어 앱을 껐다 켜도 남고, git에는 올라가지 않습니다.
- **오늘의 강의 노트**: 칠판 말풍선에 선택한 과목의 핵심 개념·자주 하는 실수를 보여 줍니다(과목당 10개, 학습 현황 탭에서는 공통 노트 10개). 날짜 기준으로 하루에 한 번 바뀌어 열흘 동안 겹치지 않습니다.
- **튜터에게 질문** (API 키 필요): 과목과 모드(힌트 / 단계별 풀이)를 고르고 질문합니다. 손풀이 사진(PNG/JPG/WEBP, 최대 5MB)을 첨부할 수 있습니다. 서버에 `ANTHROPIC_API_KEY`가 없으면 이 탭은 숨겨집니다.

## 실행 방법 (Windows 기준)

### 가장 간단한 방법: 더블클릭

[Node.js](https://nodejs.org) LTS(22 이상)를 설치한 뒤, 폴더의 **`start-tutor.bat`**을 더블클릭합니다.
처음 실행이면 패키지를 설치하고, 화면 파일을 빌드한 뒤 서버를 켜고 브라우저를 자동으로 엽니다.
검은 창을 닫으면 앱이 종료됩니다. 이미 실행 중일 때 다시 더블클릭하면 브라우저만 엽니다.

바탕화면에 바로가기를 만들려면 `start-tutor.bat`을 우클릭 → **보내기 → 바탕 화면에 바로 가기 만들기**를 누릅니다.

### 터미널로 실행

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

API 키가 없어도 앱은 실행됩니다. 이때는 연습 문제(채점·힌트·풀이)만 보이고, 튜터 질문 탭은 숨겨집니다. Claude API는 Claude 앱 구독과 별도로 유료 크레딧이 필요합니다.

### 개발 모드 (코드 수정 시 자동 반영)

터미널 두 개를 엽니다.

```powershell
npm run dev:server   # 터미널 1: Express 서버 (3001)
npm run dev          # 터미널 2: Vite 개발 서버 (5173), /api 요청은 3001로 전달
```

## 웹 버전 (GitHub Pages)

노트북을 켜지 않아도 휴대폰·다른 PC에서 쓸 수 있는 웹 버전입니다. 서버 없이 문제 생성, 채점, 풀이, 학습 현황을 모두 브라우저 안에서 처리합니다.

- 주소: `https://202211357-coder.github.io/tutor-app/`
- `main` 브랜치에 push되면 `.github/workflows/pages.yml`이 테스트 후 자동으로 배포합니다. Actions 탭에서 수동으로 실행할 수도 있습니다.
- 처음 한 번만 설정이 필요합니다.
  1. 무료 계정은 공개 저장소에서만 Pages를 쓸 수 있습니다. 저장소 Settings → General → Danger Zone → Change visibility에서 Public으로 바꿉니다.
  2. Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
- PC 버전과 다른 점
  - AI 질문 탭이 없습니다(API 키를 웹에 둘 수 없기 때문).
  - 학습 기록은 기기·브라우저마다 따로 저장됩니다(localStorage). 브라우저 사이트 데이터를 지우면 기록도 지워집니다.
  - 정답 계산 코드가 페이지에 포함되므로, 마음먹으면 정답을 볼 수 있습니다. 혼자 공부하는 용도를 전제로 합니다.
- 로컬에서 미리 보기: `npm run build:pages` 후 `npx vite preview --mode pages` → `http://localhost:4173/tutor-app/`

## 테스트

```powershell
npm test
```

Claude API는 실제로 호출하지 않습니다. 호출부(`client.beta.messages.create`)와 `fetch`는 모두 mock으로 대체합니다.

| 파일 | 검증 내용 |
|---|---|
| `shared/subjects.test.js` | 과목별·모드별 시스템 프롬프트 분기, 잘못된 과목/모드 거부 |
| `shared/units.test.js` | 답안 숫자·단위 파싱, 단위 환산, m/M 접두어 혼동 방지 |
| `shared/grading.test.js` | 빈 답안, 부분 점수 경계(1%·5%), 단위가 다른 답안, 단위 누락, 차원 불일치, 무차원·백분율 답안 |
| `shared/problems.test.js` | 모든 문제(기본 숫자 + 무작위 변형 40여 가지)의 정답을 독립 공식으로 검산, 수치 조합의 다양성, 변형 문제의 물리적 가정, 같은 seed의 재현성, 힌트에 정답 미노출 |
| `shared/imagePolicy.test.js` | 확장자·MIME·용량·매직 넘버 검사 |
| `server/tutorService.test.js` | Claude 요청 구성(과목 프롬프트, 이미지 블록, 이력), 거절·잘림 처리, SDK 오류 변환 |
| `server/app.test.js` | API 라우트: 업로드 예외(415/413/400), 입력 검증, 오류 응답 형식, 설정·풀이·학습 기록 API |
| `server/historyStore.test.js` | 기록 파일 저장·재시작 후 유지, 깨진 파일 보관 후 복구, 최대 개수, 원자적 쓰기 |
| `shared/historySummary.test.js` | 과목별 진도·최고 점수, 다시 풀어 볼 문제 정렬, 최근 기록, 삭제된 문제 처리 |
| `server/openBrowser.test.js` | 운영체제별 브라우저 실행 명령, 실행 실패 시 서버 유지 |
| `src/lib/teacher.test.js` | 과목별 오늘의 강의 노트(과목마다 10개 이상, 중복 없음, 하루 동안 고정), 점수별 튜터 코멘트(존댓말 평서형), 채점 표시, 변형 문제 seed 범위 |
| `src/lib/variants.test.js` | 새 수치로 풀기: 지금·최근 10개와 같은 수치면 다시 뽑기, 시도 횟수 제한, 오류 전달 |
| `src/lib/problemCache.test.js` | 과목별 문제 목록 미리 받기·재사용, 실패 시 재시도 |
| `src/lib/api.test.js` | 클라이언트 업로드: 전송 전 검증, 네트워크 실패, 서버 오류 응답 처리 |
| `src/lib/localApi.test.js` | 웹 버전 API: 과목·문제·변형·풀이·채점·학습 현황·오류 코드가 서버 응답과 같은지, 기록 유지·삭제, 저장 실패 시 채점 유지 |
| `src/lib/browserHistory.test.js` | 브라우저 기록 저장: 키·버전, 최대 개수, 잘못된 항목 건너뛰기, 깨진 기록 보관, 저장소 접근 불가 처리 |

## 구조

```
shared/        프론트·서버 공용 순수 로직 (과목 프롬프트, 단위, 채점, 이미지 정책, 문제 데이터, 학습 기록 목록·요약)
server/        Express 앱(app.js), Claude 호출부(tutorService.js), 기록 파일 저장(historyStore.js), 진입점(index.js)
src/           React UI (App.jsx, components/)
src/lib/       API 선택(client.js): PC 버전은 서버 API(api.js), 웹 버전은 브라우저 내 처리(localApi.js, browserHistory.js)
```

## 환경 변수

| 이름 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 튜터 질문에 필요 | Claude API 키. 서버에서만 읽고 브라우저로 보내지 않습니다. |
| `PORT` | 선택 | 서버 포트 (기본 3001) |
| `CLAUDE_MODEL` | 선택 | 모델 ID (기본 `claude-opus-5-5`) |
