import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoryStore } from './historyStore.js';

let dir;
let filePath;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tutor-history-'));
  filePath = path.join(dir, 'data', 'history.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const attempt = (overrides = {}) => ({
  problemId: 'statics-cantilever',
  subjectId: 'statics',
  earned: 7,
  max: 10,
  percent: 70,
  answers: { '(a)': '3 kN' },
  ...overrides,
});

const fixedNow = () => new Date('2026-10-17T09:00:00Z');

describe('createHistoryStore (파일 저장)', () => {
  it('파일이 없으면 빈 기록으로 시작하고, 기록하면 폴더와 파일을 만든다', () => {
    const store = createHistoryStore({ filePath, now: fixedNow });
    expect(store.list()).toEqual([]);
    store.record(attempt());
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('기록 시각을 붙여 저장한다', () => {
    const store = createHistoryStore({ filePath, now: fixedNow });
    expect(store.record(attempt()).at).toBe('2026-10-17T09:00:00.000Z');
  });

  it('서버를 다시 켜도(새 인스턴스) 기록이 남아 있다', () => {
    createHistoryStore({ filePath, now: fixedNow }).record(attempt());
    createHistoryStore({ filePath, now: fixedNow }).record(attempt({ percent: 100, earned: 10 }));
    const reloaded = createHistoryStore({ filePath });
    expect(reloaded.list().map((a) => a.percent)).toEqual([70, 100]);
  });

  it('임시 파일을 남기지 않는다 (임시 파일에 쓴 뒤 교체)', () => {
    createHistoryStore({ filePath }).record(attempt());
    expect(fs.readdirSync(path.dirname(filePath))).toEqual(['history.json']);
  });

  it('clear()는 파일 내용까지 비운다', () => {
    const store = createHistoryStore({ filePath });
    store.record(attempt());
    store.clear();
    expect(createHistoryStore({ filePath }).list()).toEqual([]);
  });

  it('최대 개수를 넘으면 오래된 기록부터 버린다', () => {
    const store = createHistoryStore({ filePath, maxAttempts: 3 });
    for (const percent of [10, 20, 30, 40, 50]) store.record(attempt({ percent }));
    expect(store.list().map((a) => a.percent)).toEqual([30, 40, 50]);
  });

  it('list()가 돌려준 값을 수정해도 저장된 기록은 바뀌지 않는다', () => {
    const store = createHistoryStore({ filePath });
    store.record(attempt());
    const copy = store.list();
    copy[0].answers['(a)'] = '변조';
    copy.push(attempt());
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].answers['(a)']).toBe('3 kN');
  });

  it('record()에 넘긴 answers 객체를 나중에 바꿔도 기록은 바뀌지 않는다', () => {
    const store = createHistoryStore({ filePath });
    const answers = { '(a)': '3 kN' };
    store.record(attempt({ answers }));
    answers['(a)'] = '변조';
    expect(store.list()[0].answers['(a)']).toBe('3 kN');
  });
});

describe('createHistoryStore (깨진 파일)', () => {
  it('JSON이 깨졌으면 지우지 않고 .broken 파일로 보관한 뒤 새로 시작한다', () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '{ not json');
    const log = vi.fn();
    const store = createHistoryStore({ filePath, log });
    expect(store.list()).toEqual([]);
    const files = fs.readdirSync(path.dirname(filePath));
    expect(files.some((f) => f.startsWith('history.json.broken-'))).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('새로 시작'));
  });

  it('형식이 맞지 않는 항목만 걸러 내고 나머지는 살린다', () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ version: 1, attempts: [{ ...attempt(), at: '2026-10-01T00:00:00Z' }, { problemId: 1 }, null] }),
    );
    expect(createHistoryStore({ filePath }).list()).toHaveLength(1);
  });

  it('attempts 배열이 없으면 깨진 파일로 취급한다', () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ hello: 'world' }));
    expect(createHistoryStore({ filePath, log: vi.fn() }).list()).toEqual([]);
  });
});

describe('createHistoryStore (메모리 모드)', () => {
  it('filePath 없이 만들면 파일을 쓰지 않는다', () => {
    const store = createHistoryStore();
    store.record(attempt());
    expect(store.list()).toHaveLength(1);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
