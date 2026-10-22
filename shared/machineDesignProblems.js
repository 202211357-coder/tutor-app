// 기계설계 문제 템플릿. 설계 대상(topic)마다 계산형 문제와 설계형 문제(필요 치수 → 규격 선정 → 재검토)가 있고,
// 과목 화면에서는 대상 몇 개를 골라 대상마다 한 문제씩 출제한다.
import { clearOf, DEG, fmt, part, pick, range, select, smallestAtLeast } from './problemKit.js';

const { PI, sqrt, tan } = Math;

// 미터 보통나사 [mm]. 골지름은 암나사 골지름 D₁ = d − 1.0825p (ISO 기본 치수)를 쓴다.
const BOLT_SIZES = [
  { size: 'M12', d: 12, d1: 10.106, p: 1.75 },
  { size: 'M16', d: 16, d1: 13.835, p: 2 },
  { size: 'M20', d: 20, d1: 17.294, p: 2.5 },
  { size: 'M24', d: 24, d1: 20.752, p: 3 },
  { size: 'M30', d: 30, d1: 26.211, p: 3.5 },
];

// 평행키 단면 폭 b × 높이 h [mm]. 축 지름 구간(앞 값 초과 ~ 이 값 이하)별 표준 치수.
const KEY_SIZES = [
  [38, 10, 8],
  [44, 12, 8],
  [50, 14, 9],
  [58, 16, 10],
  [65, 18, 11],
  [75, 20, 12],
  [85, 22, 14],
];

/** 축 지름 d(30 초과 85 이하)에 맞는 평행키 단면 */
function keyFor(d) {
  const [, b, h] = KEY_SIZES.find(([max]) => d <= max);
  return { b, h };
}

