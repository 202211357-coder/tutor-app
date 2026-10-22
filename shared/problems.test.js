import { describe, expect, it } from 'vitest';
import { gradeProblem } from './grading.js';
import {
  createRng,
  findProblem,
  fmt,
  getProblemInstance,
  getSolution,
  isValidSeed,
  listPublicProblems,
  MAX_SEED,
  PROBLEMS,
  toPublicProblem,
} from './problems.js';
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
  // ───── 기계설계 (기본 수치) ─────
  'design-power-screw': (() => {
    const lam = Math.atan(6 / (PI * 36));
    const rho = Math.atan(0.1);
    return { '(a)': (lam * 180) / PI, '(b)': 20000 * 0.018 * Math.tan(lam + rho), '(c)': Math.tan(lam) / Math.tan(lam + rho) };
  })(),
  'design-bolt-nut': {
    '(a)': 10000 / ((PI / 4) * 17.294 ** 2),
    '(b)': 10000 / ((PI / 4) * (20 ** 2 - 17.294 ** 2) * 30),
    '(c)': (10000 / ((PI / 4) * (20 ** 2 - 17.294 ** 2) * 30)) * 2.5,
  },
  'design-riveted-lap-joint': { '(a)': 12000 / ((PI / 4) * 16 ** 2), '(b)': 12000 / ((50 - 16) * 10), '(c)': 34 / 50 },
  // d = 50 mm → 키 14 × 9
  'design-sunk-key': { '(a)': (2 * 600) / 0.05 / 1000, '(b)': 24000 / (14 * 70), '(c)': 24000 / (4.5 * 70) },
  'design-shaft-combined': (() => {
    const T = 10000 / ((2 * PI * 500) / 60);
    const Te = Math.hypot(150, T);
    return { '(a)': T, '(b)': Te, '(c)': (16 * Te * 1000) / (PI * 40 ** 3) };
  })(),
  'design-flange-coupling': (() => {
    const T = 30000 / ((2 * PI * 600) / 60);
    const F = T / 0.075 / 6;
    return { '(a)': T, '(b)': F, '(c)': F / ((PI / 4) * 12 ** 2) };
  })(),
  'design-ball-bearing-life': { '(a)': (10 ** 3 * 1e6) / (60 * 1000), '(b)': 3 * Math.cbrt(1200) },
  'design-friction-wheel': (() => {
    const v = (PI * 0.3 * 600) / 60;
    return { '(a)': 600, '(b)': v, '(c)': 2000 / v / 0.25 / 1000 };
  })(),
  'design-spur-gear': (() => {
    const v = (PI * 0.08 * 1200) / 60;
    return { '(a)': 160, '(b)': 400, '(c)': v, '(d)': 10000 / v };
  })(),
  'design-flat-belt': (() => {
    const t2 = 1500 / Math.exp(0.3 * ((165 * PI) / 180));
    return { '(a)': t2, '(b)': 1500 - t2, '(c)': ((1500 - t2) * 10) / 1000 };
  })(),
  'design-block-brake': { '(a)': 200 / (0.3 * 0.2), '(b)': (200 / (0.3 * 0.2)) * 0.2, '(c)': 200 / (0.3 * 0.2) / 6000 },
  'design-helical-spring': (() => {
    const K = 31 / 28 + 0.615 / 8;
    return { '(a)': 8, '(b)': (K * 8 * 300 * 48) / (PI * 216), '(c)': (8 * 10 * 48 ** 3 * 300) / (80000 * 6 ** 4) };
  })(),
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
      { label: '(a)', value: 0.625, unit: '', display: '0.625' },
      { label: '(b)', value: 625, unit: 'kJ', display: '625' },
    ]);
  });

  it('공개 데이터를 수정해도 원본 문제는 바뀌지 않는다', () => {
    const pub = toPublicProblem(PROBLEMS[0]);
    pub.hints.push('변조');
    expect(PROBLEMS[0].hints).not.toContain('변조');
  });
});

