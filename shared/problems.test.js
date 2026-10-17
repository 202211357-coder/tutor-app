import { describe, expect, it } from 'vitest';
import { gradeProblem } from './grading.js';
import { findProblem, getSolution, listPublicProblems, PROBLEMS, toPublicProblem } from './problems.js';
import { SUBJECTS } from './subjects.js';
import { convert } from './units.js';

const { PI, sqrt, sin, cos } = Math;
const g = 9.81;

// 각 정답을 공식으로 다시 계산한 값 (단위는 문항의 정답 단위와 같게 맞춤).
// 문제 데이터에 손으로 적은 숫자의 계산 실수를 잡기 위한 검산표.
const RECOMPUTED = {
  'statics-simply-supported-beam': { '(a)': 10 / 2, '(b)': (10 * 4) / 4 },
  'statics-cantilever': { '(a)': 3, '(b)': 3 * 2 },
  'statics-two-cables': { '(a)': 1000 / (2 * sin(PI / 6)), '(b)': 1000 / (2 * sin(PI / 3)) },
  'mom-axial-rod': (() => {
    const sigma = 31400 / ((PI * 20 ** 2) / 4); // N/mm² = MPa
    return { '(a)': sigma, '(b)': (sigma * 1000) / 200e3 }; // mm
  })(),
  'mom-torsion-shaft': {
    '(a)': (16 * 500) / (PI * 0.04 ** 3) / 1e6,
    '(b)': (500 * 1) / (80e9 * ((PI * 0.04 ** 4) / 32)),
  },
  'mom-bending-stress': {
    '(a)': (50 * 100 ** 3) / 12,
    '(b)': (5e6 * 50) / ((50 * 100 ** 3) / 12),
  },
  'thermo-constant-pressure-heating': { '(a)': 2 * 1.005 * 100, '(b)': 1.005 * 100 },
  'thermo-ideal-gas-tank': { '(a)': (200 * 0.5) / (0.287 * 300), '(b)': (200 * 400) / 300 },
  'thermo-carnot': { '(a)': 1 - 300 / 800, '(b)': (1 - 300 / 800) * 1000 },
  'fluid-pipe-flow-rate': { '(a)': ((PI * 0.1 ** 2) / 4) * 2, '(b)': 1000 * ((PI * 0.1 ** 2) / 4) * 2 },
  'fluid-hydrostatic-pressure': { '(a)': (1000 * g * 5) / 1000, '(b)': 101.325 + (1000 * g * 5) / 1000 },
  'fluid-pipe-contraction': {
    '(a)': 2 * (0.1 / 0.05) ** 2,
    '(b)': (1000 * ((2 * (0.1 / 0.05) ** 2) ** 2 - 2 ** 2)) / 2 / 1000,
    '(c)': (2 * 0.1) / 1.0e-6,
  },
  'dynamics-spring-mass': {
    '(a)': sqrt(800 / 2),
    '(b)': sqrt(800 / 2) / (2 * PI),
    '(c)': (2 * PI) / sqrt(800 / 2),
  },
  'dynamics-free-fall': { '(a)': sqrt(2 * g * 5), '(b)': sqrt((2 * 5) / g) },
  'statics-incline-friction': {
    '(a)': 10 * g * sin(PI / 6),
    '(b)': 10 * g * cos(PI / 6),
    '(c)': Math.tan(PI / 6),
  },
  'statics-simple-truss': (() => {
    const lac = sqrt(2 ** 2 + 3 ** 2);
    const fac = (6 * lac) / 3;
    return { '(a)': 12 / 2, '(b)': fac, '(c)': (fac * 2) / lac };
  })(),
  'mom-thermal-stress': { '(a)': (200e9 * 12e-6 * 50) / 1e6, '(b)': 12e-6 * 50 * 1000 },
  'mom-pressure-vessel': { '(a)': (2 * 1000) / (2 * 10), '(b)': (2 * 1000) / (4 * 10) },
  'mom-euler-buckling': (() => {
    const pcr = (PI ** 2 * 200e9 * ((PI * 0.04 ** 4) / 64)) / 2 ** 2 / 1e3;
    return { '(a)': pcr, '(b)': pcr / 4 };
  })(),
  'thermo-adiabatic-compression': (() => {
    const t2 = 300 * 8 ** ((1.4 - 1) / 1.4);
    return { '(a)': t2, '(b)': 0.718 * (t2 - 300) };
  })(),
  'thermo-otto-cycle': { '(a)': 1 - 8 ** -0.4, '(b)': 1 - 10 ** -0.4 },
  'fluid-pipe-friction-loss': {
    '(a)': (0.02 * (100 / 0.1) * 2 ** 2) / (2 * g),
    '(b)': (1000 * g * ((0.02 * (100 / 0.1) * 2 ** 2) / (2 * g))) / 1000,
  },
  'fluid-buoyancy': { '(a)': 600 * 0.04 * g, '(b)': (600 * 0.04) / 1000 / (0.5 * 0.4) },
  'dynamics-curve-friction': { '(a)': (72 / 3.6) ** 2 / 50, '(b)': (72 / 3.6) ** 2 / (50 * g) },
  'dynamics-flywheel': (() => {
    const inertia = 0.5 * 20 * 0.3 ** 2;
    const omega = (3000 * 2 * PI) / 60;
    return { '(a)': inertia, '(b)': (0.5 * inertia * omega ** 2) / 1000 };
  })(),
  'dynamics-damped-vibration': {
    '(a)': 16 / (2 * sqrt(800 * 2)),
    '(b)': sqrt(800 / 2) * sqrt(1 - (16 / (2 * sqrt(800 * 2))) ** 2),
  },
};

