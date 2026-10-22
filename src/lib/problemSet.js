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
