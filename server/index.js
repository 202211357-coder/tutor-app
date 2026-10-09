import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { createApp } from './app.js';
import { createTutorService, DEFAULT_MODEL } from './tutorService.js';

// .env가 있으면 읽는다 (Node 20.12+). 없으면 시스템 환경 변수를 그대로 쓴다.
try {
  process.loadEnvFile();
} catch {
  // .env 파일이 없는 경우
}

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3001;
const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

let client = null;
if (process.env.ANTHROPIC_API_KEY) {
  client = new Anthropic();
} else {
  console.warn('[tutor-app] ANTHROPIC_API_KEY가 없습니다. 튜터 질문 기능은 503을 반환합니다. (.env.example 참고)');
}

const app = createApp({
  tutorService: createTutorService({ client, model }),
  staticDir: path.join(here, '..', 'dist'),
});

app.listen(port, () => {
  console.log(`[tutor-app] http://localhost:${port} (model: ${model})`);
});