const CALCULATION_TEMPLATES = [
  {
    id: 'design-power-screw',
    subjectId: 'machine_design',
    topic: '나사',
    title: '사각나사 잭의 토크와 효율',
    defaults: { W: 20, d2: 36, p: 6, mu: 0.1 },
    vary: (r) => ({ W: range(r, 5, 50, 1), d2: range(r, 20, 60, 2), p: range(r, 3, 12, 1), mu: range(r, 0.08, 0.2, 0.01) }),
    valid: ({ d2, p }) => p / d2 >= 0.08 && p / d2 <= 0.25,
    build: ({ W, d2, p, mu }) => {
      const lambda = Math.atan(p / (PI * d2));
      const rho = Math.atan(mu);
      const T = W * 1e3 * (d2 / 2000) * tan(lambda + rho);
      const eta = tan(lambda) / tan(lambda + rho);
      return {
        statement: `1줄 사각나사 잭으로 W = ${W} kN의 하중을 들어 올린다. 나사의 유효지름 d₂ = ${d2} mm, 피치 p = ${p} mm, 나사면의 마찰계수 μ = ${mu}이다. 칼라(자리면) 마찰은 무시한다.`,
        parts: [
          part('(a)', '리드각 λ', lambda / DEG, '°', 3),
          part('(b)', '하중을 들어 올리는 데 필요한 토크 T', T, 'N·m', 4),
          part('(c)', '나사의 효율 η', eta, undefined, 3),
        ],
        hints: [
          '나사산을 유효지름의 원주 πd₂로 펼치면, 리드만큼 올라가는 경사면이 됩니다. 1줄 나사의 리드는 피치와 같습니다.',
          '마찰은 마찰각 ρ = tan⁻¹μ로 바꿔 경사각에 더해 생각합니다. 들어 올리는 힘은 W·tan(λ + ρ)입니다.',
          '효율은 마찰이 없을 때 필요한 토크와 실제 토크의 비입니다.',
        ],
        solution: [
          `tan λ = p/(πd₂) = ${p}/(π × ${d2}) = ${fmt(tan(lambda))} → λ = ${fmt(lambda / DEG)}°`,
          `마찰각 ρ = tan⁻¹(${mu}) = ${fmt(rho / DEG)}°`,
          `T = W·(d₂/2)·tan(λ + ρ) = ${fmt(W * 1e3)} N × ${fmt(d2 / 2000)} m × tan(${fmt((lambda + rho) / DEG)}°) = ${fmt(T)} N·m`,
          `η = tan λ / tan(λ + ρ) = ${fmt(tan(lambda))} / ${fmt(tan(lambda + rho))} = ${fmt(eta)} (${fmt(eta * 100, 3)}%)`,
          lambda < rho
            ? `λ < ρ이므로 하중을 놓아도 저절로 풀리지 않는다(자립). 자립하는 사각나사의 효율은 50% 미만이다.`
            : `λ ≥ ρ이므로 자립하지 않는다. 하중을 유지하려면 브레이크나 멈춤 장치가 필요하다.`,
        ],
      };
    },
  },
  {
    id: 'design-bolt-nut',
    subjectId: 'machine_design',
    topic: '볼트',
    title: '축하중을 받는 볼트와 너트 높이',
    defaults: { ...BOLT_SIZES[2], W: 10, q: 30 },
    vary: (r) => ({ ...pick(r, BOLT_SIZES), W: range(r, 2, 60, 1), q: range(r, 15, 40, 1) }),
    valid: ({ d, d1, W, q }) => {
      const sigma = (W * 1e3) / ((PI * d1 * d1) / 4);
      const z = (W * 1e3) / ((PI / 4) * (d * d - d1 * d1) * q);
      return sigma <= 120 && z >= 3 && z <= 12;
    },
    build: ({ size, d, d1, p, W, q }) => {
      const A1 = (PI * d1 * d1) / 4;
      const sigma = (W * 1e3) / A1;
      const Abear = (PI / 4) * (d * d - d1 * d1);
      const z = (W * 1e3) / (Abear * q);
      const H = z * p;
      return {
        statement: `미터 보통나사 ${size} 볼트(바깥지름 d = ${d} mm, 골지름 d₁ = ${d1} mm, 피치 p = ${p} mm)가 축방향 인장하중 W = ${W} kN을 받는다. 너트 나사산의 허용 접촉면압은 q = ${q} MPa이다.`,
        parts: [
          part('(a)', '골지름 단면에 생기는 인장응력 σ', sigma, 'MPa', 4),
          part('(b)', '면압 조건을 만족하는 데 필요한 나사산 수 z (계산값)', z, undefined, 3),
          part('(c)', '필요한 너트 높이 H', H, 'mm', 3),
        ],
        hints: [
          '볼트는 나사산이 깎인 가장 가는 단면, 즉 골지름 단면에서 먼저 끊어집니다.',
          '나사산 하나가 하중을 받는 면적은 바깥지름과 골지름 사이의 고리 면적입니다.',
          '너트 높이는 필요한 나사산 수만큼 피치를 쌓은 길이입니다.',
        ],
        solution: [
          `골지름 단면적 A₁ = πd₁²/4 = π × ${d1}²/4 = ${fmt(A1)} mm²`,
          `σ = W/A₁ = ${fmt(W * 1e3)} N / ${fmt(A1)} mm² = ${fmt(sigma)} MPa`,
          `나사산 1개의 접촉 면적 = (π/4)(d² − d₁²) = (π/4)(${d}² − ${d1}²) = ${fmt(Abear)} mm²`,
          `z = W / [(π/4)(d² − d₁²)·q] = ${fmt(W * 1e3)} / (${fmt(Abear)} × ${q}) = ${fmt(z)} → 실제로는 올림한 정수 개수 이상으로 한다.`,
          `H = z·p = ${fmt(z)} × ${p} = ${fmt(H)} mm`,
        ],
      };
    },
  },
  {
    id: 'design-riveted-lap-joint',
    subjectId: 'machine_design',
    topic: '리벳',
    title: '1줄 겹치기 리벳 이음의 강도와 효율',
    defaults: { d: 16, p: 50, t: 10, W: 12 },
    vary: (r) => ({ d: range(r, 10, 24, 1), p: range(r, 30, 90, 2), t: range(r, 6, 16, 1), W: range(r, 3, 30, 0.5) }),
    valid: ({ d, p, t, W }) => {
      const tau = (W * 1e3) / ((PI * d * d) / 4);
      const sigma = (W * 1e3) / ((p - d) * t);
      return p >= 2.5 * d && p <= 4.5 * d && tau <= 100 && sigma <= 160;
    },
    build: ({ d, p, t, W }) => {
      const tau = (W * 1e3) / ((PI * d * d) / 4);
      const sigma = (W * 1e3) / ((p - d) * t);
      const eta = (p - d) / p;
      return {
        statement: `두께 t = ${t} mm인 강판 두 장을 1줄 겹치기 리벳 이음으로 잇는다. 리벳 지름(구멍 지름) d = ${d} mm, 피치 p = ${p} mm이고, 한 피치 폭마다 하중 W = ${W} kN이 작용한다.`,
        parts: [
          part('(a)', '리벳의 전단응력 τ', tau, 'MPa', 4),
          part('(b)', '리벳 구멍 사이 강판의 인장응력 σ_t', sigma, 'MPa', 3),
          part('(c)', '강판의 효율 η_t', eta, undefined, 3),
        ],
        hints: [
          '한 피치 폭에는 리벳이 1개 있고, 겹치기 이음에서 리벳은 한 단면에서 전단(1면 전단)됩니다.',
          '강판은 리벳 구멍이 뚫린 단면에서 가장 약합니다. 구멍을 뺀 폭에 두께를 곱해 단면적을 구하세요.',
          '판의 효율은 구멍 뚫린 판과 구멍 없는 판의 인장 강도 비입니다.',
        ],
        solution: [
          `τ = W / (πd²/4) = ${fmt(W * 1e3)} N / ${fmt((PI * d * d) / 4)} mm² = ${fmt(tau)} MPa`,
          `σ_t = W / [(p − d)t] = ${fmt(W * 1e3)} / [(${p} − ${d}) × ${t}] = ${fmt(sigma)} MPa`,
          `η_t = (p − d)/p = (${p} − ${d})/${p} = ${fmt(eta)} (${fmt(eta * 100, 3)}%)`,
          '실제 설계에서는 리벳 지름 앞 판의 압축(σ_c = W/(dt))과 판 끝의 전단도 함께 검토한다.',
        ],
      };
    },
  },
  {
    id: 'design-sunk-key',
    subjectId: 'machine_design',
    topic: '키',
    title: '묻힘키의 전단응력과 압축응력',
    defaults: { d: 50, ...keyFor(50), T: 600, l: 70 },
    vary: (r) => {
      const d = range(r, 32, 85, 1);
      return { d, ...keyFor(d), T: range(r, 100, 2500, 10), l: range(r, 30, 150, 5) };
    },
    valid: ({ d, b, h, T, l }) => {
      const F = (2 * T * 1e3) / d;
      return l >= d && l <= 2.5 * d && F / (b * l) <= 60 && (2 * F) / (h * l) <= 150;
    },
    build: ({ d, b, h, T, l }) => {
      const F = (2 * T * 1e3) / d; // N (T: N·m → N·mm)
      const tau = F / (b * l);
      const sigma = (2 * F) / (h * l);
      return {
        statement: `지름 d = ${d} mm인 축이 토크 T = ${T} N·m를 묻힘키로 풀리에 전달한다. 키의 폭 b = ${b} mm, 높이 h = ${h} mm, 길이 l = ${l} mm이고, 키는 축과 보스에 높이의 절반씩(h/2) 묻혀 있다.`,
        parts: [
          part('(a)', '축 표면(키)에 작용하는 접선력 F', F / 1e3, 'kN', 3),
          part('(b)', '키의 전단응력 τ', tau, 'MPa', 4),
          part('(c)', '키 측면의 압축응력 σ_c', sigma, 'MPa', 3),
        ],
        hints: [
          '토크는 축 반지름 위치에서 키를 미는 접선력으로 바뀝니다. 토크와 지름의 단위를 맞추세요.',
          '키는 축과 보스의 경계면, 즉 폭 b × 길이 l인 면에서 전단됩니다.',
          '측면 압축은 키가 보스에 묻힌 높이(h/2) × 길이 l인 면이 받습니다.',
        ],
        solution: [
          `F = 2T/d = 2 × ${fmt(T * 1e3)} N·mm / ${d} mm = ${fmt(F)} N = ${fmt(F / 1e3)} kN`,
          `τ = F/(b·l) = ${fmt(F)} / (${b} × ${l}) = ${fmt(tau)} MPa`,
          `σ_c = F/[(h/2)·l] = 2F/(h·l) = ${fmt(2 * F)} / (${h} × ${l}) = ${fmt(sigma)} MPa`,
          '키 재료의 허용 전단응력·허용 압축응력과 비교해 길이 l을 정한다. 보통 압축 쪽이 먼저 한계에 이른다.',
        ],
      };
    },
  },
  {
    id: 'design-shaft-combined',
    subjectId: 'machine_design',
    topic: '축',
    title: '굽힘과 비틀림을 함께 받는 전동축',
    defaults: { P: 10, n: 500, M: 150, d: 40 },
    vary: (r) => ({ P: range(r, 1, 100, 0.5), n: range(r, 100, 3000, 50), M: range(r, 20, 3000, 10), d: range(r, 20, 120, 5) }),
    valid: ({ P, n, M, d }) => {
      const T = (60 * P * 1e3) / (2 * PI * n);
      const tau = (16 * sqrt(M * M + T * T)) / (PI * (d / 1000) ** 3) / 1e6;
      return tau >= 10 && tau <= 60;
    },
    build: ({ P, n, M, d }) => {
      const T = (60 * P * 1e3) / (2 * PI * n);
      const Te = sqrt(M * M + T * T);
      const tau = (16 * Te) / (PI * (d / 1000) ** 3) / 1e6;
      return {
        statement: `동력 P = ${P} kW를 ${n} rpm으로 전달하는 지름 d = ${d} mm의 중실축이, 같은 단면에서 굽힘모멘트 M = ${M} N·m도 받는다.`,
        parts: [
          part('(a)', '전달 토크 T', T, 'N·m', 3),
          part('(b)', '상당 비틀림 모멘트 Tₑ', Te, 'N·m', 3),
          part('(c)', '축에 생기는 최대 전단응력 τ_max', tau, 'MPa', 4),
        ],
        hints: [
          '동력 = 토크 × 각속도입니다. rpm을 rad/s로 바꾸세요.',
          '굽힘과 비틀림이 함께 작용하면 최대 전단응력설로 두 모멘트를 하나의 비틀림 모멘트로 합칩니다.',
          '중실축의 비틀림 전단응력 공식에 합친 모멘트를 넣습니다. 지름은 m로 바꾸세요.',
        ],
        solution: [
          `ω = 2π × ${n}/60 = ${fmt((2 * PI * n) / 60)} rad/s`,
          `T = P/ω = ${fmt(P * 1e3)} W / ${fmt((2 * PI * n) / 60)} rad/s = ${fmt(T)} N·m`,
          `Tₑ = √(M² + T²) = √(${M}² + ${fmt(T)}²) = ${fmt(Te)} N·m`,
          `τ_max = 16Tₑ/(πd³) = 16 × ${fmt(Te)} / (π × ${fmt(d / 1000)}³) = ${fmt(tau * 1e6, 4)} Pa = ${fmt(tau)} MPa`,
          '취성 재료라면 최대 주응력설의 상당 굽힘모멘트 Mₑ = (M + Tₑ)/2로 굽힘응력을 함께 검토한다.',
        ],
      };
    },
  },
  {
    id: 'design-flange-coupling',
    subjectId: 'machine_design',
    topic: '축이음',
    title: '플랜지 커플링 볼트의 전단응력',
    defaults: { P: 30, n: 600, Db: 150, z: 6, delta: 12 },
    vary: (r) => ({
      P: range(r, 5, 200, 1),
      n: range(r, 200, 1800, 50),
      Db: range(r, 80, 300, 10),
      z: pick(r, [4, 6, 8]),
      delta: range(r, 8, 24, 2),
    }),
    valid: ({ P, n, Db, z, delta }) => {
      const T = (60 * P * 1e3) / (2 * PI * n);
      const tau = (2 * T * 1e3) / (z * Db) / ((PI * delta * delta) / 4);
      return tau >= 5 && tau <= 50;
    },
    build: ({ P, n, Db, z, delta }) => {
      const T = (60 * P * 1e3) / (2 * PI * n);
      const F = (2 * T) / (z * (Db / 1000));
      const tau = F / ((PI * delta * delta) / 4);
      return {
        statement: `플랜지 커플링이 ${n} rpm에서 동력 P = ${P} kW를 전달한다. 볼트 ${z}개가 지름 D_B = ${Db} mm인 원 위에 같은 간격으로 배치되어 있고, 볼트 지름은 δ = ${delta} mm이다. 토크는 볼트의 전단만으로 전달되고 모든 볼트가 같은 힘을 받는다고 가정한다.`,
        parts: [
          part('(a)', '전달 토크 T', T, 'N·m', 3),
          part('(b)', '볼트 1개에 걸리는 전단력 F', F, 'N', 3),
          part('(c)', '볼트의 전단응력 τ', tau, 'MPa', 4),
        ],
        hints: [
          '동력과 회전수로 토크를 먼저 구하세요. rpm은 rad/s로 바꿔야 합니다.',
          '볼트들은 볼트 원의 반지름 위치에서 접선력을 나눠 받습니다. 볼트 수 × 접선력 × 반지름 = 토크입니다.',
          '볼트는 두 플랜지 사이의 한 단면에서 전단됩니다.',
        ],
        solution: [
          `T = 60P/(2πn) = 60 × ${fmt(P * 1e3)} / (2π × ${n}) = ${fmt(T)} N·m`,
          `z·F·(D_B/2) = T → F = 2T/(z·D_B) = 2 × ${fmt(T)} / (${z} × ${fmt(Db / 1000)}) = ${fmt(F)} N`,
          `τ = F/(πδ²/4) = ${fmt(F)} / ${fmt((PI * delta * delta) / 4)} mm² = ${fmt(tau)} MPa`,
          '실제 커플링은 볼트 체결력에 의한 플랜지 면 마찰도 토크를 전달하므로, 전단만으로 본 이 계산은 안전 쪽이다.',
        ],
      };
    },
  },
  {
    id: 'design-ball-bearing-life',
    subjectId: 'machine_design',
    topic: '베어링',
    title: '볼 베어링의 수명과 동정격하중',
    defaults: { C: 30, P: 3, n: 1000, Lt: 20000 },
    vary: (r) => ({ C: range(r, 5, 100, 0.5), P: range(r, 0.5, 20, 0.1), n: range(r, 100, 5000, 50), Lt: range(r, 5000, 60000, 1000) }),
    valid: ({ C, P, n }) => {
      const Lh = ((C / P) ** 3 * 1e6) / (60 * n);
      return C / P >= 3 && C / P <= 20 && Lh >= 1000 && Lh <= 200000;
    },
    build: ({ C, P, n, Lt }) => {
      const L10 = (C / P) ** 3; // 10⁶ rev
      const Lh = (L10 * 1e6) / (60 * n);
      const Creq = P * Math.cbrt((60 * n * Lt) / 1e6);
      return {
        statement: `기본 동정격하중 C = ${C} kN인 깊은 홈 볼 베어링이 동등가 하중 P = ${P} kN을 받으며 ${n} rpm으로 회전한다.`,
        parts: [
          part('(a)', '정격 수명 시간 L_h', Lh, 'h', 5),
          part('(b)', `같은 하중·회전수에서 수명 ${Lt} h를 얻는 데 필요한 기본 동정격하중 C`, Creq, 'kN', 5),
        ],
        hints: [
          '정격 수명 L₁₀(10⁶ 회전 단위)은 (C/P)의 거듭제곱입니다. 볼 베어링의 수명 지수는 3입니다.',
          '회전 수를 시간으로 바꾸려면 1시간 동안의 회전 수 60n으로 나눕니다.',
          '(b)는 수명 식을 C에 대해 풀면 됩니다. 목표 시간을 먼저 10⁶ 회전 단위로 바꾸세요.',
        ],
        solution: [
          `L₁₀ = (C/P)³ = (${C}/${P})³ = ${fmt(L10)} × 10⁶ rev`,
          `L_h = L₁₀ × 10⁶ / (60n) = ${fmt(L10 * 1e6)} / (60 × ${n}) = ${fmt(Lh)} h`,
          `목표 수명을 회전 수로: L = 60 × ${n} × ${Lt} / 10⁶ = ${fmt((60 * n * Lt) / 1e6)} × 10⁶ rev`,
          `C = P·L^(1/3) = ${P} × ${fmt((60 * n * Lt) / 1e6)}^(1/3) = ${fmt(Creq)} kN → 이보다 큰 C를 가진 베어링을 고른다.`,
          '롤러 베어링이면 수명 지수 10/3을 쓴다. 하중을 절반으로 줄이면 볼 베어링 수명은 8배가 된다.',
        ],
      };
    },
  },
  {
    id: 'design-friction-wheel',
    subjectId: 'machine_design',
    topic: '마찰차',
    title: '원통 마찰차의 지름과 누르는 힘',
    defaults: { D1: 300, n1: 600, n2: 300, P: 2, mu: 0.25 },
    vary: (r) => ({
      D1: range(r, 100, 500, 10),
      n1: range(r, 200, 1500, 50),
      n2: range(r, 100, 1500, 50),
      P: range(r, 0.5, 10, 0.5),
      mu: range(r, 0.15, 0.35, 0.01),
    }),
    valid: ({ D1, n1, n2, P, mu }) => {
      const v = (PI * D1 * n1) / 60000;
      const Q = (P * 1e3) / v / mu;
      return n1 !== n2 && n2 / n1 >= 1 / 3 && n2 / n1 <= 3 && v <= 30 && Q <= 30000;
    },
    build: ({ D1, n1, n2, P, mu }) => {
      const D2 = (D1 * n1) / n2;
      const v = (PI * D1 * n1) / 60000;
      const F = (P * 1e3) / v;
      const Q = F / mu;
      return {
        statement: `두 축을 원통 마찰차로 연결해 동력 P = ${P} kW를 전달한다. 원동차의 지름은 D₁ = ${D1} mm, 회전수는 n₁ = ${n1} rpm이고, 종동차는 n₂ = ${n2} rpm으로 돌아야 한다. 접촉면의 마찰계수는 μ = ${mu}이고 미끄럼은 없다고 본다.`,
        parts: [
          part('(a)', '종동차의 지름 D₂', D2, 'mm', 3),
          part('(b)', '접촉점의 원주 속도 v', v, 'm/s', 3),
          part('(c)', '두 마찰차를 밀어붙이는 데 필요한 힘 Q', Q / 1e3, 'kN', 4),
        ],
        hints: [
          '미끄럼이 없으면 두 바퀴의 접촉점 원주 속도가 같습니다. 그래서 지름과 회전수는 반비례합니다.',
          '원주 속도는 πDn/60입니다. 지름을 m로 바꾸세요.',
          '전달할 접선력은 동력 ÷ 속도이고, 마찰로 이 힘을 내려면 누르는 힘에 μ를 곱한 값이 접선력 이상이어야 합니다.',
        ],
        solution: [
          `D₁n₁ = D₂n₂ → D₂ = D₁·n₁/n₂ = ${D1} × ${n1}/${n2} = ${fmt(D2)} mm`,
          `v = πD₁n₁/60 = π × ${fmt(D1 / 1000)} × ${n1}/60 = ${fmt(v)} m/s`,
          `전달 접선력 F = P/v = ${fmt(P * 1e3)} / ${fmt(v)} = ${fmt(F)} N`,
          `μQ ≥ F → Q = F/μ = ${fmt(F)} / ${mu} = ${fmt(Q)} N = ${fmt(Q / 1e3)} kN`,
          '누르는 힘 Q는 그대로 베어링 하중이 되므로, 큰 동력에는 마찰차보다 기어나 벨트가 유리하다.',
        ],
      };
    },
  },
  {
    id: 'design-spur-gear',
    subjectId: 'machine_design',
    topic: '기어',
    title: '표준 평기어 한 쌍의 치수와 전달력',
    defaults: { m: 4, Z1: 20, Z2: 60, n1: 1200, P: 10 },
    vary: (r) => ({
      m: pick(r, [1.5, 2, 2.5, 3, 4, 5, 6, 8]),
      Z1: range(r, 17, 40, 1),
      Z2: range(r, 20, 150, 1),
      n1: range(r, 300, 3600, 50),
      P: range(r, 0.5, 50, 0.5),
    }),
    valid: ({ m, Z1, Z2, n1, P }) => {
      const v = (PI * m * Z1 * n1) / 60000;
      return Z2 > Z1 && Z2 / Z1 <= 6 && v <= 25 && (P * 1e3) / v <= 20000;
    },
    build: ({ m, Z1, Z2, n1, P }) => {
      const C = (m * (Z1 + Z2)) / 2;
      const n2 = (n1 * Z1) / Z2;
      const v = (PI * m * Z1 * n1) / 60000;
      const F = (P * 1e3) / v;
      return {
        statement: `모듈 m = ${m} mm인 표준 평기어 한 쌍에서 피니언 잇수 Z₁ = ${Z1}, 기어 잇수 Z₂ = ${Z2}이다. 피니언이 ${n1} rpm으로 회전하며 동력 P = ${P} kW를 전달한다.`,
        parts: [
          part('(a)', '중심거리 C', C, 'mm', 3),
          part('(b)', '기어의 회전수 n₂', n2, 'rpm', 2),
          part('(c)', '피치원 위의 원주 속도 v', v, 'm/s', 2),
          part('(d)', '피치원에서 전달되는 접선력 F', F, 'N', 3),
        ],
        hints: [
          '피치원 지름은 모듈 × 잇수입니다. 맞물린 두 피치원은 서로 접하므로 중심거리는 두 반지름의 합입니다.',
          '맞물린 기어는 피치원 원주 속도가 같으므로 회전수는 잇수에 반비례합니다.',
          '접선력은 동력 ÷ 피치원 원주 속도입니다.',
        ],
        solution: [
          `피치원 지름 D₁ = mZ₁ = ${fmt(m * Z1)} mm, D₂ = mZ₂ = ${fmt(m * Z2)} mm`,
          `C = (D₁ + D₂)/2 = m(Z₁ + Z₂)/2 = ${fmt(C)} mm`,
          `n₂ = n₁·Z₁/Z₂ = ${n1} × ${Z1}/${Z2} = ${fmt(n2)} rpm (속도비 ${fmt(Z2 / Z1, 3)})`,
          `v = πD₁n₁/60 = π × ${fmt((m * Z1) / 1000)} × ${n1}/60 = ${fmt(v)} m/s`,
          `F = P/v = ${fmt(P * 1e3)} / ${fmt(v)} = ${fmt(F)} N`,
          '이 접선력으로 루이스 식(굽힘)과 면압 강도를 검토해 이폭을 정한다. 압력각 20° 표준 기어는 잇수 17개 이상이면 언더컷이 생기지 않는다.',
        ],
      };
    },
  },
  {
    id: 'design-flat-belt',
    subjectId: 'machine_design',
    topic: '벨트',
    title: '평벨트의 장력과 전달 동력',
    defaults: { T1: 1500, mu: 0.3, theta: 165, v: 10 },
    vary: (r) => ({ T1: range(r, 300, 5000, 50), mu: range(r, 0.2, 0.4, 0.01), theta: range(r, 120, 180, 1), v: range(r, 5, 30, 0.5) }),
    build: ({ T1, mu, theta, v }) => {
      const ratio = Math.exp(mu * theta * DEG);
      const T2 = T1 / ratio;
      const Te = T1 - T2;
      const P = (Te * v) / 1000;
      return {
        statement: `평벨트가 작은 풀리에 접촉각 θ = ${theta}°로 감겨 있고, 벨트와 풀리 사이의 마찰계수는 μ = ${mu}이다. 긴장측 장력은 허용값인 T₁ = ${T1} N이고 벨트 속도는 v = ${v} m/s이다. 원심력의 영향은 무시하며 벨트는 미끄러지기 직전 상태이다.`,
        parts: [
          part('(a)', '이완측 장력 T₂', T2, 'N', 3),
          part('(b)', '유효 장력 Tₑ', Te, 'N', 3),
          part('(c)', '전달 동력 P', P, 'kW', 4),
        ],
        hints: [
          '미끄러지기 직전 두 장력의 비는 오일러 식 e^(μθ)입니다. 접촉각은 라디안으로 바꾸세요.',
          '풀리를 돌리는 데 실제로 쓰이는 힘은 두 장력의 차이입니다.',
          '동력 = 힘 × 속도입니다.',
        ],
        solution: [
          `θ = ${theta}° = ${fmt(theta * DEG)} rad, μθ = ${fmt(mu * theta * DEG)}`,
          `T₁/T₂ = e^(μθ) = ${fmt(ratio)} → T₂ = ${T1}/${fmt(ratio)} = ${fmt(T2)} N`,
          `Tₑ = T₁ − T₂ = ${T1} − ${fmt(T2)} = ${fmt(Te)} N`,
          `P = Tₑ·v = ${fmt(Te)} × ${v} = ${fmt(Te * v)} W = ${fmt(P)} kW`,
          '속도가 빨라지면 원심 장력 mv²이 긴장측 허용 장력의 일부를 차지하므로, 고속에서는 이를 빼고 계산해야 한다.',
        ],
      };
    },
  },
  {
    id: 'design-block-brake',
    subjectId: 'machine_design',
    topic: '브레이크',
    title: '단식 블록 브레이크의 조작력과 압력',
    defaults: { D: 400, T: 200, mu: 0.3, a: 1000, b: 200, w: 60, e: 100 },
    vary: (r) => ({
      D: range(r, 200, 800, 20),
      T: range(r, 50, 1500, 10),
      mu: range(r, 0.2, 0.5, 0.01),
      a: range(r, 400, 1500, 50),
      b: range(r, 80, 400, 10),
      w: range(r, 40, 150, 5),
      e: range(r, 60, 200, 10),
    }),
    valid: ({ D, T, mu, a, b, w, e }) => {
      const N = (2 * T) / (mu * (D / 1000));
      const F = (N * b) / a;
      return b <= a / 2 && e <= D / 2 && F >= 50 && F <= 1000 && N / (w * e) <= 1;
    },
    build: ({ D, T, mu, a, b, w, e }) => {
      const N = (2 * T) / (mu * (D / 1000));
      const F = (N * b) / a;
      const q = N / (w * e);
      return {
        statement: `지름 D = ${D} mm인 드럼에 제동 토크 T = ${T} N·m를 걸려고 한다. 단식 블록 브레이크의 레버는 힌지에서 블록 중심까지 b = ${b} mm, 힌지에서 손잡이(조작력 F의 작용점)까지 a = ${a} mm이고, 힌지는 마찰력의 작용선 위에 있다(c = 0). 블록의 폭은 ${w} mm, 접촉 길이는 ${e} mm, 마찰계수는 μ = ${mu}이다.`,
        parts: [
          part('(a)', '블록이 드럼을 누르는 힘 N', N, 'N', 3),
          part('(b)', '레버 끝에 가해야 할 조작력 F', F, 'N', 4),
          part('(c)', '블록의 평균 접촉 압력 q', q, 'MPa', 3),
        ],
        hints: [
          '제동 토크는 마찰력 μN이 드럼 반지름에서 만드는 모멘트입니다.',
          '레버를 자유물체로 떼어 힌지에 대한 모멘트 평형을 세우세요. c = 0이면 마찰력은 힌지에 모멘트를 만들지 않습니다.',
          '압력은 누르는 힘을 블록의 투영 접촉 면적(폭 × 길이)으로 나눈 값입니다.',
        ],
        solution: [
          `T = μN·(D/2) → N = 2T/(μD) = 2 × ${T} / (${mu} × ${fmt(D / 1000)}) = ${fmt(N)} N`,
          `힌지에 대한 모멘트 평형: F·a = N·b → F = N·b/a = ${fmt(N)} × ${b}/${a} = ${fmt(F)} N`,
          `q = N/(폭 × 길이) = ${fmt(N)} / (${w} × ${e}) = ${fmt(q)} MPa`,
          'c ≠ 0이면 마찰력 μN이 힌지에 모멘트를 만들어, 드럼 회전 방향에 따라 필요한 조작력이 달라진다.',
        ],
      };
    },
  },
  {
    id: 'design-helical-spring',
    subjectId: 'machine_design',
    topic: '스프링',
    title: '원통 코일 압축 스프링의 응력과 처짐',
    defaults: { d: 6, D: 48, n: 10, W: 300 },
    vary: (r) => ({ d: range(r, 2, 12, 0.5), D: range(r, 10, 120, 1), n: range(r, 3, 20, 1), W: range(r, 20, 3000, 10) }),
    valid: ({ d, D, n, W }) => {
      const C = D / d;
      const K = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
      const tau = (K * 8 * W * D) / (PI * d ** 3);
      const delta = (8 * n * D ** 3 * W) / (80e3 * d ** 4);
      return C >= 4 && C <= 12 && tau >= 100 && tau <= 600 && delta <= 150;
    },
    build: ({ d, D, n, W }) => {
      const C = D / d;
      const K = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
      const tau = (K * 8 * W * D) / (PI * d ** 3);
      const delta = (8 * n * D ** 3 * W) / (80e3 * d ** 4);
      return {
        statement: `소선 지름 d = ${d} mm, 코일 평균 지름 D = ${D} mm, 유효 감김 수 n = ${n}인 강제 원통 코일 압축 스프링에 축하중 W = ${W} N이 작용한다. 가로 탄성계수는 G = 80 GPa이다.`,
        parts: [
          part('(a)', '스프링 지수 C', C, undefined, 2),
          part('(b)', '왈(Wahl)의 응력 수정계수를 적용한 최대 전단응력 τ', tau, 'MPa', 4),
          part('(c)', '스프링의 처짐 δ', delta, 'mm', 4),
        ],
        hints: [
          '스프링 지수는 코일 평균 지름과 소선 지름의 비입니다.',
          '소선은 비틀림을 받는 가는 봉으로 볼 수 있습니다. 코일의 곡률과 직접 전단의 영향은 왈의 수정계수 K = (4C − 1)/(4C − 4) + 0.615/C로 보정합니다.',
          '처짐은 소선 지름의 4제곱에 반비례하고 코일 지름의 세제곱에 비례합니다. 단위를 N과 mm(MPa)로 통일하면 편합니다.',
        ],
        solution: [
          `C = D/d = ${D}/${d} = ${fmt(C)}`,
          `K = (4C − 1)/(4C − 4) + 0.615/C = ${fmt(K)}`,
          `τ = K·8WD/(πd³) = ${fmt(K)} × 8 × ${W} × ${D} / (π × ${d}³) = ${fmt(tau)} MPa`,
          `δ = 8nD³W/(Gd⁴) = 8 × ${n} × ${D}³ × ${W} / (80000 × ${d}⁴) = ${fmt(delta)} mm`,
          `스프링 상수 k = W/δ = ${fmt(W / delta)} N/mm. 스프링 지수가 작을수록(코일이 촘촘하게 감길수록) K가 커진다.`,
        ],
      };
    },
  },
];

