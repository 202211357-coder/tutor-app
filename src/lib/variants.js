import { randomSeed } from './teacher.js';

/** 두 문제가 화면상 같은 수치인지 (문장과 소문항 질문이 모두 같으면 같은 문제로 본다) */
export function sameNumbers(a, b) {
  return (
    a.statement === b.statement &&
    a.parts.length === b.parts.length &&
    a.parts.every((p, i) => p.prompt === b.parts[i].prompt)
  );
}

/**
 * 지금 보이는 문제와 수치가 다른 변형 문제를 받아 온다.
 * 수치 조합이 적은 문제는 무작위 seed가 같은 수치를 낼 수 있어(최대 약 20%), 같으면 다시 뽑는다.
 * @param {(problemId: string, seed: number) => Promise<object>} fetchVariant
 * @param {object} current 지금 보이는 문제
 * @param {{attempts?: number, nextSeed?: () => number}} [options]
 */
export async function fetchDifferentVariant(fetchVariant, current, { attempts = 8, nextSeed = randomSeed } = {}) {
  let candidate = null;
  for (let i = 0; i < attempts; i++) {
    candidate = await fetchVariant(current.id, nextSeed());
    if (!sameNumbers(candidate, current)) return candidate;
  }
  // 조합이 하나뿐인 극단적인 경우: 마지막 결과를 그대로 쓴다.
  return candidate;
}
