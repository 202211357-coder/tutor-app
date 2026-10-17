import { describe, expect, it } from 'vitest';
import { GRADE_STATUS, gradePart, gradeProblem } from './grading.js';
import { PROBLEMS } from './problems.js';

const forcePart = { label: '(a)', answer: { value: 5, unit: 'kN' }, points: 4 };
const stressPart = { label: '(b)', answer: { value: 99.95, unit: 'MPa' }, points: 10 };

describe('gradePart: 빈 답안·형식 오류', () => {
  it.each([undefined, null, '', '   ', '\n\t'])('빈 답안 %j → 0점, empty', (answer) => {
    const r = gradePart(answer, forcePart);
    expect(r).toMatchObject({ status: GRADE_STATUS.EMPTY, earned: 0, max: 4 });
  });

  it.each(['모르겠음', 'kN', 'five'])('숫자가 아닌 답안 %j → 0점, invalid', (answer) => {
    expect(gradePart(answer, forcePart)).toMatchObject({ status: GRADE_STATUS.INVALID, earned: 0 });
  });

  it('인식할 수 없는 단위 → 0점, unknown_unit', () => {
    expect(gradePart('5 kilonewton', forcePart)).toMatchObject({ status: GRADE_STATUS.UNKNOWN_UNIT, earned: 0 });
  });

  it('소수점 콤마(12,5 kN)는 추측하지 않고 단위 오류로 처리한다', () => {
    expect(gradePart('5,0 kN', forcePart).status).toBe(GRADE_STATUS.UNKNOWN_UNIT);
  });
});

describe('gradePart: 단위가 다른 답안', () => {
  it.each(['5 kN', '5000 N', '0.005 MN', '5e3 N', '5 KN', '5×10^3 N'])('같은 차원의 다른 단위 %j → 만점', (answer) => {
    expect(gradePart(answer, forcePart)).toMatchObject({ status: GRADE_STATUS.CORRECT, earned: 4 });
  });

  it.each(['99.95 MPa', '9.995e7 Pa', '99.95 N/mm²', '0.09995 GPa', '100 MPa'])('응력 %j → 만점', (answer) => {
    expect(gradePart(answer, stressPart)).toMatchObject({ status: GRADE_STATUS.CORRECT, earned: 10 });
  });

  it('수치는 같지만 접두어를 잘못 쓴 경우(5 N ≠ 5 kN) → 오답', () => {
    expect(gradePart('5 N', forcePart)).toMatchObject({ status: GRADE_STATUS.WRONG, earned: 0 });
  });

  it('차원이 다른 단위(힘 문항에 MPa) → 0점, unit_mismatch', () => {
    expect(gradePart('5 MPa', forcePart)).toMatchObject({ status: GRADE_STATUS.UNIT_MISMATCH, earned: 0 });
  });

  it('모멘트 문항에 에너지 단위 J → unit_mismatch', () => {
    const momentPart = { label: '(b)', answer: { value: 10, unit: 'kN·m' }, points: 6 };
    expect(gradePart('10000 J', momentPart).status).toBe(GRADE_STATUS.UNIT_MISMATCH);
    expect(gradePart('10000 N·m', momentPart).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('1e7 N·mm', momentPart).status).toBe(GRADE_STATUS.CORRECT);
  });

  it('rad/s와 Hz는 서로 대체할 수 없다 (ω_n ≠ f_n)', () => {
    const omegaPart = { label: '(a)', answer: { value: 20, unit: 'rad/s' }, points: 4 };
    expect(gradePart('20 Hz', omegaPart).status).toBe(GRADE_STATUS.UNIT_MISMATCH);
    expect(gradePart('190.99 rpm', omegaPart).status).toBe(GRADE_STATUS.CORRECT);
  });

  it('무차원 정답에 단위를 붙이면 unit_mismatch', () => {
    const ratioPart = { label: '(a)', answer: { value: 2.5 }, points: 2 };
    expect(gradePart('2.5', ratioPart).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('2.5 MPa', ratioPart).status).toBe(GRADE_STATUS.UNIT_MISMATCH);
  });
});