// ───────── 설계형 문항: 필요 치수 계산 → 표준 규격 선정 → 선정한 규격으로 재검토 ─────────

// 사각나사 (바깥지름 d, 피치 p) [mm]. 골지름 d₁ = d − p, 유효지름 d₂ = d − p/2.
const SQUARE_THREADS = [
  [22, 5],
  [26, 5],
  [30, 6],
  [36, 6],
  [40, 7],
  [46, 8],
  [50, 8],
  [56, 9],
  [62, 10],
];

// 미터 보통나사 M10~M36 [mm] (골지름 D₁ = d − 1.0825p)
const BOLT_SERIES = [
  { size: 'M10', d: 10, d1: 8.376, p: 1.5 },
  { size: 'M12', d: 12, d1: 10.106, p: 1.75 },
  { size: 'M16', d: 16, d1: 13.835, p: 2 },
  { size: 'M20', d: 20, d1: 17.294, p: 2.5 },
  { size: 'M24', d: 24, d1: 20.752, p: 3 },
  { size: 'M30', d: 30, d1: 26.211, p: 3.5 },
  { size: 'M36', d: 36, d1: 31.67, p: 4 },
];

// 볼트 강도 구분과 항복강도 [MPa]
const BOLT_GRADES = [
  { grade: '4.6', sy: 240 },
  { grade: '5.6', sy: 300 },
  { grade: '8.8', sy: 640 },
];

