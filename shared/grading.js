import { lookupUnit, parseQuantity, RATIO_UNIT } from './units.js';

// 상대오차 1% 이내 만점, 5% 이내(반올림·중간값 오차) 절반.
export const DEFAULT_TOLERANCE = 0.01;
export const DEFAULT_PARTIAL_TOLERANCE = 0.05;
export const PARTIAL_CREDIT_RATIO = 0.5;
// 기대값이 0일 때 상대오차를 쓸 수 없으므로 SI 기준 절대오차로 판정한다.
const ZERO_ABS_TOLERANCE = 1e-9;

export const GRADE_STATUS = Object.freeze({
  EMPTY: 'empty',
  INVALID: 'invalid',
  UNKNOWN_UNIT: 'unknown_unit',
  UNIT_MISMATCH: 'unit_mismatch',
  MISSING_UNIT: 'missing_unit',
  CORRECT: 'correct',
  CLOSE: 'close',
  WRONG: 'wrong',
});

// 1.01 vs 1 처럼 정확히 경계인 답안이 부동소수점 오차(0.010000000000000009)로
// 한 단계 낮게 채점되지 않도록, 허용오차 비교에 아주 작은 상대 여유를 둔다.
const BOUNDARY_SLACK = 1e-9;

function relativeError(actual, expected) {
  if (expected === 0) return Math.abs(actual) <= ZERO_ABS_TOLERANCE ? 0 : Infinity;
  return Math.abs(actual - expected) / Math.abs(expected);
}

function withinTolerance(error, tolerance) {
  return error <= tolerance * (1 + BOUNDARY_SLACK);
}

function result(status, ratio, maxPoints, feedback, extra = {}) {
  return { status, earned: ratio * maxPoints, max: maxPoints, feedback, ...extra };
}

/**
 * 소문항 하나를 채점한다.
 * @param {string|null|undefined} rawAnswer 학생 답안 문자열 (예: "12.5 kN")
 * @param {{answer: {value: number, unit?: string}, points?: number, tolerance?: number, partialTolerance?: number}} part
 */
export function gradePart(rawAnswer, part) {
  const maxPoints = part.points ?? 1;
  const tolerance = part.tolerance ?? DEFAULT_TOLERANCE;
  const partialTolerance = part.partialTolerance ?? DEFAULT_PARTIAL_TOLERANCE;
  const expectedUnitText = part.answer.unit ?? '';
  // 정답 단위가 없으면 무차원(비율). 이때 단위 없는 답안과 %로 쓴 답안을 모두 받는다.
  const expectedUnit = expectedUnitText ? lookupUnit(expectedUnitText) : RATIO_UNIT;
  if (!expectedUnit) {
    throw new Error(`문항 정답 단위를 해석할 수 없습니다: ${expectedUnitText}`);
  }

  if (rawAnswer == null || String(rawAnswer).trim() === '') {
    return result(GRADE_STATUS.EMPTY, 0, maxPoints, '답안이 비어 있습니다.');
  }

  const parsed = parseQuantity(String(rawAnswer));
  if (!parsed) {
    return result(GRADE_STATUS.INVALID, 0, maxPoints, '숫자로 시작하는 답안을 입력하세요. 예: 12.5 kN');
  }

  // 정답·답안을 같은 기준(차원별 SI 단위)으로 맞춘다.
  let actual;
  let expected;
  let unitMissing = false;
  if (parsed.unitText === '' && expectedUnit.dim !== 'ratio') {
    // 단위를 빠뜨린 답안은 정답 단위로 쓴 수치로 보고 비교한다.
    actual = parsed.value;
    expected = part.answer.value;
    unitMissing = true;
  } else {
    const answerUnit = parsed.unitText === '' ? RATIO_UNIT : lookupUnit(parsed.unitText);
    if (!answerUnit) {
      return result(GRADE_STATUS.UNKNOWN_UNIT, 0, maxPoints, `인식할 수 없는 단위입니다: "${parsed.unitText}"`);
    }
    if (answerUnit.dim !== expectedUnit.dim) {
      return result(
        GRADE_STATUS.UNIT_MISMATCH,
        0,
        maxPoints,
        `단위의 차원이 맞지 않습니다. (${parsed.unitText} ↔ ${expectedUnitText || '무차원'})`,
      );
    }
    actual = parsed.value * answerUnit.factor;
    expected = part.answer.value * expectedUnit.factor;
  }

  const error = relativeError(actual, expected);
  const extra = { relativeError: error };

  // 무차원 문항에 62.5처럼 백분율 수치만 쓴 경우: 단위 누락과 같은 기준으로 부분 점수.
  if (parsed.unitText === '' && expectedUnit.dim === 'ratio' && !withinTolerance(error, tolerance)) {
    const percentError = relativeError(actual / 100, expected);
    if (withinTolerance(percentError, tolerance)) {
      return result(
        GRADE_STATUS.MISSING_UNIT,
        PARTIAL_CREDIT_RATIO,
        maxPoints,
        '백분율로 쓴 값이라면 % 기호를 붙이세요. (예: 62.5%)',
        { relativeError: percentError },
      );
    }
  }

  if (unitMissing) {
    // 정답 단위 기준 수치는 맞지만 단위를 빠뜨린 경우: 부분 점수.
    if (withinTolerance(error, tolerance)) {
      return result(
        GRADE_STATUS.MISSING_UNIT,
        PARTIAL_CREDIT_RATIO,
        maxPoints,
        `수치는 맞지만 단위가 없습니다. 단위(${expectedUnitText})를 함께 쓰세요.`,
        extra,
      );
    }
    return result(GRADE_STATUS.WRONG, 0, maxPoints, `오답입니다. 단위(${expectedUnitText})도 함께 쓰세요.`, extra);
  }

  if (withinTolerance(error, tolerance)) return result(GRADE_STATUS.CORRECT, 1, maxPoints, '정답입니다.', extra);
  if (withinTolerance(error, partialTolerance)) {
    return result(
      GRADE_STATUS.CLOSE,
      PARTIAL_CREDIT_RATIO,
      maxPoints,
      '정답에 가깝습니다. 반올림이나 중간 계산 값을 확인하세요.',
      extra,
    );
  }
  return result(GRADE_STATUS.WRONG, 0, maxPoints, '오답입니다.', extra);
}

/**
 * 여러 소문항으로 된 문제를 채점한다.
 * @param {{parts: Array<{label: string}>}} problem
 * @param {Record<string, string>} answers 소문항 label → 답안 문자열
 */
export function gradeProblem(problem, answers = {}) {
  const parts = problem.parts.map((part) => ({
    label: part.label,
    ...gradePart(answers?.[part.label], part),
  }));
  const earned = parts.reduce((sum, p) => sum + p.earned, 0);
  const max = parts.reduce((sum, p) => sum + p.max, 0);
  return {
    problemId: problem.id,
    earned,
    max,
    percent: max === 0 ? 0 : Math.round((earned / max) * 1000) / 10,
    parts,
  };
}
