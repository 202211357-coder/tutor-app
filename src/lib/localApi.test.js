import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../server/app.js';
import { createHistoryStore } from '../../server/historyStore.js';
import { getProblemInstance, getSolution } from '../../shared/problems.js';
import { SUBJECTS } from '../../shared/subjects.js';
import { createBrowserHistory } from './browserHistory.js';
import { createLocalApi } from './localApi.js';

const now = () => new Date('2026-10-17T09:00:00Z');

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

// 같은 조건의 서버(메모리 기록)와 웹 버전 API를 나란히 만든다.
function pair() {
  const app = createApp({
    tutorService: { isConfigured: false, ask: vi.fn() },
    historyStore: createHistoryStore({ now }),
  });
  const local = createLocalApi({ history: createBrowserHistory({ storage: memoryStorage(), now }) });
  return { server: request(app), local };
}

/** 모든 소문항에 정답(유효숫자 4자리 + 단위)을 적은 답안 */
function correctAnswers(problemId, seed) {
  const { answers } = getSolution(getProblemInstance(problemId, seed));
  return Object.fromEntries(answers.map((a) => [a.label, `${a.display} ${a.unit}`.replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, superToNumber)]));
}
function superToNumber(s) {
  const map = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9, '⁻': '-' };
  return [...s].map((c) => map[c]).join('');
}

describe('createLocalApi: 서버 API와 같은 응답', () => {
  it('과목 목록과 과목별 문제 목록', async () => {
    const { server, local } = pair();
    expect(await local.fetchSubjects()).toEqual((await server.get('/api/subjects')).body);
    for (const { id } of SUBJECTS) {
      expect(await local.fetchProblems(id)).toEqual((await server.get(`/api/problems?subject=${id}`)).body);
    }
  });

  it.each([0, 1, 42, 987654])('변형 문제와 풀이 (seed %i)', async (seed) => {
    const { server, local } = pair();
    for (const id of ['statics-cantilever', 'fluid-hydrostatic-pressure', 'thermo-otto-cycle']) {
      expect(await local.fetchProblemVariant(id, seed)).toEqual((await server.get(`/api/problems/${id}?seed=${seed}`)).body);
      expect(await local.fetchSolution(id, seed)).toEqual((await server.get(`/api/problems/${id}/solution?seed=${seed}`)).body);
    }
  });

  it('문제 목록·변형 문제에는 정답과 풀이가 없다', async () => {
    const { local } = pair();
    const variant = await local.fetchProblemVariant('statics-cantilever', 7);
    expect(JSON.stringify(variant)).not.toMatch(/"(answer|solution|params)"/);
  });

  it('채점 결과와 학습 현황이 서버와 같다', async () => {
    const { server, local } = pair();
    const attempts = [
      ['statics-cantilever', 0, correctAnswers('statics-cantilever', 0)],
      ['statics-cantilever', 5, { '(a)': '1 kN' }],
      ['fluid-hydrostatic-pressure', 3, correctAnswers('fluid-hydrostatic-pressure', 3)],
      ['thermo-otto-cycle', 0, {}],
    ];
    for (const [problemId, seed, answers] of attempts) {
      const fromServer = (await server.post('/api/grade').send({ problemId, answers, seed })).body;
      expect(await local.gradeAnswers(problemId, answers, seed)).toEqual(fromServer);
    }
    const summary = await local.fetchHistory();
    expect(summary).toEqual((await server.get('/api/history')).body);
    expect(summary.totalAttempts).toBe(attempts.length);
  });

  it('정답을 적으면 만점이다 (웹 버전에서도 단위 환산 채점)', async () => {
    const { local } = pair();
    const result = await local.gradeAnswers('fluid-hydrostatic-pressure', correctAnswers('fluid-hydrostatic-pressure', 11), 11);
    expect(result).toMatchObject({ percent: 100, recorded: true });
  });

  it.each([
    ['잘못된 seed', (api) => api.fetchProblemVariant('statics-cantilever', -1), '/api/problems/statics-cantilever?seed=-1', 'BAD_SEED', 400],
    ['없는 문제', (api) => api.fetchSolution('no-such-problem', 0), '/api/problems/no-such-problem/solution', 'UNKNOWN_PROBLEM', 404],
  ])('오류 코드도 같다: %s', async (_name, call, path, code, status) => {
    const { server, local } = pair();
    const res = await server.get(path);
    expect(res.status).toBe(status);
    expect(res.body.code).toBe(code);
    await expect(call(local)).rejects.toMatchObject({ code, status, message: res.body.message });
  });

  it('answers 형식이 틀리면 BAD_ANSWERS', async () => {
    const { server, local } = pair();
    const res = await server.post('/api/grade').send({ problemId: 'statics-cantilever', answers: ['x'] });
    await expect(local.gradeAnswers('statics-cantilever', ['x'])).rejects.toMatchObject({ code: res.body.code, status: res.status });
  });
});

describe('createLocalApi: 웹 버전 동작', () => {
  it('AI 질문 탭은 숨기고 웹 버전임을 알린다', async () => {
    const { local } = pair();
    expect(await local.fetchConfig()).toEqual({ tutorEnabled: false, edition: 'web' });
    await expect(local.askTutor({ subjectId: 'statics', mode: 'hint', question: '?' })).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    });
  });

  it('기록은 저장소에 남아 페이지를 새로 열어도 유지되고, 지우면 사라진다', async () => {
    const storage = memoryStorage();
    const first = createLocalApi({ history: createBrowserHistory({ storage, now }) });
    await first.gradeAnswers('statics-cantilever', {}, 0);
    const reopened = createLocalApi({ history: createBrowserHistory({ storage, now }) });
    expect((await reopened.fetchHistory()).totalAttempts).toBe(1);
    await reopened.clearHistory();
    const again = createLocalApi({ history: createBrowserHistory({ storage, now }) });
    expect((await again.fetchHistory()).totalAttempts).toBe(0);
  });

  it('저장소에 쓸 수 없어도 채점 결과는 돌려주고 recorded: false를 알린다', async () => {
    const storage = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError'); } };
    const local = createLocalApi({ history: createBrowserHistory({ storage, now }) });
    expect(await local.gradeAnswers('statics-cantilever', {}, 0)).toMatchObject({ percent: 0, recorded: false });
  });

  it('반환값을 고쳐도 다음 응답에 영향이 없다', async () => {
    const { local } = pair();
    const list = await local.fetchProblems('statics');
    list[0].title = '변조';
    expect((await local.fetchProblems('statics'))[0].title).not.toBe('변조');
  });
});
