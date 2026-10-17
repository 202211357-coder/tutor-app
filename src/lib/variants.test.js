import { describe, expect, it, vi } from 'vitest';
import { fetchDifferentVariant, sameNumbers } from './variants.js';

const problem = (statement, prompts = ['(a) F'], seed = 0) => ({
  id: 'p1',
  seed,
  statement,
  parts: prompts.map((prompt, i) => ({ label: `(${i})`, prompt })),
});

describe('sameNumbers', () => {
  it('문장과 소문항 질문이 모두 같아야 같은 문제', () => {
    expect(sameNumbers(problem('L = 4 m'), problem('L = 4 m'))).toBe(true);
    expect(sameNumbers(problem('L = 4 m'), problem('L = 5 m'))).toBe(false);
    // 문장은 같고 소문항 수치만 다른 경우 (예: 케이블 각도)
    expect(sameNumbers(problem('W = 1000 N', ['θ = 30°']), problem('W = 1000 N', ['θ = 25°']))).toBe(false);
  });
});

describe('fetchDifferentVariant', () => {
  it('처음 받은 변형이 다르면 그대로 쓴다', async () => {
    const fetchVariant = vi.fn(async (id, seed) => problem('L = 6 m', ['(a) F'], seed));
    const next = await fetchDifferentVariant(fetchVariant, problem('L = 4 m'), { nextSeed: () => 7 });
    expect(next.statement).toBe('L = 6 m');
    expect(fetchVariant).toHaveBeenCalledTimes(1);
    expect(fetchVariant).toHaveBeenCalledWith('p1', 7);
  });

  it('지금과 같은 수치가 나오면 다른 seed로 다시 받는다', async () => {
    const results = ['L = 4 m', 'L = 4 m', 'L = 8 m'];
    const fetchVariant = vi.fn(async (id, seed) => problem(results.shift(), ['(a) F'], seed));
    let s = 0;
    const next = await fetchDifferentVariant(fetchVariant, problem('L = 4 m'), { nextSeed: () => ++s });
    expect(next).toMatchObject({ statement: 'L = 8 m', seed: 3 });
    expect(fetchVariant.mock.calls.map((c) => c[1])).toEqual([1, 2, 3]);
  });

  it('시도 횟수를 다 써도 같으면 마지막 결과를 돌려준다 (무한 반복 없음)', async () => {
    const fetchVariant = vi.fn(async () => problem('L = 4 m'));
    const next = await fetchDifferentVariant(fetchVariant, problem('L = 4 m'), { attempts: 3 });
    expect(fetchVariant).toHaveBeenCalledTimes(3);
    expect(next.statement).toBe('L = 4 m');
  });

  it('요청이 실패하면 오류를 그대로 전달한다', async () => {
    const fetchVariant = vi.fn(async () => {
      throw new Error('NETWORK');
    });
    await expect(fetchDifferentVariant(fetchVariant, problem('L = 4 m'))).rejects.toThrow('NETWORK');
  });
});
