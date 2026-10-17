import fs from 'node:fs';
import path from 'node:path';
import { createAttemptLog, isValidAttempt, MAX_ATTEMPTS } from '../shared/attemptLog.js';

export { MAX_ATTEMPTS };

// 채점 기록 저장소. 이 앱은 한 사람이 자기 PC에서 쓰므로 DB 대신 JSON 파일 하나에 저장한다.
const FILE_VERSION = 1;

/**
 * @param {{filePath?: string | null, now?: () => Date, maxAttempts?: number, log?: (msg: string) => void}} [options]
 *   filePath를 생략하면 메모리에만 저장한다(테스트·임시 실행용).
 */
export function createHistoryStore({ filePath = null, now = () => new Date(), maxAttempts = MAX_ATTEMPTS, log = console.warn } = {}) {
  if (!filePath) return createAttemptLog({ now, maxAttempts });

  return createAttemptLog({
    load: () => load(filePath, log),
    save: (attempts) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      // 쓰는 도중 꺼져도 기존 파일이 깨지지 않도록 임시 파일에 쓴 뒤 교체한다.
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: FILE_VERSION, attempts }, null, 2));
      fs.renameSync(tmp, filePath);
    },
    now,
    maxAttempts,
  });
}

function load(filePath, log) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data?.attempts)) return data.attempts.filter(isValidAttempt);
    throw new Error('attempts 배열이 없습니다.');
  } catch (error) {
    // 파일이 깨졌으면 지우지 않고 옆에 보관한 뒤 새로 시작한다. (기록을 직접 복구할 수 있도록)
    const backup = `${filePath}.broken-${Date.now()}`;
    fs.renameSync(filePath, backup);
    log(`[tutor-app] 학습 기록 파일을 읽을 수 없어 ${path.basename(backup)}로 옮기고 새로 시작합니다. (${error.message})`);
    return [];
  }
}