const RIVET_DIAMETERS = [10, 12, 14, 16, 18, 20, 22, 24, 27, 30];
const KEY_LENGTHS = [14, 16, 18, 20, 22, 25, 28, 32, 36, 40, 45, 50, 56, 63, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200];
const SHAFT_DIAMETERS = [20, 22, 25, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120];
const COUPLING_BOLTS = [8, 10, 12, 16, 20, 24, 30];
// 후보 베어링의 기본 동정격하중 C [kN] (문제용 목록)
const BEARING_RATINGS = [7.8, 10.1, 13.3, 17.8, 22.5, 29.6, 33.5, 41, 52.7, 63.7, 77, 92.6];
const WHEEL_WIDTHS = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150];
const MODULES = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
// 압력각 20° 표준 평기어의 루이스 치형계수 Y (모듈 기준, π 포함)
const LEWIS_Y = { 17: 0.303, 18: 0.309, 19: 0.314, 20: 0.322, 21: 0.328, 22: 0.331, 24: 0.337, 26: 0.346, 28: 0.353, 30: 0.359, 34: 0.371, 38: 0.384 };
const BELT_WIDTHS = [20, 25, 32, 40, 50, 63, 71, 80, 90, 100, 112, 125, 140, 160, 180, 200, 224, 250];