describe('문제 데이터 구조', () => {
  it('문제 id가 중복되지 않는다', () => {
    const ids = PROBLEMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SUBJECTS.map((s) => s.id))('%s 과목에 문제가 5개 이상 있다', (subjectId) => {
    expect(PROBLEMS.filter((p) => p.subjectId === subjectId).length).toBeGreaterThanOrEqual(5);
  });

  it.each(PROBLEMS.map((p) => [p.id, p]))('%s: 주제(topic)가 있고 공개 데이터에도 포함된다', (_id, problem) => {
    expect(typeof problem.topic).toBe('string');
    expect(problem.topic.length).toBeGreaterThan(0);
    expect(toPublicProblem(problem).topic).toBe(problem.topic);
  });

  it.each(PROBLEMS.map((p) => [p.id, p]))('%s: 과목·소문항·힌트·풀이가 모두 있다', (_id, problem) => {
    expect(SUBJECTS.some((s) => s.id === problem.subjectId)).toBe(true);
    expect(problem.parts.length).toBeGreaterThan(0);
    expect(new Set(problem.parts.map((p) => p.label)).size).toBe(problem.parts.length);
    expect(problem.hints.length).toBeGreaterThan(0);
    expect(problem.solution.length).toBeGreaterThan(0);
  });

  it('검산표가 모든 문제·소문항을 다룬다', () => {
    for (const problem of PROBLEMS) {
      expect(Object.keys(RECOMPUTED[problem.id] ?? {}).sort()).toEqual(problem.parts.map((p) => p.label).sort());
    }
  });
});

describe('정답 검산', () => {
  const cases = PROBLEMS.flatMap((problem) =>
    problem.parts.map((part) => [problem.id, part.label, part.answer.value, RECOMPUTED[problem.id]?.[part.label]]),
  );

  it.each(cases)('%s %s: 저장된 정답이 공식 계산값과 0.05퍼센트 이내로 일치', (_id, _label, stored, recomputed) => {
    expect(Math.abs(stored - recomputed) / Math.abs(recomputed)).toBeLessThan(5e-4);
  });

  it.each(PROBLEMS.map((p) => [p.id, p]))('%s: 정답 그대로 입력하면 만점', (_id, problem) => {
    const answers = Object.fromEntries(problem.parts.map((p) => [p.label, `${p.answer.value} ${p.answer.unit ?? ''}`]));
    const r = gradeProblem(problem, answers);
    expect(r.earned).toBe(r.max);
  });

  it('비틀림각은 도(°)로 답해도 만점', () => {
    const shaft = findProblem('mom-torsion-shaft');
    const degrees = convert(0.024868, 'rad', 'deg');
    const r = gradeProblem(shaft, { '(a)': '39.79 MPa', '(b)': `${degrees.toFixed(3)}°` });
    expect(r.earned).toBe(r.max);
  });
});

describe('힌트는 최종 답을 노출하지 않는다', () => {
  const cases = PROBLEMS.flatMap((problem) =>
    problem.parts
      .filter((part) => part.answer.unit)
      .map((part) => [problem.id, part.label, problem, part]),
  );

  it.each(cases)('%s %s', (_id, _label, problem, part) => {
    const text = problem.hints.join('\n');
    const { value, unit } = part.answer;
    expect(text).not.toContain(`${value} ${unit}`);
    expect(text).not.toContain(`${value}${unit}`);
  });
});

describe('공개용 데이터', () => {
  it.each(PROBLEMS.map((p) => [p.id, p]))('%s: 정답·정답 단위·풀이를 포함하지 않는다', (_id, problem) => {
    const pub = toPublicProblem(problem);
    const json = JSON.stringify(pub);
    expect(json).not.toContain('"answer"');
    expect(json).not.toContain('"solution"');
    expect(pub.parts.every((p) => !('unit' in p) && !('answer' in p))).toBe(true);
    expect(pub.hints).toEqual(problem.hints);
  });

  it('listPublicProblems는 과목으로 거르고, 과목을 생략하면 전체를 준다', () => {
    expect(listPublicProblems('thermodynamics').every((p) => p.subjectId === 'thermodynamics')).toBe(true);
    expect(listPublicProblems()).toHaveLength(PROBLEMS.length);
    expect(listPublicProblems('nope')).toEqual([]);
  });

  it('getSolution은 풀이 단계와 소문항별 정답을 준다', () => {
    const s = getSolution(findProblem('thermo-carnot'));
    expect(s.problemId).toBe('thermo-carnot');
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.answers).toEqual([
      { label: '(a)', value: 0.625, unit: '' },
      { label: '(b)', value: 625, unit: 'kJ' },
    ]);
  });

  it('공개 데이터를 수정해도 원본 문제는 바뀌지 않는다', () => {
    const pub = toPublicProblem(PROBLEMS[0]);
    pub.hints.push('변조');
    expect(PROBLEMS[0].hints).not.toContain('변조');
  });
});
