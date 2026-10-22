// 문제 세트: 설계 대상이 많은 과목(기계설계)에서 무작위로 고른 몇 개의 대상만 출제한다.

/**
 * 서로 다른 문제 id를 size개 고른다. 화면 순서는 원래 목록 순서(나사 → 스프링)를 따른다.
 * 고를 수 있는 문제가 size개보다 많으면, 직전 세트와 완전히 같은 조합은 피한다.
 * @param {string[]} ids 전체 문제 id (목록 순서)
 * @param {number} size
 * @param {string[]} [previous] 직전 세트
 * @param {() => number} [random]
 */
export function pickProblemSet(ids, size, previous = [], random = Math.random) {
  const count = Math.min(size, ids.length);
  let chosen = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    // 부분 Fisher–Yates: 앞에서부터 count개 자리에 무작위 원소를 가져온다.
    const pool = [...ids];
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    chosen = ids.filter((id) => pool.slice(0, count).includes(id));
    if (ids.length <= count || !sameSet(chosen, previous)) break;
  }
  return chosen;
}

function sameSet(a, b) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export const KIND_FILTERS = Object.freeze([
  { id: 'mixed', label: '섞어서' },
  { id: 'calc', label: '계산형' },
  { id: 'design', label: '설계형' },
]);

/**
 * 설계 대상(topic) size개를 고르고, 대상마다 문항 유형 조건에 맞는 문제를 하나씩 고른다.
 * @param {Array<{id: string, topic: string, kind?: string}>} problems 과목의 전체 문제 (목록 순서)
 * @param {number} size
 * @param {{previous?: string[], kind?: string, random?: () => number}} [options]
 *   previous: 직전 세트의 문제 id (같은 대상 조합을 연달아 내지 않기 위함)
 * @returns {string[]} 문제 id
 */
export function pickProblemsByTopic(problems, size, { previous = [], kind = 'mixed', random = Math.random } = {}) {
  const candidates = kind === 'mixed' ? problems : problems.filter((p) => (p.kind ?? 'calc') === kind);
  const topics = [...new Set(candidates.map((p) => p.topic))];
  const previousTopics = problems.filter((p) => previous.includes(p.id)).map((p) => p.topic);
  return pickProblemSet(topics, size, previousTopics, random).map((topic) => {
    const options = candidates.filter((p) => p.topic === topic);
    return options[Math.floor(random() * options.length)].id;
  });
}
