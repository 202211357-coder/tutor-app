import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProblemCache, getProblems, peekProblems, prefetchProblems } from './problemCache.js';

beforeEach(clearProblemCache);

describe('problemCache', () => {
  it('같은 과목은 한 번만 요청한다', async () => {
    const fetchProblems = vi.fn(async (id) => [{ id: `${id}-1` }]);
    const [a, b] = await Promise.all([getProblems('statics', fetchProblems), getProblems('statics', fetchProblems)]);
    expect(a).toBe(b);
    expect(fetchProblems).toHaveBeenCalledTimes(1);
  });

  it('미리 받아 둔 과목은 나중에 요청 없이 바로 쓴다', async () => {
    const fetchProblems = vi.fn(async (id) => [{ id }]);
    prefetchProblems(['statics', 'dynamics'], fetchProblems);
    expect(fetchProblems).toHaveBeenCalledTimes(2);
    expect(await getProblems('dynamics', fetchProblems)).toEqual([{ id: 'dynamics' }]);
    expect(fetchProblems).toHaveBeenCalledTimes(2);
  });

  it('peekProblems: 도착 전에는 null, 도착 후에는 목록을 동기적으로 돌려준다', async () => {
    const fetchProblems = vi.fn(async (id) => [{ id }]);
    const pending = getProblems('statics', fetchProblems);
    expect(peekProblems('statics')).toBeNull();
    await pending;
    expect(peekProblems('statics')).toEqual([{ id: 'statics' }]);
  });

  it('실패한 요청은 저장하지 않아 다음에 다시 시도한다', async () => {
    const fetchProblems = vi
      .fn()
      .mockRejectedValueOnce(new Error('NETWORK'))
      .mockResolvedValueOnce([{ id: 'ok' }]);
    await expect(getProblems('statics', fetchProblems)).rejects.toThrow('NETWORK');
    expect(await getProblems('statics', fetchProblems)).toEqual([{ id: 'ok' }]);
  });

  it('미리 받기가 실패해도 처리되지 않은 오류를 남기지 않는다', async () => {
    const fetchProblems = vi.fn(async () => {
      throw new Error('NETWORK');
    });
    expect(() => prefetchProblems(['statics'], fetchProblems)).not.toThrow();
    await Promise.resolve();
  });
});