// ───────── 숫자 바꾸기(변형 문제) ─────────

// 변형 문제의 정답을 문제 변수(params)로 독립적으로 다시 계산하는 공식.
// problems.js의 build()와 별개로 작성해, 한쪽의 공식 실수를 다른 쪽이 잡도록 한다.
const FORMULAS = {
  'statics-simply-supported-beam': ({ L, P }) => ({ '(a)': P / 2, '(b)': (P * L) / 4 }),
  'statics-cantilever': ({ L, P }) => ({ '(a)': P, '(b)': P * L }),
  'statics-two-cables': ({ W, thA, thB }) => ({ '(a)': W / 2 / sin((thA * PI) / 180), '(b)': W / 2 / sin((thB * PI) / 180) }),
  'statics-incline-friction': ({ m, th }) => ({
    '(a)': m * g * sin((th * PI) / 180),
    '(b)': m * g * cos((th * PI) / 180),
    '(c)': Math.tan((th * PI) / 180),
  }),
  'statics-simple-truss': ({ s, h, P }) => {
    // 절점 A: 수직 F_AC·sinα = R_A, 수평 F_AB = F_AC·cosα
    const alpha = Math.atan2(h, s / 2);
    const fac = P / 2 / sin(alpha);
    return { '(a)': P / 2, '(b)': fac, '(c)': fac * cos(alpha) };
  },
  'mom-axial-rod': ({ d, L, P }) => {
    const sigma = (P * 1e3) / (PI * (d / 2) ** 2);
    return { '(a)': sigma, '(b)': (sigma / 200e3) * L * 1e3 };
  },
  'mom-torsion-shaft': ({ d, L, T }) => {
    const r = d / 2000;
    const J = (PI * r ** 4) / 2;
    return { '(a)': (T * r) / J / 1e6, '(b)': (T * L) / (80e9 * J) };
  },
  'mom-bending-stress': ({ b, h, M }) => {
    const I = (b * h * h * h) / 12;
    return { '(a)': I, '(b)': (M * 1e6 * h) / 2 / I };
  },
  'mom-thermal-stress': ({ L, dT }) => ({ '(a)': 200e3 * 12e-6 * dT, '(b)': 12e-6 * dT * L * 1e3 }),
  'mom-pressure-vessel': ({ D, t, p }) => ({ '(a)': (p * D * 1e3) / (2 * t), '(b)': (p * D * 1e3) / (4 * t) }),
  'mom-euler-buckling': ({ L, d }) => {
    const I = (PI * (d / 2000) ** 4) / 4;
    const pcr = (PI * PI * 200e9 * I) / (L * L) / 1e3;
    return { '(a)': pcr, '(b)': (PI * PI * 200e9 * I) / (2 * L) ** 2 / 1e3 };
  },
  'thermo-constant-pressure-heating': ({ m, dT }) => ({ '(a)': m * 1.005 * dT, '(b)': 1.005 * dT }),
  'thermo-ideal-gas-tank': ({ V, P1, T1, T2 }) => ({ '(a)': (P1 * V) / (0.287 * T1), '(b)': P1 * (T2 / T1) }),
  'thermo-carnot': ({ TH, TL, QH }) => ({ '(a)': (TH - TL) / TH, '(b)': (QH * (TH - TL)) / TH }),
  'thermo-adiabatic-compression': ({ T1, ratio }) => {
    const t2 = T1 * Math.exp((0.4 / 1.4) * Math.log(ratio));
    return { '(a)': t2, '(b)': 0.718 * (t2 - T1) };
  },
  'thermo-otto-cycle': ({ ra, rb }) => ({ '(a)': 1 - 1 / ra ** 0.4, '(b)': 1 - 1 / rb ** 0.4 }),
  'fluid-pipe-flow-rate': ({ D, V }) => ({ '(a)': PI * (D / 2) ** 2 * V, '(b)': 1000 * PI * (D / 2) ** 2 * V }),
  'fluid-hydrostatic-pressure': ({ h, rho }) => ({ '(a)': (rho * 9.81 * h) / 1000, '(b)': 101.325 + (rho * 9.81 * h) / 1000 }),
  'fluid-pipe-contraction': ({ D1, D2, V1 }) => {
    const v2 = (V1 * D1 * D1) / (D2 * D2);
    return { '(a)': v2, '(b)': (500 * (v2 * v2 - V1 * V1)) / 1000, '(c)': V1 * D1 * 1e6 };
  },
  'fluid-pipe-friction-loss': ({ L, D, V, f }) => {
    const dpPa = (f * (L / D) * 1000 * V * V) / 2;
    return { '(a)': dpPa / (1000 * g), '(b)': dpPa / 1000 };
  },
  'fluid-buoyancy': ({ a, b, c, rho }) => ({ '(a)': rho * a * b * c * g, '(b)': (rho * a * b * c) / 1000 / (a * b) }),
  'dynamics-spring-mass': ({ m, k }) => ({
    '(a)': sqrt(k / m),
    '(b)': sqrt(k / m) / (2 * PI),
    '(c)': 2 * PI * sqrt(m / k),
  }),
  'dynamics-free-fall': ({ h }) => ({ '(a)': sqrt(2 * g * h), '(b)': sqrt((2 * h) / g) }),
  'dynamics-damped-vibration': ({ m, k, c }) => {
    const zeta = c / (2 * sqrt(k * m));
    return { '(a)': zeta, '(b)': sqrt(k / m - (c / (2 * m)) ** 2) };
  },
  'dynamics-curve-friction': ({ r, kmh }) => ({ '(a)': (kmh / 3.6) ** 2 / r, '(b)': (kmh / 3.6) ** 2 / r / g }),
  'dynamics-flywheel': ({ m, R, n }) => {
    const w = (2 * PI * n) / 60;
    return { '(a)': (m * R * R) / 2, '(b)': (m * R * R * w * w) / 4 / 1000 };
  },
  // ───── 기계설계 ─────
  'design-power-screw': ({ W, d2, p, mu }) => {
    // 경사면 모델: 들어 올리는 수평력 P = W(p + μπd₂)/(πd₂ − μp), 토크 = P·d₂/2
    const force = (W * 1e3 * (p + mu * PI * d2)) / (PI * d2 - mu * p);
    const torque = (force * d2) / 2000;
    const ideal = (W * 1e3 * p) / (2 * PI) / 1000; // 마찰 없는 토크 = W·리드/(2π)
    return { '(a)': (Math.atan2(p, PI * d2) * 180) / PI, '(b)': torque, '(c)': ideal / torque };
  },
  'design-bolt-nut': ({ d, d1, p, W, q }) => {
    const z = (4 * W * 1e3) / (PI * (d - d1) * (d + d1) * q);
    return { '(a)': (4 * W * 1e3) / (PI * d1 * d1), '(b)': z, '(c)': z * p };
  },
  'design-riveted-lap-joint': ({ d, p, t, W }) => ({
    '(a)': (4 * W * 1e3) / (PI * d * d),
    '(b)': (W * 1e3) / (p * t - d * t),
    '(c)': 1 - d / p,
  }),
  'design-sunk-key': ({ d, b, h, T, l }) => {
    const F = T / (d / 2000); // N
    return { '(a)': F / 1e3, '(b)': F / (b * l), '(c)': F / ((h / 2) * l) };
  },
  'design-shaft-combined': ({ P, n, M, d }) => {
    const T = (P * 1e3 * 60) / (2 * PI * n);
    const Te = Math.hypot(M, T);
    return { '(a)': T, '(b)': Te, '(c)': (Te * (d / 2000)) / ((PI * (d / 1000) ** 4) / 32) / 1e6 };
  },
  'design-flange-coupling': ({ P, n, Db, z, delta }) => {
    const T = (P * 1e3 * 60) / (2 * PI * n);
    const F = T / (Db / 2000) / z;
    return { '(a)': T, '(b)': F, '(c)': F / (PI * (delta / 2) ** 2) };
  },
  'design-ball-bearing-life': ({ C, P, n, Lt }) => ({
    '(a)': ((C / P) ** 3 * 1e6) / n / 60,
    '(b)': P * ((Lt * 60 * n) / 1e6) ** (1 / 3),
  }),
  'design-friction-wheel': ({ D1, n1, n2, P, mu }) => {
    const v = (D1 / 2000) * ((2 * PI * n1) / 60);
    return { '(a)': D1 * (n1 / n2), '(b)': v, '(c)': (P * 1e3) / (mu * v) / 1e3 };
  },
  'design-spur-gear': ({ m, Z1, Z2, n1, P }) => {
    const r1 = (m * Z1) / 2000;
    const v = r1 * ((2 * PI * n1) / 60);
    return { '(a)': (m * Z1 + m * Z2) / 2, '(b)': n1 / (Z2 / Z1), '(c)': v, '(d)': (P * 1e3) / v };
  },
  'design-flat-belt': ({ T1, mu, theta, v }) => {
    const t2 = T1 * Math.exp((-mu * theta * PI) / 180);
    return { '(a)': t2, '(b)': T1 - t2, '(c)': ((T1 - t2) * v) / 1e3 };
  },
  'design-block-brake': ({ D, T, mu, a, b, w, e }) => {
    const N = T / (mu * (D / 2000));
    return { '(a)': N, '(b)': (N * b) / a, '(c)': N / (w * e) };
  },
  'design-helical-spring': ({ d, D, n, W }) => {
    const C = D / d;
    const K = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
    const k = (80e3 * d ** 4) / (8 * n * D ** 3); // N/mm
    return { '(a)': C, '(b)': (K * 8 * W * C) / (PI * d * d), '(c)': W / k };
  },
};

