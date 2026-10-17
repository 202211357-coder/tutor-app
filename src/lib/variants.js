import { randomSeed } from './teacher.js';

/** 두 문제가 화면상 같은 수치인지 (문장과 소문항 질문이 모두 같으면 같은 문제로 본다) */
export function sameNumbers(a, b) {
  return (
    a.statement === b.statement &&
    a.parts.length === b.parts.length &&
    a.parts.every((p, i) => p.prompt === b.parts[i].prompt)
  );
}

/** 카드마다 기억하는 최근 문제 수 (이 안에서는 같은 수치가 다시 나오지 않는다) */
export const RECENT_LIMIT = 10;

/**
 * 지금 보이는 문제, 그리고 최근에 보여 준 문제들과 수치가 다른 변형 문제를 받아 온다.
 * @param {(problemId: string, seed: number) => Promise<object>} fetchVariant
 * @param {object} current 지금 보이는 문제
 * @param {{recent?: object[], attempts?: number, nextSeed?: () => number}} [options]
 */
export async function fetchDifferentVariant(fetchVariant, current, { recent = [], attempts = 8, nextSeed = randomSeed } = {}) {
  const avoid = [current, ...recent];
  let candidate = null;
  for (let i = 0; i < attempts; i++) {
    candidate = await fetchVariant(current.id, nextSeed());
    if (!avoid.some((p) => sameNumbers(candidate, p))) return candidate;
  }
  // 시도 횟수를 다 쓴 극단적인 경우: 마지막 결과를 그대로 쓴다 (무한 반복 방지).
  return candidate;
}

/** 최근 목록에 문제를 추가하고 최대 개수를 넘으면 오래된 것부터 버린다. */
export function rememberRecent(recent, problem, limit = RECENT_LIMIT) {
  return [...recent.filter((p) => !sameNumbers(p, problem)), problem].slice(-limit);
}
