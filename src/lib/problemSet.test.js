import { describe, expect, it } from 'vitest';
import { pickProblemSet, pickProblemsByTopic } from './problemSet.js';

const IDS = ['나사', '볼트', '리벳', '키', '축', '축이음', '베어링', '마찰차', '기어', '벨트', '브레이크', '스프링'];

/** 정해진 순서의 값을 돌려주는 난수 (테스트 재현용) */
const sequence = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('pickProblemSet', () => {
  it('서로 다른 대상 5개를 원래 목록 순서로 고른다', () => {
    for (let trial = 0; trial < 200; trial++) {
      const set = pickProblemSet(IDS, 5);
      expect(set).toHaveLength(5);
      expect(new Set(set).size).toBe(5);
      expect(set).toEqual(IDS.filter((id) => set.includes(id)));
    }
  });

  it('여러 번 고르면 12개 대상이 모두 고르게 나온다', () => {
    const counts = Object.fromEntries(IDS.map((id) => [id, 0]));
    const trials = 6000;
    for (let i = 0; i < trials; i++) for (const id of pickProblemSet(IDS, 5)) counts[id] += 1;
    // 기대값 6000 × 5/12 = 2500회. 무작위 오차를 넉넉히 허용한다.
    for (const id of IDS) expect(counts[id], id).toBeGreaterThan(2200);
    for (const id of IDS) expect(counts[id], id).toBeLessThan(2800);
  });

  it('직전 세트와 똑같은 조합이 나오면 다시 고른다', () => {
    const random = sequence(0); // 항상 남은 것 중 첫 번째 → 처음 5개
    const first = pickProblemSet(IDS, 5, [], random);
    expect(first).toEqual(IDS.slice(0, 5));
    const again = pickProblemSet(IDS, 5, first, sequence(0, 0, 0, 0, 0, 0.99, 0, 0, 0, 0));
    expect(again).not.toEqual(first);
    expect(again).toHaveLength(5);
  });

  it('대상이 세트 크기보다 적으면 전부 낸다', () => {
    expect(pickProblemSet(['a', 'b', 'c'], 5, ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('pickProblemsByTopic', () => {
  const problems = IDS.flatMap((topic) => [
    { id: `${topic}-calc`, topic, kind: 'calc' },
    { id: `${topic}-design`, topic, kind: 'design' },
  ]);
  const byId = new Map(problems.map((p) => [p.id, p]));

  it('서로 다른 대상 5개에서 한 문제씩 고른다', () => {
    for (let trial = 0; trial < 200; trial++) {
      const ids = pickProblemsByTopic(problems, 5);
      expect(ids).toHaveLength(5);
      expect(new Set(ids.map((id) => byId.get(id).topic)).size).toBe(5);
    }
  });

  it.each(['calc', 'design'])('유형을 %s로 정하면 그 유형만 나온다', (kind) => {
    for (let trial = 0; trial < 100; trial++) {
      expect(pickProblemsByTopic(problems, 5, { kind }).every((id) => byId.get(id).kind === kind)).toBe(true);
    }
  });

  it('섞어서 고르면 계산형과 설계형이 모두 나온다', () => {
    const kinds = { calc: 0, design: 0 };
    for (let trial = 0; trial < 400; trial++) for (const id of pickProblemsByTopic(problems, 5)) kinds[byId.get(id).kind] += 1;
    expect(kinds.calc).toBeGreaterThan(800);
    expect(kinds.design).toBeGreaterThan(800);
  });

  it('직전 세트와 같은 대상 조합은 피한다', () => {
    const previous = ['나사-calc', '볼트-design', '리벳-calc', '키-calc', '축-design'];
    const random = sequence(0, 0, 0, 0, 0, 0.99, 0, 0, 0, 0, 0.5);
    const topics = pickProblemsByTopic(problems, 5, { previous, random }).map((id) => byId.get(id).topic);
    expect(topics).not.toEqual(['나사', '볼트', '리벳', '키', '축']);
  });

  it('유형 정보가 없는 문제는 계산형으로 본다', () => {
    const plain = [{ id: 'a', topic: 'x' }, { id: 'b', topic: 'y' }];
    expect(pickProblemsByTopic(plain, 5, { kind: 'calc' }).sort()).toEqual(['a', 'b']);
    expect(pickProblemsByTopic(plain, 5, { kind: 'design' })).toEqual([]);
  });
});