const list = (values, unit) => `${values.join(', ')}${unit ? ` ${unit}` : ''}`;

/** 0.5 단위 격자에서 x 이상인 가장 작은 값 */
const ceilHalf = (x) => Math.ceil(x * 2 - 1e-9) / 2;

export const SIZING_TEMPLATES = [
  {
    id: 'sizing-power-screw',
    topic: '나사',
    title: '나사 잭의 나사 선정과 조작력',
    defaults: { W: 50, sa: 40, mu: 0.1, L: 600 },
    vary: (r) => ({ W: range(r, 10, 150, 5), sa: range(r, 30, 60, 5), mu: range(r, 0.08, 0.15, 0.01), L: range(r, 300, 1000, 50) }),
    valid: (params) => {
      const s = sizePowerScrew(params);
      return s.thread && s.need >= 14 && clearOf(SQUARE_THREADS.map(([d, p]) => d - p), s.need) && s.F >= 50 && s.F <= 600;
    },
    build: (params) => {
      const { W, sa, mu, L } = params;
      const { need, thread, d2, lambda, rho, T, F } = sizePowerScrew(params);
      const [d, p] = thread;
      return {
        statement: `하중 W = ${W} kN을 들어 올리는 1줄 사각나사 잭을 설계한다. 나사봉의 골지름 단면은 압축만 받는다고 보고, 허용 압축응력은 σ_a = ${sa} MPa이다. 사용할 수 있는 사각나사(바깥지름 d × 피치 p, mm)는 ${SQUARE_THREADS.map(([a, b]) => `${a}×${b}`).join(', ')}이고, 골지름 d₁ = d − p, 유효지름 d₂ = d − p/2이다. 나사면의 마찰계수는 μ = ${mu}, 핸들 길이는 L = ${L} mm이며 칼라 마찰은 무시한다.`,
        parts: [
          part('(a)', '압축 강도로 정한 최소 골지름 d₁', need, 'mm', 3),
          select('(b)', '선정한 나사의 바깥지름 d', d, 'mm', 3),
          part('(c)', '선정한 나사로 하중을 들어 올리는 데 필요한 핸들 끝 조작력 F', F, 'N', 4),
        ],
        hints: [
          '골지름 단면적 × 허용응력 ≥ 하중에서 필요한 골지름을 구하세요.',
          '규격표에서 골지름(d − p)이 필요값 이상인 것 중 가장 작은 나사를 고릅니다.',
          '선정한 나사의 유효지름으로 리드각을 구하고, 토크 = W·(d₂/2)·tan(λ + ρ)를 핸들 길이로 나누세요.',
        ],
        solution: [
          `d₁ ≥ √(4W/(πσ_a)) = √(4 × ${fmt(W * 1e3)} / (π × ${sa})) = ${fmt(need)} mm`,
          `골지름이 ${fmt(need)} mm 이상인 가장 작은 나사: ${d}×${p} (d₁ = ${d - p} mm) → d = ${d} mm`,
          `d₂ = ${d} − ${p}/2 = ${fmt(d2)} mm, tan λ = ${p}/(π × ${fmt(d2)}) → λ = ${fmt(lambda / DEG)}°, ρ = tan⁻¹(${mu}) = ${fmt(rho / DEG)}°`,
          `T = W·(d₂/2)·tan(λ + ρ) = ${fmt(W * 1e3)} × ${fmt(d2 / 2000)} × tan(${fmt((lambda + rho) / DEG)}°) = ${fmt(T)} N·m`,
          `F = T/L = ${fmt(T)} / ${fmt(L / 1000)} = ${fmt(F)} N (사람이 낼 수 있는 힘인지 확인한다)`,
        ],
      };
    },
  },
  {
    id: 'sizing-bolt',
    topic: '볼트',
    title: '아이볼트 크기 선정과 안전계수',
    defaults: { W: 30, sa: 60, ...BOLT_GRADES[1] },
    vary: (r) => ({ W: range(r, 5, 150, 1), sa: range(r, 40, 100, 5), ...pick(r, BOLT_GRADES) }),
    valid: ({ W, sa, sy }) => {
      const need = sqrt((4 * W * 1e3) / (PI * sa));
      return sy / sa >= 2 && need >= 6 && need <= BOLT_SERIES.at(-1).d1 && clearOf(BOLT_SERIES.map((b) => b.d1), need);
    },
    build: ({ W, sa, grade, sy }) => {
      const need = sqrt((4 * W * 1e3) / (PI * sa));
      const bolt = BOLT_SERIES.find((b) => b.d1 >= need);
      const sigma = (4 * W * 1e3) / (PI * bolt.d1 ** 2);
      const S = sy / sigma;
      return {
        statement: `축방향 인장하중 W = ${W} kN을 받는 아이볼트를 설계한다. 허용 인장응력은 σ_a = ${sa} MPa이고, 볼트는 강도 구분 ${grade}(항복강도 ${sy} MPa)이다. 사용할 수 있는 미터 보통나사와 골지름 d₁ [mm]은 ${BOLT_SERIES.map((b) => `${b.size}(${b.d1})`).join(', ')}이다. 답은 숫자와 단위로 쓴다(예: M20 → 20 mm).`,
        parts: [
          part('(a)', '필요한 최소 골지름 d₁', need, 'mm', 3),
          select('(b)', '선정한 볼트의 호칭 지름 d', bolt.d, 'mm', 3),
          part('(c)', '선정한 볼트의 항복에 대한 안전계수 S', S, undefined, 4),
        ],
        hints: [
          '볼트는 골지름 단면에서 끊어집니다. 골지름 단면적 × 허용응력 ≥ 하중으로 필요한 골지름을 구하세요.',
          '호칭 지름이 아니라 골지름을 표와 비교해야 합니다.',
          '안전계수는 항복강도를 선정한 볼트에 실제로 생기는 응력으로 나눈 값입니다.',
        ],
        solution: [
          `d₁ ≥ √(4W/(πσ_a)) = √(4 × ${fmt(W * 1e3)} / (π × ${sa})) = ${fmt(need)} mm`,
          `골지름이 ${fmt(need)} mm 이상인 가장 작은 볼트: ${bolt.size} (d₁ = ${bolt.d1} mm) → d = ${bolt.d} mm`,
          `실제 응력 σ = 4W/(πd₁²) = ${fmt(sigma)} MPa`,
          `S = σ_Y/σ = ${sy}/${fmt(sigma)} = ${fmt(S)}`,
          '체결 시 비틀림이 함께 걸리는 볼트는 축하중을 늘려 잡거나(예: 4/3배) 허용응력을 낮춰 설계한다.',
        ],
      };
    },
  },
  {
    id: 'sizing-rivet',
    topic: '리벳',
    title: '겹치기 리벳 이음의 리벳 지름과 피치 설계',
    defaults: { t: 10, W: 15, ta: 70, sta: 110 },
    vary: (r) => ({ t: range(r, 6, 16, 1), W: range(r, 5, 40, 0.5), ta: range(r, 50, 90, 5), sta: range(r, 80, 140, 5) }),
    valid: ({ W, ta }) => {
      const need = sqrt((4 * W * 1e3) / (PI * ta));
      return need >= 8 && need <= RIVET_DIAMETERS.at(-1) && clearOf(RIVET_DIAMETERS, need);
    },
    build: ({ t, W, ta, sta }) => {
      const need = sqrt((4 * W * 1e3) / (PI * ta));
      const d = smallestAtLeast(RIVET_DIAMETERS, need);
      const pmin = d + (W * 1e3) / (sta * t);
      return {
        statement: `두께 t = ${t} mm인 강판을 1줄 겹치기 리벳 이음으로 잇는다. 한 피치 폭마다 하중 W = ${W} kN이 작용하고, 리벳의 허용 전단응력은 τ_a = ${ta} MPa, 강판의 허용 인장응력은 σ_a = ${sta} MPa이다. 리벳 지름은 ${list(RIVET_DIAMETERS, 'mm')} 중에서 고르며, 리벳 지름과 구멍 지름은 같다고 본다.`,
        parts: [
          part('(a)', '전단 강도로 정한 최소 리벳 지름', need, 'mm', 3),
          select('(b)', '선정한 리벳 지름 d', d, 'mm', 3),
          part('(c)', '선정한 리벳 지름에서 강판이 인장으로 파손되지 않는 최소 피치 p', pmin, 'mm', 4),
        ],
        hints: [
          '겹치기 이음의 리벳은 1면 전단입니다. 리벳 단면적 × 허용 전단응력 ≥ 하중입니다.',
          '목록에서 필요값 이상인 가장 작은 지름을 고르세요.',
          '구멍 사이 판의 단면적 (p − d)·t × 허용 인장응력 ≥ 하중에서 p를 구합니다.',
        ],
        solution: [
          `d ≥ √(4W/(πτ_a)) = √(4 × ${fmt(W * 1e3)} / (π × ${ta})) = ${fmt(need)} mm → 선정 d = ${d} mm`,
          `(p − d)·t·σ_a ≥ W → p ≥ d + W/(σ_a·t) = ${d} + ${fmt(W * 1e3)}/(${sta} × ${t}) = ${fmt(pmin)} mm`,
          `실제 리벳 전단응력 = ${fmt((4 * W * 1e3) / (PI * d * d))} MPa ≤ ${ta} MPa`,
          '실제 설계에서는 리벳 앞 판의 압축과 판 끝의 전단, 최소 피치(보통 3d 전후)도 함께 검토한다.',
        ],
      };
    },
  },
  {
    id: 'sizing-key',
    topic: '키',
    title: '묻힘키 길이 설계',
    defaults: { d: 50, ...keyFor(50), T: 600, ta: 40, sca: 90 },
    vary: (r) => {
      const d = range(r, 32, 85, 1);
      return { d, ...keyFor(d), T: range(r, 100, 2500, 10), ta: range(r, 30, 60, 5), sca: range(r, 60, 120, 5) };
    },
    valid: (params) => {
      const { ls, lc } = keyLengths(params);
      const need = Math.max(ls, lc);
      return need >= 14 && need <= 2.5 * params.d && need <= KEY_LENGTHS.at(-1) && clearOf(KEY_LENGTHS, need);
    },
    build: (params) => {
      const { d, b, h, T, ta, sca } = params;
      const { ls, lc } = keyLengths(params);
      const l = smallestAtLeast(KEY_LENGTHS, Math.max(ls, lc));
      return {
        statement: `지름 d = ${d} mm인 축이 토크 T = ${T} N·m를 묻힘키로 전달한다. 키 단면은 b × h = ${b} × ${h} mm이고 축과 보스에 h/2씩 묻힌다. 키의 허용 전단응력은 τ_a = ${ta} MPa, 허용 압축응력은 σ_a = ${sca} MPa이다. 키 길이는 ${list(KEY_LENGTHS, 'mm')} 중에서 고른다.`,
        parts: [
          part('(a)', '전단 강도로 정한 최소 키 길이', ls, 'mm', 3),
          part('(b)', '압축(면압) 강도로 정한 최소 키 길이', lc, 'mm', 3),
          select('(c)', '선정한 키 길이 l', l, 'mm', 4),
        ],
        hints: [
          '토크로 축 표면의 접선력을 먼저 구하세요. N·m와 mm 단위를 맞춰야 합니다.',
          '전단은 b × l 면, 압축은 (h/2) × l 면이 받습니다. 각각 허용응력과 같아지는 길이를 구하세요.',
          '두 조건을 모두 만족해야 하므로 큰 쪽을 기준으로 규격 길이를 고릅니다.',
        ],
        solution: [
          `접선력 F = 2T/d = 2 × ${fmt(T * 1e3)} / ${d} = ${fmt((2 * T * 1e3) / d)} N`,
          `전단: l ≥ F/(b·τ_a) = ${fmt((2 * T * 1e3) / d)} / (${b} × ${ta}) = ${fmt(ls)} mm`,
          `압축: l ≥ F/((h/2)·σ_a) = ${fmt((2 * T * 1e3) / d)} / (${h / 2} × ${sca}) = ${fmt(lc)} mm`,
          `${ls >= lc ? '전단' : '압축'} 조건이 지배한다 → ${fmt(Math.max(ls, lc))} mm 이상인 규격 길이 l = ${l} mm`,
          '키 길이가 축 지름의 2~2.5배를 넘으면 스플라인이나 키 2개를 검토한다.',
        ],
      };
    },
  },
  {
    id: 'sizing-shaft',
    topic: '축',
    title: '굽힘·비틀림을 받는 축 지름 선정',
    defaults: { P: 15, n: 600, M: 300, ta: 40 },
    vary: (r) => ({ P: range(r, 1, 150, 0.5), n: range(r, 100, 3000, 50), M: range(r, 20, 3000, 10), ta: range(r, 20, 50, 5) }),
    valid: (params) => {
      const { need } = sizeShaft(params);
      return need >= 18 && need <= SHAFT_DIAMETERS.at(-1) && clearOf(SHAFT_DIAMETERS, need);
    },
    build: (params) => {
      const { P, n, M, ta } = params;
      const { T, Te, need } = sizeShaft(params);
      const d = smallestAtLeast(SHAFT_DIAMETERS, need);
      const tau = (16 * Te) / (PI * (d / 1000) ** 3) / 1e6;
      return {
        statement: `동력 P = ${P} kW를 ${n} rpm으로 전달하는 중실축이 같은 단면에서 굽힘모멘트 M = ${M} N·m도 받는다. 최대 전단응력설로 설계하며 허용 전단응력은 τ_a = ${ta} MPa이다. 축 지름은 ${list(SHAFT_DIAMETERS, 'mm')} 중에서 고른다.`,
        parts: [
          part('(a)', '필요한 최소 축 지름', need, 'mm', 4),
          select('(b)', '선정한 축 지름 d', d, 'mm', 3),
          part('(c)', '선정한 축에 생기는 최대 전단응력 τ', tau, 'MPa', 3),
        ],
        hints: [
          '동력과 회전수로 토크를 구하고, 굽힘모멘트와 합쳐 상당 비틀림 모멘트를 만드세요.',
          'τ = 16Tₑ/(πd³) = τ_a로 놓고 d를 구합니다. 세제곱근을 구할 때 단위(m)를 확인하세요.',
          '규격 중 필요값 이상인 가장 작은 지름을 고른 뒤, 그 지름으로 응력을 다시 계산합니다.',
        ],
        solution: [
          `T = 60P/(2πn) = ${fmt(T)} N·m, Tₑ = √(M² + T²) = √(${M}² + ${fmt(T)}²) = ${fmt(Te)} N·m`,
          `d ≥ ∛(16Tₑ/(πτ_a)) = ∛(16 × ${fmt(Te)} / (π × ${ta} × 10⁶)) = ${fmt(need / 1000)} m = ${fmt(need)} mm`,
          `규격 지름 중 ${fmt(need)} mm 이상인 가장 작은 값 → d = ${d} mm`,
          `τ = 16Tₑ/(πd³) = 16 × ${fmt(Te)} / (π × ${fmt(d / 1000)}³) = ${fmt(tau)} MPa ≤ ${ta} MPa`,
          '키 홈이 있으면 강도가 줄어드므로 지름을 한 단계 키우거나 응력집중을 고려한다.',
        ],
      };
    },
  },
  {
    id: 'sizing-coupling',
    topic: '축이음',
    title: '플랜지 커플링 볼트 지름 선정',
    defaults: { P: 60, n: 500, Db: 160, z: 6, ta: 25 },
    vary: (r) => ({ P: range(r, 5, 200, 1), n: range(r, 200, 1800, 50), Db: range(r, 80, 300, 10), z: pick(r, [4, 6, 8]), ta: range(r, 20, 40, 5) }),
    valid: (params) => {
      const { need } = sizeCouplingBolt(params);
      return need >= 6 && need <= COUPLING_BOLTS.at(-1) && clearOf(COUPLING_BOLTS, need);
    },
    build: (params) => {
      const { P, n, Db, z, ta } = params;
      const { T, need } = sizeCouplingBolt(params);
      const delta = smallestAtLeast(COUPLING_BOLTS, need);
      const tau = (8 * T * 1e3) / (PI * z * Db * delta ** 2);
      return {
        statement: `${n} rpm에서 동력 P = ${P} kW를 전달하는 플랜지 커플링의 볼트를 설계한다. 볼트 ${z}개가 지름 D_B = ${Db} mm인 원 위에 있고, 토크는 볼트의 전단만으로 전달되며 볼트들이 하중을 똑같이 나눈다고 본다. 볼트의 허용 전단응력은 τ_a = ${ta} MPa이고, 볼트 지름은 ${list(COUPLING_BOLTS, 'mm')} 중에서 고른다.`,
        parts: [
          part('(a)', '전달 토크 T', T, 'N·m', 2),
          part('(b)', '필요한 최소 볼트 지름', need, 'mm', 3),
          select('(c)', '선정한 볼트 지름 δ', delta, 'mm', 2),
          part('(d)', '선정한 볼트의 전단응력 τ', tau, 'MPa', 3),
        ],
        hints: [
          '토크 = 동력 ÷ 각속도입니다.',
          '볼트 수 × (볼트 단면적 × 허용 전단응력) × 볼트 원 반지름 ≥ 토크로 필요한 지름을 구하세요.',
          '선정한 지름으로 같은 식을 거꾸로 써서 실제 전단응력을 구합니다.',
        ],
        solution: [
          `T = 60P/(2πn) = 60 × ${fmt(P * 1e3)} / (2π × ${n}) = ${fmt(T)} N·m`,
          `z·(πδ²/4)·τ_a·(D_B/2) ≥ T → δ ≥ √(8T/(πzD_Bτ_a)) = √(8 × ${fmt(T * 1e3)} / (π × ${z} × ${Db} × ${ta})) = ${fmt(need)} mm`,
          `선정 δ = ${delta} mm`,
          `τ = 8T/(πzD_Bδ²) = ${fmt(tau)} MPa ≤ ${ta} MPa`,
        ],
      };
    },
  },
  {
    id: 'sizing-bearing',
    topic: '베어링',
    title: '목표 수명에 맞는 볼 베어링 선정',
    defaults: { P: 2.5, n: 1500, Lt: 20000 },
    vary: (r) => ({ P: range(r, 0.5, 15, 0.1), n: range(r, 100, 5000, 50), Lt: range(r, 5000, 60000, 1000) }),
    valid: ({ P, n, Lt }) => {
      const need = P * Math.cbrt((60 * n * Lt) / 1e6);
      return need >= 6 && need <= BEARING_RATINGS.at(-1) && clearOf(BEARING_RATINGS, need);
    },
    build: ({ P, n, Lt }) => {
      const L = (60 * n * Lt) / 1e6;
      const need = P * Math.cbrt(L);
      const C = smallestAtLeast(BEARING_RATINGS, need);
      const Lh = ((C / P) ** 3 * 1e6) / (60 * n);
      return {
        statement: `동등가 하중 P = ${P} kN을 받으며 ${n} rpm으로 회전하는 축에 깊은 홈 볼 베어링을 고른다. 목표 수명은 ${Lt} h이다. 후보 베어링의 기본 동정격하중 C는 ${list(BEARING_RATINGS, 'kN')}이다.`,
        parts: [
          part('(a)', '목표 수명에 필요한 최소 기본 동정격하중', need, 'kN', 3),
          select('(b)', '선정한 베어링의 기본 동정격하중 C', C, 'kN', 3),
          part('(c)', '선정한 베어링의 정격 수명 시간 L_h', Lh, 'h', 4),
        ],
        hints: [
          '목표 수명 시간을 10⁶ 회전 단위의 수명으로 바꾸세요.',
          '볼 베어링 수명 식 L = (C/P)³을 C에 대해 풉니다.',
          '선정한 베어링의 C로 수명을 다시 계산하면 목표보다 길게 나와야 합니다.',
        ],
        solution: [
          `L = 60 × ${n} × ${Lt} / 10⁶ = ${fmt(L)} × 10⁶ rev`,
          `C ≥ P·L^(1/3) = ${P} × ${fmt(L)}^(1/3) = ${fmt(need)} kN → 선정 C = ${C} kN`,
          `L_h = (C/P)³ × 10⁶ / (60n) = (${C}/${P})³ × 10⁶ / (60 × ${n}) = ${fmt(Lh)} h ≥ ${Lt} h`,
          '정격 수명은 같은 베어링 무리의 90%가 손상 없이 견디는 수명이다. 충격이 있으면 하중계수를 곱해 P를 키운다.',
        ],
      };
    },
  },
  {
    id: 'sizing-friction-wheel',
    topic: '마찰차',
    title: '원통 마찰차의 폭 설계',
    defaults: { P: 3, D1: 300, n1: 800, mu: 0.25, f: 20 },
    vary: (r) => ({ P: range(r, 0.5, 10, 0.5), D1: range(r, 100, 500, 10), n1: range(r, 200, 1500, 50), mu: range(r, 0.15, 0.35, 0.01), f: range(r, 10, 40, 1) }),
    valid: ({ P, D1, n1, mu, f }) => {
      const v = (PI * D1 * n1) / 60000;
      const need = (P * 1e3) / (mu * v) / f;
      return v <= 30 && need >= 8 && need <= WHEEL_WIDTHS.at(-1) && clearOf(WHEEL_WIDTHS, need);
    },
    build: ({ P, D1, n1, mu, f }) => {
      const v = (PI * D1 * n1) / 60000;
      const Q = (P * 1e3) / (mu * v);
      const need = Q / f;
      const b = smallestAtLeast(WHEEL_WIDTHS, need);
      return {
        statement: `지름 D₁ = ${D1} mm, ${n1} rpm인 원통 마찰차로 동력 P = ${P} kW를 전달한다. 마찰계수는 μ = ${mu}이고, 접촉선 단위 길이(폭 1 mm)당 허용 하중은 f = ${f} N/mm이다. 바퀴 폭은 ${list(WHEEL_WIDTHS, 'mm')} 중에서 고른다.`,
        parts: [
          part('(a)', '두 바퀴를 밀어붙이는 데 필요한 힘 Q', Q, 'N', 3),
          part('(b)', '필요한 최소 바퀴 폭', need, 'mm', 3),
          select('(c)', '선정한 바퀴 폭 b', b, 'mm', 4),
        ],
        hints: [
          '원주 속도로 전달 접선력을 구하고, 마찰로 그 힘을 내는 데 필요한 누르는 힘을 구하세요.',
          '누르는 힘은 접촉선 길이(바퀴 폭) 전체에 나뉘어 걸립니다.',
          '필요한 폭 이상인 가장 작은 규격 폭을 고릅니다.',
        ],
        solution: [
          `v = πD₁n₁/60 = ${fmt(v)} m/s, 접선력 F = P/v = ${fmt((P * 1e3) / v)} N`,
          `Q = F/μ = ${fmt((P * 1e3) / v)} / ${mu} = ${fmt(Q)} N`,
          `b ≥ Q/f = ${fmt(Q)} / ${f} = ${fmt(need)} mm → 선정 b = ${b} mm`,
          `선정한 폭의 선하중 = ${fmt(Q / b)} N/mm ≤ ${f} N/mm`,
        ],
      };
    },
  },
  {
    id: 'sizing-spur-gear',
    topic: '기어',
    title: '루이스 식에 의한 평기어 모듈 선정',
    defaults: { P: 7.5, Z1: 20, n1: 1200, k: 10, sa: 110 },
    vary: (r) => ({
      P: range(r, 1, 50, 0.5),
      Z1: Number(pick(r, Object.keys(LEWIS_Y))),
      n1: range(r, 300, 3600, 50),
      k: pick(r, [8, 10, 12]),
      sa: range(r, 80, 200, 10),
    }),
    valid: (params) => {
      const need = gearModuleNeed(params);
      return need >= 0.8 && need <= MODULES.at(-1) && clearOf(MODULES, need);
    },
    build: (params) => {
      const { P, Z1, n1, k, sa } = params;
      const Y = LEWIS_Y[Z1];
      const need = gearModuleNeed(params);
      const m = smallestAtLeast(MODULES, need);
      const v = (PI * m * Z1 * n1) / 60000;
      const F = (P * 1e3) / v;
      const sigma = F / (k * m * m * Y);
      return {
        statement: `잇수 Z₁ = ${Z1}인 피니언이 ${n1} rpm으로 회전하며 동력 P = ${P} kW를 전달한다. 압력각 20° 표준 평기어이고 치형계수는 Y = ${Y}, 이폭은 b = ${k}m(모듈의 ${k}배), 허용 굽힘응력은 σ_a = ${sa} MPa이다. 루이스 식 σ = F/(b·m·Y)로 설계하며 속도계수(동하중)는 무시한다. 모듈은 ${list(MODULES, 'mm')} 중에서 고른다.`,
        parts: [
          part('(a)', '굽힘 강도로 정한 최소 모듈', need, 'mm', 4),
          select('(b)', '선정한 모듈 m', m, 'mm', 3),
          part('(c)', '선정한 모듈에서 이뿌리에 생기는 굽힘응력 σ', sigma, 'MPa', 3),
        ],
        hints: [
          '접선력 F = P/v이고, 피치원 속도 v도 모듈에 비례합니다(D₁ = mZ₁). 그래서 F도 m에 따라 달라집니다.',
          'σ = F/(k·m·m·Y)에 F를 m으로 나타내 넣으면 σ는 m³에 반비례합니다. σ = σ_a로 놓고 m을 구하세요.',
          '선정한 모듈로 v, F, σ를 차례로 다시 계산합니다.',
        ],
        solution: [
          `v = πmZ₁n₁/60000 [m/s] (m: mm), F = P/v → σ = F/(k·m²·Y) = 60000P/(πZ₁n₁·k·Y·m³)`,
          `m ≥ ∛(60000P/(πZ₁n₁kYσ_a)) = ∛(60000 × ${fmt(P * 1e3)} / (π × ${Z1} × ${n1} × ${k} × ${Y} × ${sa})) = ${fmt(need)} mm`,
          `선정 m = ${m} mm → D₁ = ${fmt(m * Z1)} mm, v = ${fmt(v)} m/s, F = ${fmt(F)} N`,
          `σ = F/(b·m·Y) = ${fmt(F)} / (${fmt(k * m)} × ${m} × ${Y}) = ${fmt(sigma)} MPa ≤ ${sa} MPa`,
          '실제 설계에서는 속도계수로 동하중을 반영하고, 면압(피팅) 강도도 함께 검토한다.',
        ],
      };
    },
  },
  {
    id: 'sizing-flat-belt',
    topic: '벨트',
    title: '평벨트 폭 선정',
    defaults: { P: 5, v: 10, mu: 0.3, theta: 165, t: 5, sa: 2 },
    vary: (r) => ({
      P: range(r, 1, 40, 0.5),
      v: range(r, 5, 30, 0.5),
      mu: range(r, 0.2, 0.4, 0.01),
      theta: range(r, 120, 180, 1),
      t: pick(r, [3, 4, 5, 6]),
      sa: range(r, 1.5, 3, 0.1),
    }),
    valid: (params) => {
      const { need } = sizeBelt(params);
      return need >= 16 && need <= BELT_WIDTHS.at(-1) && clearOf(BELT_WIDTHS, need);
    },
    build: (params) => {
      const { P, v, mu, theta, t, sa } = params;
      const { ratio, Te, T1, need } = sizeBelt(params);
      const b = smallestAtLeast(BELT_WIDTHS, need);
      return {
        statement: `평벨트로 동력 P = ${P} kW를 벨트 속도 v = ${v} m/s로 전달한다. 작은 풀리의 접촉각은 θ = ${theta}°, 마찰계수는 μ = ${mu}이고 원심력은 무시한다. 벨트 두께는 t = ${t} mm, 허용 인장응력은 σ_a = ${sa} MPa(이음 효율 포함)이다. 벨트 폭은 ${list(BELT_WIDTHS, 'mm')} 중에서 고른다.`,
        parts: [
          part('(a)', '긴장측 장력 T₁', T1, 'N', 3),
          part('(b)', '필요한 최소 벨트 폭', need, 'mm', 3),
          select('(c)', '선정한 벨트 폭 b', b, 'mm', 4),
        ],
        hints: [
          '유효 장력(T₁ − T₂)은 동력 ÷ 속도이고, 미끄러지기 직전에는 T₁/T₂ = e^(μθ)입니다. 두 식을 연립하세요.',
          '긴장측 장력을 벨트 단면(폭 × 두께)이 허용응력으로 견뎌야 합니다.',
          '필요한 폭 이상인 가장 작은 규격 폭을 고릅니다.',
        ],
        solution: [
          `Tₑ = P/v = ${fmt(P * 1e3)} / ${v} = ${fmt(Te)} N, e^(μθ) = e^(${mu} × ${fmt(theta * DEG)}) = ${fmt(ratio)}`,
          `T₁ = Tₑ·e^(μθ)/(e^(μθ) − 1) = ${fmt(Te)} × ${fmt(ratio)} / ${fmt(ratio - 1)} = ${fmt(T1)} N`,
          `b ≥ T₁/(σ_a·t) = ${fmt(T1)} / (${sa} × ${t}) = ${fmt(need)} mm → 선정 b = ${b} mm`,
          '고속이면 원심 장력 mv²을 T₁에서 빼야 하므로 같은 동력에도 폭이 더 커진다.',
        ],
      };
    },
  },
  {
    id: 'sizing-block-brake',
    topic: '브레이크',
    title: '블록 브레이크 레버 길이 설계',
    defaults: { T: 150, D: 400, mu: 0.3, b: 150, Fmax: 200 },
    vary: (r) => ({ T: range(r, 30, 600, 10), D: range(r, 200, 800, 20), mu: range(r, 0.25, 0.5, 0.01), b: range(r, 80, 250, 10), Fmax: range(r, 150, 300, 10) }),
    valid: ({ T, D, mu, b, Fmax }) => {
      const amin = ((2 * T) / (mu * (D / 1000)) * b) / Fmax;
      const grid = [Math.floor(amin / 50) * 50, Math.ceil(amin / 50) * 50].filter((x) => x > 0);
      return amin >= 300 && amin <= 2500 && b <= amin / 2 && clearOf(grid, amin);
    },
    build: ({ T, D, mu, b, Fmax }) => {
      const N = (2 * T) / (mu * (D / 1000));
      const amin = (N * b) / Fmax;
      const a = Math.ceil(amin / 50) * 50;
      return {
        statement: `지름 D = ${D} mm인 드럼에 제동 토크 T = ${T} N·m를 거는 단식 블록 브레이크를 설계한다. 마찰계수는 μ = ${mu}, 힌지에서 블록 중심까지 거리는 b = ${b} mm이고 힌지는 마찰력의 작용선 위에 있다(c = 0). 사람이 레버 끝에 가하는 힘은 F = ${Fmax} N 이하로 하고, 레버 길이 a(힌지~손잡이)는 50 mm 단위로 올려 정한다.`,
        parts: [
          part('(a)', '블록이 드럼을 누르는 힘 N', N, 'N', 3),
          part('(b)', '조작력 조건을 만족하는 최소 레버 길이', amin, 'mm', 3),
          select('(c)', '정한 레버 길이 a', a, 'mm', 4),
        ],
        hints: [
          '제동 토크 = 마찰력 μN × 드럼 반지름입니다.',
          '레버의 힌지에 대한 모멘트 평형 F·a = N·b에서, F가 허용값일 때의 a가 최소 길이입니다.',
          '최소 길이를 50 mm 단위로 올립니다. 내리면 조작력이 허용값을 넘습니다.',
        ],
        solution: [
          `N = 2T/(μD) = 2 × ${T} / (${mu} × ${fmt(D / 1000)}) = ${fmt(N)} N`,
          `F·a = N·b, F ≤ ${Fmax} N → a ≥ N·b/F = ${fmt(N)} × ${b} / ${Fmax} = ${fmt(amin)} mm`,
          `50 mm 단위로 올림 → a = ${a} mm (이때 조작력 ${fmt((N * b) / a)} N)`,
          '레버가 너무 길면 배치가 어렵다. 그럴 때는 마찰계수가 큰 라이닝, 큰 드럼, 복식 블록이나 밴드 브레이크를 검토한다.',
        ],
      };
    },
  },
  {
    id: 'sizing-spring',
    topic: '스프링',
    title: '목표 처짐을 위한 코일 스프링 감김 수 설계',
    defaults: { W: 200, delta: 30, d: 4, D: 32 },
    vary: (r) => ({ W: range(r, 50, 2000, 10), delta: range(r, 5, 80, 1), d: range(r, 2, 12, 0.5), D: range(r, 10, 120, 1) }),
    valid: ({ W, delta, d, D }) => {
      const C = D / d;
      const K = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
      const tau = (K * 8 * W * D) / (PI * d ** 3);
      const need = (80e3 * d ** 4 * delta) / (8 * D ** 3 * W);
      const grid = [Math.floor(need * 2) / 2, Math.ceil(need * 2) / 2].filter((x) => x > 0);
      return C >= 4 && C <= 12 && tau <= 600 && need >= 3 && need <= 25 && clearOf(grid, need);
    },
    build: ({ W, delta, d, D }) => {
      const need = (80e3 * d ** 4 * delta) / (8 * D ** 3 * W);
      const n = ceilHalf(need);
      const actual = (8 * n * D ** 3 * W) / (80e3 * d ** 4);
      return {
        statement: `소선 지름 d = ${d} mm, 코일 평균 지름 D = ${D} mm인 강제 압축 코일 스프링이 하중 W = ${W} N에서 ${delta} mm 이상 처지도록 유효 감김 수를 정한다. 가로 탄성계수는 G = 80 GPa이고, 유효 감김 수는 0.5 단위로 올려 정한다.`,
        parts: [
          part('(a)', '목표 처짐을 내는 유효 감김 수(계산값)', need, undefined, 3),
          select('(b)', '정한 유효 감김 수 n', n, undefined, 3),
          part('(c)', '정한 감김 수에서 하중 W일 때의 처짐 δ', actual, 'mm', 4),
        ],
        hints: [
          '처짐 식 δ = 8nD³W/(Gd⁴)을 n에 대해 푸세요. G는 MPa(N/mm²)로 쓰면 mm 단위로 바로 계산됩니다.',
          '처짐이 목표 이상이어야 하므로 감김 수를 올림합니다(감김 수가 많을수록 더 처짐).',
          '정한 감김 수로 처짐을 다시 계산하면 목표보다 조금 커야 합니다.',
        ],
        solution: [
          `n = Gd⁴δ/(8D³W) = 80000 × ${d}⁴ × ${delta} / (8 × ${D}³ × ${W}) = ${fmt(need)}`,
          `0.5 단위로 올림 → n = ${n}`,
          `δ = 8nD³W/(Gd⁴) = 8 × ${n} × ${D}³ × ${W} / (80000 × ${d}⁴) = ${fmt(actual)} mm ≥ ${delta} mm`,
          `스프링 상수 k = W/δ = ${fmt(W / actual)} N/mm. 전체 감김 수는 양 끝의 자리 감김(보통 1~2권)을 더해 정한다.`,
        ],
      };
    },
  },
].map((t) => ({ ...t, subjectId: 'machine_design', kind: 'design' }));