describe('gradePart: 무차원·백분율 답안', () => {
  const efficiency = { label: '(a)', answer: { value: 0.625 }, points: 4 };

  it.each(['0.625', '62.5%', '62.5 %', '0.62'])('효율 %j → 만점', (answer) => {
    expect(gradePart(answer, efficiency)).toMatchObject({ status: GRADE_STATUS.CORRECT, earned: 4 });
  });

  it('백분율 수치만 쓴 답(62.5) → % 누락으로 절반', () => {
    const r = gradePart('62.5', efficiency);
    expect(r).toMatchObject({ status: GRADE_STATUS.MISSING_UNIT, earned: 2 });
    expect(r.feedback).toContain('%');
  });

  it('% 기호를 쓴 근사값은 일반 근사 기준을 따른다', () => {
    expect(gradePart('64%', efficiency).status).toBe(GRADE_STATUS.CLOSE);
    expect(gradePart('70%', efficiency).status).toBe(GRADE_STATUS.WRONG);
  });

  it('무차원 문항에 차원 있는 단위 → unit_mismatch', () => {
    expect(gradePart('0.625 kJ', efficiency).status).toBe(GRADE_STATUS.UNIT_MISMATCH);
  });

  it('정답이 %로 정의된 문항에 소수로 답해도 만점', () => {
    expect(gradePart('0.625', { answer: { value: 62.5, unit: '%' } }).status).toBe(GRADE_STATUS.CORRECT);
  });

  it('레이놀즈 수처럼 큰 무차원 값도 지수 표기로 답할 수 있다', () => {
    expect(gradePart('2e5', { answer: { value: 200000 } }).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('2×10^5', { answer: { value: 200000 } }).status).toBe(GRADE_STATUS.CORRECT);
  });
});

describe('gradePart: 온도·관성모멘트 단위', () => {
  const tempPart = { answer: { value: 543.43, unit: 'K' }, points: 5 };

  it('절대온도 K로 답하면 채점한다', () => {
    expect(gradePart('543 K', tempPart).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('543', tempPart).status).toBe(GRADE_STATUS.MISSING_UNIT);
  });

  it('°C로 답하면 K로 쓰라고 안내한다 (영점이 달라 배율 환산 불가)', () => {
    const r = gradePart('270.28 °C', tempPart);
    expect(r.status).toBe(GRADE_STATUS.UNKNOWN_UNIT);
    expect(r.feedback).toContain('절대온도(K)');
  });

  it('관성모멘트 kg·m² 표기를 여러 형태로 받는다', () => {
    const part = { answer: { value: 0.9, unit: 'kg·m²' } };
    for (const answer of ['0.9 kg·m²', '0.9 kg*m^2', '0.9 kg.m2']) {
      expect(gradePart(answer, part).status).toBe(GRADE_STATUS.CORRECT);
    }
  });
});

