import { describe, expect, it, vi } from 'vitest';
import { createBrowserHistory, HISTORY_KEY } from './browserHistory.js';

const now = () => new Date('2026-10-17T09:00:00Z');
const attempt = { problemId: 'statics-cantilever', subjectId: 'statics', earned: 7, max: 10, percent: 70, answers: { '(a)': '3 kN' } };

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('createBrowserHistory', () => {
  it('앱 이름이 붙은 키에 버전과 함께 저장한다', () => {
    const storage = memoryStorage();
    createBrowserHistory({ storage, now }).record(attempt);
    expect(HISTORY_KEY).toMatch(/^tutor-app:/);
    expect(JSON.parse(storage.getItem(HISTORY_KEY))).toEqual({
      version: 1,
      attempts: [{ ...attempt, seed: 0, at: '2026-10-17T09:00:00.000Z' }],
    });
  });

  it('최대 개수를 넘으면 오래된 기록부터 버린다', () => {
    const history = createBrowserHistory({ storage: memoryStorage(), now, maxAttempts: 3 });
    for (let i = 0; i < 5; i++) history.record({ ...attempt, earned: i });
    expect(history.list().map((a) => a.earned)).toEqual([2, 3, 4]);
  });

  it('형식이 맞지 않는 항목은 건너뛴다', () => {
    const good = { ...attempt, seed: 0, at: '2026-10-01T00:00:00.000Z' };
    const storage = memoryStorage({ [HISTORY_KEY]: JSON.stringify({ version: 1, attempts: [good, { problemId: 3 }] }) });
    expect(createBrowserHistory({ storage, now }).list()).toEqual([good]);
  });

  it('깨진 기록은 다른 키에 보관하고 새로 시작한다', () => {
    const storage = memoryStorage({ [HISTORY_KEY]: '{not json' });
    const log = vi.fn();
    const history = createBrowserHistory({ storage, now, log });
    expect(history.list()).toEqual([]);
    expect(storage.getItem(HISTORY_KEY)).toBeNull();
    const backups = [...storage.map.keys()].filter((k) => k.startsWith(`${HISTORY_KEY}.broken-`));
    expect(backups).toHaveLength(1);
    expect(storage.getItem(backups[0])).toBe('{not json');
    expect(log).toHaveBeenCalledOnce();
  });

  it('저장소에 접근할 수 없으면(사생활 보호 모드 등) 빈 기록으로 시작하고, 기록할 때 오류를 알린다', () => {
    const storage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {},
    };
    const history = createBrowserHistory({ storage, now });
    expect(history.list()).toEqual([]);
    expect(() => history.record(attempt)).toThrow('SecurityError');
  });

  it('저장소가 아예 없으면 기록할 때 오류를 알린다', () => {
    const history = createBrowserHistory({ storage: null, now });
    expect(history.list()).toEqual([]);
    expect(() => history.record(attempt)).toThrow();
  });
});
