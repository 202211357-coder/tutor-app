// 문제 템플릿 공용 도구: 난수, 수치 범위 뽑기, 표시용 숫자, 소문항 생성.

export const G = 9.81;
export const DEG = Math.PI / 180;

/** seed 기반 의사난수 (mulberry32). 0~1 사이 값을 돌려준다. */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rng, values) => values[Math.floor(rng() * values.length)];

/** min~max 사이에서 step 간격의 값을 고른다 (부동소수점 꼬리 없이 step의 자릿수로 반올림). */
export const range = (rng, min, max, step) => {
  const count = Math.round((max - min) / step);
  const k = Math.floor(rng() * (count + 1));
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((min + k * step).toFixed(decimals));
};

const SUPERSCRIPT = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** 풀이·정답 표시용 숫자 (유효숫자 sig자리, 아주 크거나 작으면 × 10ⁿ 표기) */
export function fmt(x, sig = 4) {
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e6 || abs < 1e-3) {
    let exp = Math.floor(Math.log10(abs));
    let mantissa = Number((x / 10 ** exp).toPrecision(sig));
    if (Math.abs(mantissa) >= 10) {
      mantissa /= 10;
      exp += 1;
    }
    const sup = String(exp)
      .split('')
      .map((c) => SUPERSCRIPT[c])
      .join('');
    return `${mantissa} × 10${sup}`;
  }
  return String(Number(x.toPrecision(sig)));
}

export const part = (label, prompt, value, unit, points) => ({ label, prompt, answer: unit ? { value, unit } : { value }, points });

/**
 * 표준 규격 선택 소문항. 목록에서 고르는 값이므로 정확히 같은 값만 정답이고, 근사값 부분 점수는 없다.
 * (3.5 cm처럼 단위만 바꿔 쓴 같은 값은 정답)
 */
export const select = (label, prompt, value, unit, points) => ({
  ...part(label, prompt, value, unit, points),
  tolerance: 1e-6,
  partialTolerance: 1e-6,
  wrongFeedback: '선택한 규격이 맞지 않습니다. 계산한 필요값 이상인 규격 중 가장 작은 것을 고르세요.',
});

/** 오름차순 목록에서 need 이상인 가장 작은 값 (없으면 undefined) */
export const smallestAtLeast = (list, need) => list.find((x) => x >= need);

/**
 * 필요값이 어떤 규격값과도 gap(상대) 이상 떨어져 있는지.
 * 필요값이 규격값에 아주 가까우면 반올림 방식에 따라 선택이 갈리므로, 그런 수치는 출제하지 않는다.
 */
export const clearOf = (list, need, gap = 0.01) => list.every((x) => Math.abs(x - need) / x >= gap);