describe('gradePart: 부분 점수 경계', () => {
  // 기본 허용오차: 1% 이내 만점, 5% 이내 절반
  it.each([
    ['5.05 kN', GRADE_STATUS.CORRECT, 4], // 정확히 1%
    ['4.95 kN', GRADE_STATUS.CORRECT, 4],
    ['5.06 kN', GRADE_STATUS.CLOSE, 2], // 1.2%
    ['5.25 kN', GRADE_STATUS.CLOSE, 2], // 정확히 5%
    ['4.75 kN', GRADE_STATUS.CLOSE, 2],
    ['5.26 kN', GRADE_STATUS.WRONG, 0], // 5.2%
    ['-5 kN', GRADE_STATUS.WRONG, 0], // 부호 반대
  ])('%j → %s, %d점', (answer, status, earned) => {
    const r = gradePart(answer, forcePart);
    expect(r.status).toBe(status);
    expect(r.earned).toBe(earned);
  });

  // 부동소수점 오차로 경계값(정확히 1%, 5%)이 한 단계 낮게 채점되지 않아야 한다.
  it.each([
    ['1.01 m', { value: 1, unit: 'm' }],
    ['101 mm', { value: 0.1, unit: 'm' }],
    ['0.303 m', { value: 0.3, unit: 'm' }],
    ['0.99 m', { value: 1, unit: 'm' }],
  ])('%s: 정확히 1퍼센트 오차 → correct (부동소수점 경계)', (answer, expected) => {
    expect(gradePart(answer, { answer: expected }).status).toBe(GRADE_STATUS.CORRECT);
  });

  it.each([
    ['0.315 m', { value: 0.3, unit: 'm' }],
    ['0.735 kN', { value: 0.7, unit: 'kN' }],
    ['1.05 MPa', { value: 1, unit: 'MPa' }],
    ['10.5 kN·m', { value: 10, unit: 'kN·m' }],
  ])('%s: 정확히 5퍼센트 오차 → close (부동소수점 경계)', (answer, expected) => {
    expect(gradePart(answer, { answer: expected }).status).toBe(GRADE_STATUS.CLOSE);
  });

  it('경계 보정은 아주 작은 오차만 흡수한다 (1.0101 m는 1% 초과)', () => {
    expect(gradePart('1.0101 m', { answer: { value: 1, unit: 'm' } }).status).toBe(GRADE_STATUS.CLOSE);
  });

  it('단위 누락 + 수치 일치 → 절반, missing_unit', () => {
    expect(gradePart('5', forcePart)).toMatchObject({ status: GRADE_STATUS.MISSING_UNIT, earned: 2 });
  });

  it('단위 누락 + SI 환산 수치(5000)만 적은 경우 → 정답 단위 기준으로 비교해 오답', () => {
    expect(gradePart('5000', forcePart)).toMatchObject({ status: GRADE_STATUS.WRONG, earned: 0 });
  });

  it('문항별 허용오차를 지정하면 그 값을 쓴다', () => {
    const strict = { ...forcePart, tolerance: 0.001, partialTolerance: 0.01 };
    expect(gradePart('5.004 kN', strict).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('5.04 kN', strict).status).toBe(GRADE_STATUS.CLOSE);
    expect(gradePart('5.06 kN', strict).status).toBe(GRADE_STATUS.WRONG);
  });

  it('정답이 0이면 상대오차 대신 절대오차로 판정한다', () => {
    const zeroPart = { label: '(a)', answer: { value: 0, unit: 'N' }, points: 2 };
    expect(gradePart('0 N', zeroPart).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('0 kN', zeroPart).status).toBe(GRADE_STATUS.CORRECT);
    expect(gradePart('0.1 N', zeroPart).status).toBe(GRADE_STATUS.WRONG);
  });

  it('points를 생략하면 1점 만점', () => {
    expect(gradePart('5 kN', { answer: { value: 5, unit: 'kN' } })).toMatchObject({ earned: 1, max: 1 });
  });

  it('정답 단위가 잘못 정의된 문항은 예외로 알린다', () => {
    expect(() => gradePart('5', { answer: { value: 5, unit: 'furlong' } })).toThrow('정답 단위');
  });
});

describe('gradeProblem', () => {
  const beam = PROBLEMS.find((p) => p.id === 'statics-simply-supported-beam');

  it('모든 소문항 정답 → 만점 100%', () => {
    const r = gradeProblem(beam, { '(a)': '5 kN', '(b)': '10 kN·m' });
    expect(r).toMatchObject({ problemId: beam.id, earned: 10, max: 10, percent: 100 });
  });

  it('소문항별 점수를 합산한다 (정답 + 근사 + 빈칸)', () => {
    const r = gradeProblem(beam, { '(a)': '5000 N', '(b)': '10.3 kN·m' });
    expect(r.parts.map((p) => p.status)).toEqual([GRADE_STATUS.CORRECT, GRADE_STATUS.CLOSE]);
    expect(r).toMatchObject({ earned: 4 + 3, max: 10, percent: 70 });
  });

  it('답안을 하나도 내지 않으면 0점, 모든 소문항 empty', () => {
    const r = gradeProblem(beam, {});
    expect(r.earned).toBe(0);
    expect(r.parts.every((p) => p.status === GRADE_STATUS.EMPTY)).toBe(true);
  });

  it('answers 자체가 없어도 오류 없이 0점', () => {
    expect(gradeProblem(beam).earned).toBe(0);
    expect(gradeProblem(beam, null).earned).toBe(0);
  });

  it('소수점 한 자리 백분율로 반올림한다', () => {
    const spring = PROBLEMS.find((p) => p.id === 'dynamics-spring-mass');
    const r = gradeProblem(spring, { '(a)': '20 rad/s', '(b)': '3.183' }); // 4 + 1.5 + 0
    expect(r).toMatchObject({ earned: 5.5, max: 10, percent: 55 });
  });

});