/** 화면에 보이는 "4.167 × 10⁶"을 학생이 키보드로 치는 형태 "4.167×10^6"으로 바꾼다. */
function asTyped(display) {
  const digits = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  return display.replace(/ × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/, (_, sup) => `×10^${[...sup].map((c) => digits[c]).join('')}`);
}

// seed 1~40과 큰 seed 몇 개를 고정해 매번 같은 변형을 검사한다.
const SEEDS = [...Array.from({ length: 40 }, (_, i) => i + 1), 123456, 987654321, MAX_SEED];

describe('변형 문제 (숫자 바꾸기)', () => {
  it('공식표가 모든 문제를 다룬다', () => {
    expect(Object.keys(FORMULAS).sort()).toEqual(PROBLEMS.map((p) => p.id).sort());
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 여러 seed에서 정답이 독립 공식과 일치한다', (id) => {
    for (const seed of SEEDS) {
      const inst = getProblemInstance(id, seed);
      const expected = FORMULAS[id](inst.params);
      for (const p of inst.parts) {
        const rel = Math.abs(p.answer.value - expected[p.label]) / Math.abs(expected[p.label]);
        expect(rel, `${id} seed=${seed} ${p.label}`).toBeLessThan(1e-9);
      }
    }
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 기본 숫자도 같은 공식을 만족한다', (id) => {
    const inst = findProblem(id);
    const expected = FORMULAS[id](inst.params);
    for (const p of inst.parts) expect(Math.abs(p.answer.value - expected[p.label]) / Math.abs(expected[p.label])).toBeLessThan(1e-9);
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 변형 문제의 숫자는 기본 문제와 다르고, 문제 문장에 반영된다', (id) => {
    const base = findProblem(id);
    let differentStatements = 0;
    for (const seed of SEEDS.slice(0, 10)) {
      const inst = getProblemInstance(id, seed);
      expect(inst.params).not.toEqual(base.params);
      if (inst.statement !== base.statement || inst.parts.some((p, i) => p.prompt !== base.parts[i].prompt)) differentStatements += 1;
    }
    expect(differentStatements).toBe(10);
  });

  it('같은 seed는 항상 같은 문제를 만든다 (채점 시 서버가 다시 만들 수 있음)', () => {
    for (const { id } of PROBLEMS) {
      expect(getProblemInstance(id, 777)).toEqual(getProblemInstance(id, 777));
    }
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 수치 조합이 충분히 다양하다 (seed 400개 중 서로 다른 조합 200개 이상)', (id) => {
    const seen = new Set();
    for (let seed = 1; seed <= 400; seed++) seen.add(JSON.stringify(getProblemInstance(id, seed).params));
    expect(seen.size).toBeGreaterThanOrEqual(200);
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 유효 조합이 드물어 기본 수치로 되돌아가는 경우가 없다', (id) => {
    const base = JSON.stringify(findProblem(id).params);
    for (let seed = 1; seed <= 400; seed++) expect(JSON.stringify(getProblemInstance(id, seed).params)).not.toBe(base);
  });

  it('seed가 다르면 대체로 다른 숫자가 나온다', () => {
    const variants = new Set(SEEDS.map((seed) => JSON.stringify(getProblemInstance('mom-axial-rod', seed).params)));
    expect(variants.size).toBeGreaterThan(5);
  });

  it.each([
    ['mom-axial-rod', (i) => i.parts[0].answer.value <= 250],
    ['mom-torsion-shaft', (i) => i.parts[0].answer.value <= 150],
    ['mom-bending-stress', (i) => i.parts[1].answer.value <= 250],
    ['mom-pressure-vessel', (i) => (i.params.D * 1000) / i.params.t >= 20 && i.parts[0].answer.value <= 250],
    ['statics-incline-friction', (i) => i.parts[2].answer.value < 0.7],
    ['dynamics-curve-friction', (i) => i.parts[1].answer.value <= 1],
    ['dynamics-damped-vibration', (i) => i.parts[0].answer.value < 1 && i.params.c > 0],
    ['mom-euler-buckling', (i) => (i.params.L * 1000) / (i.params.d / 4) >= 100],
    ['mom-thermal-stress', (i) => i.parts[0].answer.value <= 250],
    ['mom-bending-stress', (i) => i.params.h >= i.params.b],
    ['thermo-ideal-gas-tank', (i) => i.params.T2 > i.params.T1],
    ['fluid-pipe-contraction', (i) => i.params.D2 < i.params.D1],
    ['design-bolt-nut', (i) => i.parts[0].answer.value <= 120 && i.parts[1].answer.value >= 3],
    ['design-riveted-lap-joint', (i) => i.params.p >= 2.5 * i.params.d && i.parts[0].answer.value <= 100],
    ['design-sunk-key', (i) => i.parts[1].answer.value <= 60 && i.parts[2].answer.value <= 150],
    ['design-shaft-combined', (i) => i.parts[2].answer.value <= 60],
    ['design-spur-gear', (i) => i.params.Z1 >= 17 && i.params.Z2 > i.params.Z1],
    ['design-helical-spring', (i) => i.parts[0].answer.value >= 4 && i.parts[0].answer.value <= 12],
    ['design-block-brake', (i) => i.params.b <= i.params.a / 2 && i.parts[2].answer.value <= 1],
    ['design-flat-belt', (i) => i.params.theta <= 180],
  ])('%s: 변형 문제도 물리적 가정(탄성 범위·박육·정지·부족감쇠·세장비·규격 범위 등)을 지킨다', (id, check) => {
    for (const seed of SEEDS) expect(check(getProblemInstance(id, seed)), `seed=${seed}`).toBe(true);
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 풀이에 표시된 정답(유효숫자 4자리)을 그대로 써도 만점', (id) => {
    for (const seed of [0, ...SEEDS.slice(0, 10)]) {
      const inst = getProblemInstance(id, seed);
      const answers = Object.fromEntries(getSolution(inst).answers.map((a) => [a.label, `${asTyped(a.display)} ${a.unit}`]));
      const r = gradeProblem(inst, answers);
      expect(r.earned, `${id} seed=${seed} ${JSON.stringify(answers)}`).toBe(r.max);
    }
  });

  it.each(PROBLEMS.map((p) => [p.id]))('%s: 변형 문제의 힌트도 최종 값을 노출하지 않는다', (id) => {
    for (const seed of SEEDS.slice(0, 10)) {
      const inst = getProblemInstance(id, seed);
      const text = inst.hints.join('\n');
      for (const p of inst.parts.filter((x) => x.answer.unit)) expect(text).not.toContain(`${fmt(p.answer.value)} ${p.answer.unit}`);
    }
  });

  it('잘못된 seed나 없는 문제는 null', () => {
    expect(getProblemInstance('mom-axial-rod', -1)).toBeNull();
    expect(getProblemInstance('mom-axial-rod', 1.5)).toBeNull();
    expect(getProblemInstance('mom-axial-rod', MAX_SEED + 1)).toBeNull();
    expect(getProblemInstance('nope', 3)).toBeNull();
  });

  it('seed 0은 기본 문제와 같다', () => {
    expect(getProblemInstance('statics-cantilever', 0)).toBe(findProblem('statics-cantilever'));
  });

  it('isValidSeed / createRng', () => {
    expect([0, 1, MAX_SEED].every(isValidSeed)).toBe(true);
    expect([-1, 0.5, '3', null, MAX_SEED + 1].some(isValidSeed)).toBe(false);
    const a = createRng(42);
    const b = createRng(42);
    const seq = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seq);
    expect(seq.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('기계설계 문제의 규격 데이터', () => {
  it('볼트 골지름은 d − 1.0825p (ISO 기본 치수)와 일치한다', () => {
    const sizes = new Map();
    for (let seed = 1; seed <= 400; seed++) {
      const { size, d, d1, p } = getProblemInstance('design-bolt-nut', seed).params;
      sizes.set(size, { d, d1, p });
    }
    expect([...sizes.keys()].sort()).toEqual(['M12', 'M16', 'M20', 'M24', 'M30']);
    for (const [size, { d, d1, p }] of sizes) {
      expect(size).toBe(`M${d}`);
      expect(Math.abs(d1 - (d - 1.0825 * p))).toBeLessThan(0.001);
    }
  });

  it.each([
    [32, 10, 8],
    [38, 10, 8],
    [39, 12, 8],
    [50, 14, 9],
    [51, 16, 10],
    [58, 16, 10],
    [65, 18, 11],
    [75, 20, 12],
    [85, 22, 14],
  ])('축 지름 %i mm → 키 %i × %i', (d, b, h) => {
    for (let seed = 1; seed <= 2000; seed++) {
      const params = getProblemInstance('design-sunk-key', seed).params;
      if (params.d === d) {
        expect([params.b, params.h]).toEqual([b, h]);
        return;
      }
    }
    throw new Error(`d = ${d}인 변형 문제를 찾지 못함`);
  });
});

describe('fmt (표시용 숫자)', () => {
  it.each([
    [0, '0'],
    [5, '5'],
    [99.949304, '99.95'],
    [0.0157079, '0.01571'],
    [4166666.67, '4.167 × 10⁶'],
    [2.5132741e-7, '2.513 × 10⁻⁷'],
    [9.99995e6, '1 × 10⁷'],
    [-1234.5, '-1235'],
  ])('%d → %s', (x, expected) => {
    expect(fmt(x)).toBe(expected);
  });
});