function sizePowerScrew({ W, sa, mu, L }) {
  const need = sqrt((4 * W * 1e3) / (PI * sa));
  const thread = SQUARE_THREADS.find(([d, p]) => d - p >= need);
  if (!thread) return { need };
  const [d, p] = thread;
  const d2 = d - p / 2;
  const lambda = Math.atan(p / (PI * d2));
  const rho = Math.atan(mu);
  const T = W * 1e3 * (d2 / 2000) * tan(lambda + rho);
  return { need, thread, d2, lambda, rho, T, F: T / (L / 1000) };
}

function keyLengths({ d, b, h, T, ta, sca }) {
  const F = (2 * T * 1e3) / d;
  return { ls: F / (b * ta), lc: F / ((h / 2) * sca) };
}

function sizeShaft({ P, n, M, ta }) {
  const T = (60 * P * 1e3) / (2 * PI * n);
  const Te = sqrt(M * M + T * T);
  return { T, Te, need: Math.cbrt((16 * Te) / (PI * ta * 1e6)) * 1000 };
}

function sizeCouplingBolt({ P, n, Db, z, ta }) {
  const T = (60 * P * 1e3) / (2 * PI * n);
  return { T, need: sqrt((8 * T * 1e3) / (PI * z * Db * ta)) };
}

function gearModuleNeed({ P, Z1, n1, k, sa }) {
  return Math.cbrt((60000 * P * 1e3) / (PI * Z1 * n1 * k * LEWIS_Y[Z1] * sa));
}

function sizeBelt({ P, v, mu, theta, t, sa }) {
  const ratio = Math.exp(mu * theta * DEG);
  const Te = (P * 1e3) / v;
  const T1 = (Te * ratio) / (ratio - 1);
  return { ratio, Te, T1, need: T1 / (sa * t) };
}

export const MACHINE_DESIGN_TEMPLATES = [...CALCULATION_TEMPLATES, ...SIZING_TEMPLATES];
