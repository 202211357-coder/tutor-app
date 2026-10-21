import { createAttemptLog, isValidAttempt, MAX_ATTEMPTS } from '../../shared/attemptLog.js';

// 웹 버전(GitHub Pages)의 학습 기록. 서버가 없으므로 이 기기 브라우저의 localStorage에 저장한다.
// github.io 주소는 같은 계정의 다른 Pages 사이트와 저장소를 공유하므로 앱 이름을 키 앞에 붙인다.
export const HISTORY_KEY = 'tutor-app:history';
const STORAGE_VERSION = 1;

/** 사생활 보호 모드 등에서는 localStorage에 접근하기만 해도 예외가 날 수 있다. */
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {{storage?: Storage | null, key?: string, now?: () => Date, maxAttempts?: number, log?: (msg: string) => void}} [options]
 *   저장소를 쓸 수 없으면 이번 방문 동안만 메모리에 기록하고, 채점 응답에 recorded: false가 실린다.
 */
export function createBrowserHistory({
  storage = defaultStorage(),
  key = HISTORY_KEY,
  now = () => new Date(),
  maxAttempts = MAX_ATTEMPTS,
  log = console.warn,
} = {}) {
  return createAttemptLog({
    load: () => load(storage, key, log),
    save: (attempts) => {
      if (!storage) throw new Error('브라우저 저장소를 사용할 수 없습니다.');
      storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, attempts }));
    },
    now,
    maxAttempts,
  });
}

function load(storage, key, log) {
  let raw = null;
  try {
    raw = storage?.getItem(key) ?? null;
  } catch {
    return [];
  }
  if (raw === null) return [];
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data?.attempts)) return data.attempts.filter(isValidAttempt);
    throw new Error('attempts 배열이 없습니다.');
  } catch (error) {
    // 깨진 기록은 지우지 않고 다른 키에 보관한 뒤 새로 시작한다.
    try {
      storage.setItem(`${key}.broken-${Date.now()}`, raw);
      storage.removeItem(key);
    } catch {
      // 보관에 실패해도 앱은 계속 동작해야 한다.
    }
    log(`[tutor-app] 학습 기록을 읽을 수 없어 새로 시작합니다. (${error.message})`);
    return [];
  }
}
