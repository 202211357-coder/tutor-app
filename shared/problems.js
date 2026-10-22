// 과목별 연습 문제 템플릿.
// - 각 문제는 변수(params)로 문장·정답·풀이를 만드는 템플릿이다. seed가 0이면 기본 숫자, 그 외에는 seed로 숫자를 뽑는다.
// - 같은 seed는 항상 같은 숫자를 만든다(결정적). 그래서 채점할 때 서버가 seed만 받아 같은 문제를 다시 만든다.
// - answer, solution은 서버에서만 쓴다. 목록 API는 toPublicProblem()으로 가린 뒤 보낸다.
// - hints는 최종 값을 포함하지 않도록 작성한다.
// - 정답 공식은 shared/problems.test.js에서 독립적으로 다시 계산해 검증한다.

const { PI, sqrt, sin, cos, tan } = Math;
const G = 9.81;
const DEG = PI / 180;

export const MAX_SEED = 2 ** 31 - 1;

export function isValidSeed(seed) {
  return Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED;
}

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

const pick = (rng, values) => values[Math.floor(rng() * values.length)];

/** min~max 사이에서 step 간격의 값을 고른다 (부동소수점 꼬리 없이 step의 자릿수로 반올림). */
const range = (rng, min, max, step) => {
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

const part = (label, prompt, value, unit, points) => ({ label, prompt, answer: unit ? { value, unit } : { value }, points });

// 정수압 문제의 유체 (밀도, kg/m³)
const FLUIDS = [
  { fluid: '물', rho: 1000 },
  { fluid: '바닷물', rho: 1025 },
  { fluid: '기름', rho: 850 },
];

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

const TEMPLATES = [
  // ───────── 정역학 ─────────
  {
    id: 'statics-simply-supported-beam',
    subjectId: 'statics',
    topic: '보의 반력',
    title: '단순지지보의 반력과 최대 굽힘모멘트',
    defaults: { L: 4, P: 10 },
    vary: (r) => ({ L: range(r, 2, 10, 0.5), P: range(r, 2, 50, 1) }),
    build: ({ L, P }) => {
      const RA = P / 2;
      const M = (P * L) / 4;
      return {
        statement: `길이 L = ${L} m인 단순지지보 AB의 중앙에 집중하중 P = ${P} kN이 아래로 작용한다. 보의 자중은 무시한다.`,
        parts: [part('(a)', '지점 A의 수직 반력 R_A', RA, 'kN', 4), part('(b)', '최대 굽힘모멘트 M_max', M, 'kN·m', 6)],
        hints: [
          '자유물체도를 그리고 A, B 지점의 수직 반력을 표시하세요.',
          '하중이 정중앙에 있으므로 대칭을 이용할 수 있습니다. 모멘트 평형은 한 지점을 기준으로 세우면 미지수가 하나 줄어듭니다.',
          '최대 굽힘모멘트는 전단력이 0이 되는(부호가 바뀌는) 위치에서 생깁니다.',
        ],
        solution: [
          `ΣM_B = 0: R_A·L − P·(L/2) = 0 → R_A = P/2 = ${P}/2 = ${fmt(RA)} kN`,
          `ΣF_y = 0: R_A + R_B = P → R_B = ${fmt(RA)} kN`,
          `전단력은 중앙에서 +${fmt(RA)} kN → −${fmt(RA)} kN으로 바뀌므로 최대 모멘트는 중앙에서 생긴다.`,
          `M_max = R_A·(L/2) = ${fmt(RA)} kN × ${fmt(L / 2)} m = ${fmt(M)} kN·m (공식 PL/4와 같음)`,
        ],
      };
    },
  },
  {
    id: 'statics-cantilever',
    subjectId: 'statics',
    topic: '보의 반력',
    title: '캔틸레버보의 고정단 반력',
    defaults: { L: 2, P: 3 },
    vary: (r) => ({ L: range(r, 0.5, 5, 0.25), P: range(r, 1, 30, 0.5) }),
    build: ({ L, P }) => ({
      statement: `길이 L = ${L} m인 캔틸레버보의 자유단에 집중하중 P = ${P} kN이 아래로 작용한다. 자중은 무시한다.`,
      parts: [part('(a)', '고정단의 수직 반력 R', P, 'kN', 4), part('(b)', '고정단의 반력 모멘트 M_A의 크기', P * L, 'kN·m', 6)],
      hints: [
        '고정단은 수직 반력, 수평 반력, 반력 모멘트의 세 가지 반력을 가집니다.',
        '고정단을 기준점으로 모멘트 평형을 세우면 반력 모멘트를 바로 구할 수 있습니다.',
      ],
      solution: [
        `ΣF_y = 0: R − P = 0 → R = ${P} kN`,
        `ΣM_A = 0: M_A − P·L = 0 → M_A = ${P} kN × ${L} m = ${fmt(P * L)} kN·m`,
        '캔틸레버에서는 고정단의 굽힘모멘트가 가장 크다 (|M_max| = PL).',
      ],
    }),
  },
  {
    id: 'statics-two-cables',
    subjectId: 'statics',
    topic: '힘의 평형',
    title: '두 케이블로 매단 하중',
    defaults: { W: 1000, thA: 30, thB: 60 },
    vary: (r) => ({ W: range(r, 200, 5000, 50), thA: range(r, 10, 40, 1), thB: range(r, 45, 80, 1) }),
    build: ({ W, thA, thB }) => {
      const TA = W / (2 * sin(thA * DEG));
      const TB = W / (2 * sin(thB * DEG));
      return {
        statement: `무게 W = ${W} N인 물체를 두 케이블이 좌우 대칭으로 매달고 있다. 각 케이블은 수평면과 θ의 각을 이룬다.`,
        parts: [
          part('(a)', `θ = ${thA}°일 때 케이블 하나의 장력 T`, TA, 'N', 5),
          part('(b)', `θ = ${thB}°일 때 케이블 하나의 장력 T`, TB, 'N', 5),
        ],
        hints: [
          '물체를 자유물체로 떼어 내고 두 장력과 무게를 표시하세요. 대칭이므로 두 장력의 크기는 같습니다.',
          '수평 성분은 서로 상쇄됩니다. 수직 방향 힘의 평형만 쓰면 됩니다.',
          '각도가 커지면(케이블이 더 수직에 가까우면) 장력은 커질까요, 작아질까요?',
        ],
        solution: [
          'ΣF_y = 0: 2T·sinθ − W = 0 → T = W / (2 sinθ)',
          `(a) θ = ${thA}°: T = ${W} / (2 × ${fmt(sin(thA * DEG))}) = ${fmt(TA)} N`,
          `(b) θ = ${thB}°: T = ${W} / (2 × ${fmt(sin(thB * DEG))}) = ${fmt(TB)} N`,
          '케이블이 수평에 가까울수록 sinθ가 작아져 장력이 급격히 커진다.',
        ],
      };
    },
  },
  {
    id: 'statics-incline-friction',
    subjectId: 'statics',
    topic: '마찰',
    title: '경사면 위 블록의 정지마찰',
    defaults: { m: 10, th: 30 },
    vary: (r) => ({ m: range(r, 1, 50, 0.5), th: range(r, 5, 34, 1) }),
    // μs = 0.7이므로 tanθ < 0.7 (θ < 35°)이면 블록이 정지 상태를 유지한다.
    valid: ({ th }) => tan(th * DEG) < 0.7,
    build: ({ m, th }) => {
      const F = m * G * sin(th * DEG);
      const N = m * G * cos(th * DEG);
      const mu = tan(th * DEG);
      return {
        statement: `질량 m = ${m} kg인 블록이 수평과 ${th}°를 이루는 경사면 위에 정지해 있다. g = 9.81 m/s², 정지마찰계수 μs = 0.7.`,
        parts: [
          part('(a)', '블록이 정지해 있기 위해 필요한 마찰력의 크기 F', F, 'N', 3),
          part('(b)', '경사면이 블록에 주는 수직항력 N', N, 'N', 3),
          part('(c)', '미끄러지지 않기 위한 최소 정지마찰계수 μ_min', mu, '', 4),
        ],
        hints: [
          '좌표축을 경사면에 평행·수직 방향으로 잡으면 식이 간단해집니다.',
          '정지 상태의 마찰력은 μN이 아니라 평형 조건에서 정해집니다. μs·N은 최대 정지마찰력입니다.',
          '미끄러지기 직전에는 필요한 마찰력이 최대 정지마찰력과 같아집니다.',
        ],
        solution: [
          `경사면 방향 평형: F = mg sinθ = ${m} × 9.81 × ${fmt(sin(th * DEG))} = ${fmt(F)} N`,
          `경사면 수직 방향 평형: N = mg cosθ = ${m} × 9.81 × ${fmt(cos(th * DEG))} = ${fmt(N)} N`,
          `미끄러지기 직전: μ_min·N = mg sinθ → μ_min = tanθ = tan${th}° = ${fmt(mu)}`,
          `μs = 0.7 > ${fmt(mu)} 이므로 블록은 정지 상태를 유지한다. (최대 정지마찰력 0.7 × ${fmt(N)} = ${fmt(0.7 * N)} N > ${fmt(F)} N)`,
        ],
      };
    },
  },
  {
    id: 'statics-simple-truss',
    subjectId: 'statics',
    topic: '트러스',
    title: '삼각형 트러스의 부재력 (절점법)',
    defaults: { s: 4, h: 3, P: 12 },
    vary: (r) => ({ s: range(r, 2, 12, 0.5), h: range(r, 1, 6, 0.5), P: range(r, 2, 50, 1) }),
    build: ({ s, h, P }) => {
      const RA = P / 2;
      const lac = sqrt((s / 2) ** 2 + h ** 2);
      const FAC = (RA * lac) / h;
      const FAB = (FAC * (s / 2)) / lac;
      return {
        statement: `지점 A(핀)와 B(롤러) 사이 거리는 ${s} m이다. 꼭짓점 C는 AB의 중점 바로 위 ${h} m 높이에 있고, C에 수직 하중 P = ${P} kN이 아래로 작용한다. 부재는 AC, BC, AB 세 개이다.`,
        parts: [
          part('(a)', '지점 A의 수직 반력 R_A', RA, 'kN', 3),
          part('(b)', '부재 AC의 부재력 크기 F_AC', FAC, 'kN', 4),
          part('(c)', '부재 AB의 부재력 크기 F_AB', FAB, 'kN', 3),
        ],
        hints: [
          '먼저 트러스 전체를 자유물체로 보고 반력을 구하세요. 구조와 하중이 대칭입니다.',
          `절점 A에서는 미지 부재력이 두 개뿐입니다. 부재 AC의 방향 성분(수평 ${s / 2} m, 수직 ${h} m)을 이용하세요.`,
          '부재력의 부호(인장/압축)는 절점에서 부재를 미는지 당기는지로 판단합니다.',
        ],
        solution: [
          `대칭: R_A = R_B = P/2 = ${fmt(RA)} kN`,
          `AC 길이 = √(${s / 2}² + ${h}²) = ${fmt(lac)} m`,
          `절점 A, 수직 평형: F_AC × (${h}/${fmt(lac)}) = ${fmt(RA)} → F_AC = ${fmt(FAC)} kN (압축)`,
          `절점 A, 수평 평형: F_AB = F_AC × (${s / 2}/${fmt(lac)}) = ${fmt(FAB)} kN (인장)`,
        ],
      };
    },
  },

  // ───────── 재료역학 ─────────
  {
    id: 'mom-axial-rod',
    subjectId: 'mechanics_of_materials',
    topic: '축하중',
    title: '원형봉의 축응력과 신장량',
    defaults: { d: 20, L: 1, P: 31.4 },
    vary: (r) => ({ d: range(r, 8, 40, 1), L: range(r, 0.2, 3, 0.1), P: range(r, 1, 100, 0.5) }),
    // 선형 탄성 가정이 성립하도록 응력을 일반 강재 항복강도보다 낮게 유지한다.
    valid: ({ d, P }) => (P * 1000) / ((PI * d ** 2) / 4) <= 250,
    build: ({ d, L, P }) => {
      const A = (PI * d ** 2) / 4;
      const sigma = (P * 1000) / A;
      const delta = (sigma * L * 1000) / 200e3;
      return {
        statement: `지름 d = ${d} mm, 길이 L = ${L} m인 강재 원형봉에 인장 하중 P = ${P} kN이 작용한다. 탄성계수 E = 200 GPa.`,
        parts: [part('(a)', '축응력 σ', sigma, 'MPa', 5), part('(b)', '신장량 δ', delta, 'mm', 5)],
        hints: [
          '축응력은 하중을 단면적으로 나눈 값입니다. 원형 단면적 공식을 지름으로 쓰는지 반지름으로 쓰는지 확인하세요.',
          'N/mm²는 MPa와 같습니다. mm 단위로 계산하면 환산이 간단해집니다.',
          '신장량은 후크의 법칙 σ = Eε와 ε = δ/L을 결합해 구합니다.',
        ],
        solution: [
          `A = πd²/4 = π × ${d}² / 4 = ${fmt(A)} mm²`,
          `σ = P/A = ${fmt(P * 1000)} N / ${fmt(A)} mm² = ${fmt(sigma)} N/mm² = ${fmt(sigma)} MPa`,
          `δ = σL/E = ${fmt(sigma)} MPa × ${fmt(L * 1000)} mm / 200,000 MPa = ${fmt(delta)} mm`,
        ],
      };
    },
  },
  {
    id: 'mom-torsion-shaft',
    subjectId: 'mechanics_of_materials',
    topic: '비틀림',
    title: '중실축의 비틀림',
    defaults: { d: 40, L: 1, T: 500 },
    vary: (r) => ({ d: range(r, 15, 80, 1), L: range(r, 0.3, 3, 0.1), T: range(r, 50, 3000, 10) }),
    valid: ({ d, T }) => (16 * T) / (PI * (d / 1000) ** 3) / 1e6 <= 150,
    build: ({ d, L, T }) => {
      const dm = d / 1000;
      const J = (PI * dm ** 4) / 32;
      const tau = (16 * T) / (PI * dm ** 3) / 1e6;
      const phi = (T * L) / (80e9 * J);
      return {
        statement: `지름 d = ${d} mm, 길이 L = ${L} m인 중실 원형축에 토크 T = ${T} N·m가 작용한다. 전단탄성계수 G = 80 GPa.`,
        parts: [part('(a)', '최대 전단응력 τ_max', tau, 'MPa', 5), part('(b)', '비틀림각 φ', phi, 'rad', 5)],
        hints: [
          '비틀림 전단응력은 τ = Tr/J이며, 최대값은 바깥 표면(r = d/2)에서 생깁니다.',
          '중실 원형 단면의 극관성모멘트 J는 d의 4제곱에 비례합니다. mm와 m를 섞지 않도록 주의하세요.',
          '비틀림각 φ = TL/(GJ)의 결과는 라디안입니다.',
        ],
        solution: [
          `J = πd⁴/32 = π × ${dm}⁴ / 32 = ${fmt(J)} m⁴`,
          `τ_max = T(d/2)/J = 16T/(πd³) = 16 × ${T} / (π × ${dm}³) = ${fmt(tau)} MPa`,
          `φ = TL/(GJ) = ${T} × ${L} / (80 × 10⁹ × ${fmt(J)}) = ${fmt(phi)} rad (≈ ${fmt(phi / DEG, 3)}°)`,
        ],
      };
    },
  },
  {
    id: 'mom-bending-stress',
    subjectId: 'mechanics_of_materials',
    topic: '굽힘',
    title: '직사각형 단면보의 굽힘응력',
    defaults: { b: 50, h: 100, M: 5 },
    vary: (r) => ({ b: range(r, 20, 100, 5), h: range(r, 40, 250, 5), M: range(r, 0.5, 30, 0.5) }),
    // 세운 직사각형 단면(h ≥ b)이고 응력이 항복강도보다 낮은 조합만 쓴다.
    valid: ({ b, h, M }) => h >= b && (M * 1e6 * (h / 2)) / ((b * h ** 3) / 12) <= 250,
    build: ({ b, h, M }) => {
      const I = (b * h ** 3) / 12;
      const sigma = (M * 1e6 * (h / 2)) / I;
      return {
        statement: `폭 b = ${b} mm, 높이 h = ${h} mm인 직사각형 단면보에 굽힘모멘트 M = ${M} kN·m가 작용한다.`,
        parts: [
          part('(a)', '중립축에 대한 단면 2차 모멘트 I', I, 'mm⁴', 4),
          part('(b)', '최대 굽힘응력 σ_max', sigma, 'MPa', 6),
        ],
        hints: [
          '직사각형 단면의 I는 높이 h의 세제곱에 비례합니다. 어느 방향이 굽힘 방향인지 확인하세요.',
          '굽힘응력 σ = My/I에서 최대값은 중립축에서 가장 먼 곳(y = h/2)에서 생깁니다.',
          'M을 N·mm로 바꾸면 결과가 바로 N/mm²(MPa)로 나옵니다.',
        ],
        solution: [
          `I = bh³/12 = ${b} × ${h}³ / 12 = ${fmt(I)} mm⁴`,
          `M = ${M} kN·m = ${fmt(M * 1e6)} N·mm, y_max = h/2 = ${h / 2} mm`,
          `σ_max = M·y_max / I = ${fmt(M * 1e6)} × ${h / 2} / ${fmt(I)} = ${fmt(sigma)} MPa`,
        ],
      };
    },
  },
  {
    id: 'mom-thermal-stress',
    subjectId: 'mechanics_of_materials',
    topic: '열응력',
    title: '양단 고정봉의 열응력',
    defaults: { L: 1, dT: 50 },
    vary: (r) => ({ L: range(r, 0.2, 5, 0.1), dT: range(r, 10, 120, 1) }),
    valid: ({ dT }) => 200e3 * 12e-6 * dT <= 250,
    build: ({ L, dT }) => {
      const sigma = 200e3 * 12e-6 * dT;
      const delta = 12e-6 * dT * L * 1000;
      return {
        statement: `길이 L = ${L} m인 강재 봉의 양 끝이 벽에 고정되어 있다. 온도가 ΔT = ${dT} K 상승한다. 선팽창계수 α = 12 × 10⁻⁶ /K, E = 200 GPa.`,
        parts: [
          part('(a)', '봉에 생기는 열응력의 크기 σ', sigma, 'MPa', 6),
          part('(b)', '양 끝이 자유롭다면 늘어났을 길이 δ_T', delta, 'mm', 4),
        ],
        hints: [
          '먼저 구속이 없을 때의 자유 열팽창량을 생각해 보세요.',
          '양단 고정이면 전체 변형량은 0입니다. 열변형을 상쇄하는 기계적 변형이 생겨야 합니다.',
          '결과가 봉의 길이와 관계있는지 확인해 보세요.',
        ],
        solution: [
          `자유 열팽창: δ_T = αΔT·L = 12 × 10⁻⁶ × ${dT} × ${fmt(L * 1000)} mm = ${fmt(delta)} mm`,
          '적합 조건(전체 변형 0): σL/E = αΔT·L',
          `σ = EαΔT = 200,000 MPa × 12 × 10⁻⁶ × ${dT} = ${fmt(sigma)} MPa (압축)`,
          '열응력은 길이 L과 무관하다.',
        ],
      };
    },
  },
  {
    id: 'mom-pressure-vessel',
    subjectId: 'mechanics_of_materials',
    topic: '압력용기',
    title: '얇은 원통형 압력용기',
    defaults: { D: 1, t: 10, p: 2 },
    vary: (r) => ({ D: range(r, 0.3, 3, 0.1), t: range(r, 3, 30, 1), p: range(r, 0.2, 5, 0.1) }),
    // 박육 가정(D/t ≥ 20)이 성립하고 응력이 항복강도보다 낮은 조합만 쓴다.
    valid: ({ D, t, p }) => (D * 1000) / t >= 20 && (p * D * 1000) / (2 * t) <= 250,
    build: ({ D, t, p }) => {
      const Dmm = D * 1000;
      const hoop = (p * Dmm) / (2 * t);
      const axial = (p * Dmm) / (4 * t);
      return {
        statement: `내경 D = ${D} m, 두께 t = ${t} mm인 얇은 원통형 압력용기에 내압 p = ${p} MPa가 작용한다.`,
        parts: [part('(a)', '원주(후프) 응력 σ_h', hoop, 'MPa', 5), part('(b)', '축방향 응력 σ_a', axial, 'MPa', 5)],
        hints: [
          'D/t가 충분히 크면(대략 20 이상) 박육 가정을 쓸 수 있습니다.',
          '원주 응력은 용기를 길이 방향으로 반 자른 자유물체, 축방향 응력은 단면으로 자른 자유물체에서 구합니다.',
        ],
        solution: [
          `D/t = ${fmt(Dmm)}/${t} = ${fmt(Dmm / t)} → 박육 가정 적용 가능`,
          `σ_h = pD/(2t) = ${p} × ${fmt(Dmm)} / (2 × ${t}) = ${fmt(hoop)} MPa`,
          `σ_a = pD/(4t) = ${p} × ${fmt(Dmm)} / (4 × ${t}) = ${fmt(axial)} MPa`,
          '원주 응력이 축방향 응력의 2배이므로, 원통 용기는 축 방향으로 갈라지기 쉽다.',
        ],
      };
    },
  },
  {
    id: 'mom-euler-buckling',
    subjectId: 'mechanics_of_materials',
    topic: '좌굴',
    title: '원형 기둥의 오일러 좌굴',
    defaults: { L: 2, d: 40 },
    vary: (r) => ({ L: range(r, 0.5, 5, 0.1), d: range(r, 10, 80, 2) }),
    // 오일러 공식은 세장비가 큰(λ = L/r ≥ 100, 원형 단면 r = d/4) 긴 기둥에서만 성립한다.
    valid: ({ L, d }) => (L * 1000) / (d / 4) >= 100,
    build: ({ L, d }) => {
      const dm = d / 1000;
      const I = (PI * dm ** 4) / 64;
      const pcr = (PI ** 2 * 200e9 * I) / L ** 2 / 1e3;
      return {
        statement: `길이 L = ${L} m, 지름 d = ${d} mm인 강재 원형 기둥이 축 압축하중을 받는다. E = 200 GPa.`,
        parts: [
          part('(a)', '양단 핀 지지일 때 임계 좌굴하중 P_cr', pcr, 'kN', 6),
          part('(b)', '한쪽 고정·다른 쪽 자유일 때 임계 좌굴하중 P_cr', pcr / 4, 'kN', 4),
        ],
        hints: [
          '좌굴은 단면 2차 모멘트 I가 가장 작은 축 방향으로 일어납니다. 원형 단면은 모든 방향이 같습니다.',
          '오일러 공식은 유효 좌굴 길이 L_e를 씁니다. 지지 조건에 따라 L_e가 달라집니다.',
          '고정-자유 기둥의 유효 길이는 실제 길이보다 깁니다.',
        ],
        solution: [
          `I = πd⁴/64 = π × ${dm}⁴ / 64 = ${fmt(I)} m⁴`,
          `(a) 핀-핀: L_e = L = ${L} m, P_cr = π²EI/L_e² = π² × 200 × 10⁹ × ${fmt(I)} / ${L}² = ${fmt(pcr)} kN`,
          `(b) 고정-자유: L_e = 2L = ${2 * L} m → P_cr = ${fmt(pcr)} / 4 = ${fmt(pcr / 4)} kN`,
          '실제 설계에서는 세장비가 충분히 큰지(오일러 공식 적용 범위) 확인하고 안전계수를 적용한다.',
        ],
      };
    },
  },

  // ───────── 열역학 ─────────
  {
    id: 'thermo-constant-pressure-heating',
    subjectId: 'thermodynamics',
    topic: '열역학 제1법칙',
    title: '공기의 정압 가열',
    defaults: { m: 2, T1: 300, dT: 100 },
    vary: (r) => ({ m: range(r, 0.5, 10, 0.5), T1: range(r, 270, 350, 5), dT: range(r, 10, 300, 5) }),
    build: ({ m, T1, dT }) => {
      const Q = m * 1.005 * dT;
      const dh = 1.005 * dT;
      return {
        statement: `질량 m = ${m} kg의 공기를 정압 상태에서 ${T1} K에서 ${T1 + dT} K로 가열한다. 공기는 이상기체이며 cp = 1.005 kJ/(kg·K)로 일정하다.`,
        parts: [part('(a)', '가한 열량 Q', Q, 'kJ', 5), part('(b)', '비엔탈피 변화 Δh', dh, 'kJ/kg', 5)],
        hints: [
          '정압 과정에서 가한 열량은 엔탈피 변화와 같습니다.',
          '이상기체의 엔탈피 변화는 cp와 온도 변화로 표현됩니다. 온도 차는 K와 °C가 같습니다.',
        ],
        solution: [
          '정압 과정: Q = ΔH = m·cp·ΔT',
          `Q = ${m} kg × 1.005 kJ/(kg·K) × (${T1 + dT} − ${T1}) K = ${fmt(Q)} kJ`,
          `Δh = cp·ΔT = 1.005 × ${dT} = ${fmt(dh)} kJ/kg (= Q/m)`,
        ],
      };
    },
  },
  {
    id: 'thermo-ideal-gas-tank',
    subjectId: 'thermodynamics',
    topic: '이상기체',
    title: '강체 탱크 속 이상기체',
    defaults: { V: 0.5, P1: 200, T1: 300, T2: 400 },
    vary: (r) => {
      const T1 = range(r, 270, 350, 5);
      return { V: range(r, 0.05, 5, 0.05), P1: range(r, 100, 1000, 10), T1, T2: T1 + range(r, 20, 300, 10) };
    },
    build: ({ V, P1, T1, T2 }) => {
      const m = (P1 * V) / (0.287 * T1);
      const P2 = (P1 * T2) / T1;
      return {
        statement: `체적 V = ${V} m³인 강체 탱크에 공기가 압력 ${P1} kPa, 온도 ${T1} K로 들어 있다. 공기의 기체상수 R = 0.287 kJ/(kg·K).`,
        parts: [
          part('(a)', '탱크 속 공기의 질량 m', m, 'kg', 5),
          part('(b)', `탱크를 가열해 ${T2} K가 되었을 때 압력 P₂`, P2, 'kPa', 5),
        ],
        hints: [
          '이상기체 상태방정식 PV = mRT를 쓰세요. kPa·m³ = kJ이므로 R의 단위와 맞춰 보세요.',
          '강체 탱크이므로 체적과 질량이 변하지 않습니다. 이때 압력과 온도는 어떤 관계일까요?',
        ],
        solution: [
          `m = PV/(RT) = ${P1} kPa × ${V} m³ / (0.287 kJ/(kg·K) × ${T1} K) = ${fmt(P1 * V)} / ${fmt(0.287 * T1)} = ${fmt(m)} kg`,
          '정적 과정(V, m 일정): P₁/T₁ = P₂/T₂',
          `P₂ = P₁ × T₂/T₁ = ${P1} × ${T2}/${T1} = ${fmt(P2)} kPa`,
        ],
      };
    },
  },
  {
    id: 'thermo-carnot',
    subjectId: 'thermodynamics',
    topic: '사이클',
    title: '카르노 열기관의 효율',
    defaults: { TH: 800, TL: 300, QH: 1000 },
    vary: (r) => ({ TH: range(r, 500, 1500, 10), TL: range(r, 250, 400, 5), QH: range(r, 100, 5000, 50) }),
    build: ({ TH, TL, QH }) => {
      const eta = 1 - TL / TH;
      return {
        statement: `고온 열저장조 ${TH} K와 저온 열저장조 ${TL} K 사이에서 작동하는 카르노 열기관이 있다.`,
        parts: [
          part('(a)', '열효율 η (소수 또는 %로 입력)', eta, '', 5),
          part('(b)', `고온부에서 ${QH} kJ을 받을 때 얻는 최대 일 W`, eta * QH, 'kJ', 5),
        ],
        hints: ['카르노 효율은 두 열저장조의 절대온도만으로 정해집니다.', '효율의 정의는 η = W/Q_H입니다.'],
        solution: [
          `η = 1 − T_L/T_H = 1 − ${TL}/${TH} = ${fmt(eta)} (${fmt(eta * 100)}%)`,
          `W = η·Q_H = ${fmt(eta)} × ${QH} kJ = ${fmt(eta * QH)} kJ`,
          '실제 열기관의 효율은 이 값보다 항상 낮다 (열역학 제2법칙).',
        ],
      };
    },
  },
  {
    id: 'thermo-adiabatic-compression',
    subjectId: 'thermodynamics',
    topic: '단열 과정',
    title: '공기의 가역 단열 압축',
    defaults: { T1: 300, ratio: 8 },
    vary: (r) => ({ T1: range(r, 270, 350, 5), ratio: range(r, 2, 20, 0.5) }),
    build: ({ T1, ratio }) => {
      const T2 = T1 * ratio ** (0.4 / 1.4);
      const w = 0.718 * (T2 - T1);
      return {
        statement: `공기를 100 kPa, ${T1} K에서 ${100 * ratio} kPa까지 가역 단열 압축한다. 공기는 이상기체이며 k = 1.4, cv = 0.718 kJ/(kg·K)이다.`,
        parts: [
          part('(a)', '압축 후 온도 T₂ (절대온도)', T2, 'K', 5),
          part('(b)', '밀폐계로 볼 때 필요한 압축일의 크기 w (단위 질량당)', w, 'kJ/kg', 5),
        ],
        hints: [
          '가역 단열 과정의 이상기체는 Pv^k = 일정입니다. 이를 T와 P의 관계로 바꿔 보세요.',
          '단열이므로 Q = 0입니다. 제1법칙에서 일과 내부에너지 변화의 관계를 쓰세요.',
        ],
        solution: [
          `T₂ = T₁ (P₂/P₁)^((k−1)/k) = ${T1} × ${ratio}^(0.2857) = ${T1} × ${fmt(ratio ** (0.4 / 1.4))} = ${fmt(T2)} K`,
          '밀폐계 제1법칙(Q = 0): w_in = Δu = cv (T₂ − T₁)',
          `w = 0.718 × (${fmt(T2)} − ${T1}) = ${fmt(w)} kJ/kg`,
        ],
      };
    },
  },
  {
    id: 'thermo-otto-cycle',
    subjectId: 'thermodynamics',
    topic: '사이클',
    title: '오토 사이클의 열효율',
    defaults: { ra: 8, rb: 10 },
    vary: (r) => ({ ra: range(r, 5, 9, 0.25), rb: range(r, 9.25, 14, 0.25) }),
    build: ({ ra, rb }) => {
      const ea = 1 - ra ** -0.4;
      const eb = 1 - rb ** -0.4;
      return {
        statement: '공기 표준 오토 사이클의 비열비는 k = 1.4이다.',
        parts: [
          part('(a)', `압축비 r = ${ra}일 때 열효율 η`, ea, '', 5),
          part('(b)', `압축비 r = ${rb}일 때 열효율 η`, eb, '', 5),
        ],
        hints: [
          '오토 사이클의 이론 열효율은 압축비와 비열비만으로 정해집니다.',
          '압축비가 커지면 효율은 어떻게 변할까요? 실제 엔진에서 압축비를 무한히 높이지 못하는 이유도 생각해 보세요.',
        ],
        solution: [
          'η = 1 − 1/r^(k−1)',
          `(a) r = ${ra}: η = 1 − ${ra}^(−0.4) = 1 − ${fmt(ra ** -0.4)} = ${fmt(ea)} (${fmt(ea * 100, 3)}%)`,
          `(b) r = ${rb}: η = 1 − ${rb}^(−0.4) = 1 − ${fmt(rb ** -0.4)} = ${fmt(eb)} (${fmt(eb * 100, 3)}%)`,
          '압축비를 높이면 효율이 오르지만, 가솔린 엔진에서는 노킹 때문에 한계가 있다.',
        ],
      };
    },
  },

  // ───────── 유체역학 ─────────
  {
    id: 'fluid-pipe-flow-rate',
    subjectId: 'fluid_mechanics',
    topic: '연속 방정식',
    title: '원형관의 유량',
    defaults: { D: 0.1, V: 2 },
    vary: (r) => ({ D: range(r, 0.02, 0.5, 0.01), V: range(r, 0.2, 5, 0.1) }),
    build: ({ D, V }) => {
      const A = (PI * D ** 2) / 4;
      const Q = A * V;
      return {
        statement: `내경 D = ${D} m인 원형관에 물(ρ = 1000 kg/m³)이 평균 유속 V = ${V} m/s로 흐른다.`,
        parts: [part('(a)', '체적유량 Q', Q, 'm³/s', 5), part('(b)', '질량유량 ṁ', 1000 * Q, 'kg/s', 5)],
        hints: ['체적유량은 단면적과 평균 유속의 곱입니다.', '질량유량은 체적유량에 밀도를 곱한 값입니다.'],
        solution: [
          `A = πD²/4 = π × ${D}² / 4 = ${fmt(A)} m²`,
          `Q = A·V = ${fmt(A)} × ${V} = ${fmt(Q)} m³/s (= ${fmt(Q * 1000)} L/s)`,
          `ṁ = ρQ = 1000 × ${fmt(Q)} = ${fmt(1000 * Q)} kg/s`,
        ],
      };
    },
  },
  {
    id: 'fluid-hydrostatic-pressure',
    subjectId: 'fluid_mechanics',
    topic: '정수압',
    title: '수조 바닥의 정수압',
    defaults: { h: 5, fluid: '물', rho: 1000 },
    vary: (r) => ({ h: range(r, 0.5, 50, 0.5), ...pick(r, FLUIDS) }),
    build: ({ h, fluid, rho }) => {
      const pg = (rho * G * h) / 1000;
      return {
        statement: `${fluid}(ρ = ${rho} kg/m³)이 깊이 h = ${h} m까지 채워진 개방 수조가 있다. g = 9.81 m/s², 대기압 101.325 kPa.`,
        parts: [part('(a)', '바닥에서의 계기압력', pg, 'kPa', 5), part('(b)', '바닥에서의 절대압력', 101.325 + pg, 'kPa', 5)],
        hints: ['정지 유체의 압력은 깊이에 비례해 증가합니다 (p = ρgh).', '계기압력과 절대압력의 차이는 무엇인지 떠올려 보세요.'],
        solution: [
          `p_gage = ρgh = ${rho} × 9.81 × ${h} = ${fmt(pg * 1000, 5)} Pa = ${fmt(pg)} kPa`,
          `p_abs = p_atm + p_gage = 101.325 + ${fmt(pg)} = ${fmt(101.325 + pg, 5)} kPa`,
        ],
      };
    },
  },
  {
    id: 'fluid-pipe-contraction',
    subjectId: 'fluid_mechanics',
    topic: '베르누이',
    title: '축소관의 유속과 압력 변화',
    defaults: { D1: 0.1, D2: 0.05, V1: 2 },
    vary: (r) => {
      const D1 = range(r, 0.05, 0.5, 0.01);
      return { D1, D2: Number((D1 * range(r, 0.3, 0.85, 0.05)).toFixed(3)), V1: range(r, 0.5, 4, 0.1) };
    },
    build: ({ D1, D2, V1 }) => {
      const V2 = V1 * (D1 / D2) ** 2;
      const dp = (1000 * (V2 ** 2 - V1 ** 2)) / 2 / 1000;
      const Re = (V1 * D1) / 1.0e-6;
      return {
        statement: `수평 원형관의 지름이 D₁ = ${D1} m에서 D₂ = ${D2} m로 줄어든다. 상류 유속 V₁ = ${V1} m/s, 물의 ρ = 1000 kg/m³, 동점성계수 ν = 1.0 × 10⁻⁶ m²/s. 손실은 무시한다.`,
        parts: [
          part('(a)', '하류 유속 V₂', V2, 'm/s', 3),
          part('(b)', '압력 강하 p₁ − p₂', dp, 'kPa', 4),
          part('(c)', '상류의 레이놀즈 수 Re₁', Re, '', 3),
        ],
        hints: [
          '비압축성 유동의 연속 방정식: A₁V₁ = A₂V₂. 면적은 지름의 제곱에 비례합니다.',
          '수평관이고 손실이 없으므로 베르누이 방정식에서 위치 수두 항이 사라집니다.',
          'Re = VD/ν입니다. 결과가 약 2300보다 크면 난류로 판정합니다.',
        ],
        solution: [
          `V₂ = V₁ (D₁/D₂)² = ${V1} × (${D1}/${D2})² = ${fmt(V2)} m/s`,
          `베르누이(수평, 무손실): p₁ − p₂ = ρ(V₂² − V₁²)/2 = 1000 × (${fmt(V2 ** 2)} − ${fmt(V1 ** 2)})/2 = ${fmt(dp * 1000)} Pa = ${fmt(dp)} kPa`,
          `Re₁ = V₁D₁/ν = ${V1} × ${D1} / 1.0 × 10⁻⁶ = ${fmt(Re)} → 난류`,
        ],
      };
    },
  },
  {
    id: 'fluid-pipe-friction-loss',
    subjectId: 'fluid_mechanics',
    topic: '관마찰',
    title: '직관의 마찰 손실 (Darcy–Weisbach)',
    defaults: { L: 100, D: 0.1, V: 2, f: 0.02 },
    vary: (r) => ({
      L: range(r, 10, 1000, 10),
      D: range(r, 0.02, 0.5, 0.01),
      V: range(r, 0.3, 4, 0.1),
      f: range(r, 0.01, 0.05, 0.001),
    }),
    build: ({ L, D, V, f }) => {
      const hL = (f * (L / D) * V ** 2) / (2 * G);
      const dp = (1000 * G * hL) / 1000;
      return {
        statement: `길이 L = ${L} m, 내경 D = ${D} m인 수평 직관에 물(ρ = 1000 kg/m³)이 평균 유속 V = ${V} m/s로 흐른다. 마찰계수 f = ${f}, g = 9.81 m/s².`,
        parts: [part('(a)', '마찰 수두손실 h_L', hL, 'm', 5), part('(b)', '마찰에 의한 압력 손실 Δp', dp, 'kPa', 5)],
        hints: [
          'Darcy–Weisbach 식은 수두손실을 L/D와 속도수두 V²/(2g)의 곱으로 표현합니다.',
          '수두손실과 압력손실은 ρg로 서로 바꿀 수 있습니다.',
        ],
        solution: [
          `h_L = f (L/D) V²/(2g) = ${f} × (${L}/${D}) × ${V}² / (2 × 9.81) = ${fmt(hL)} m`,
          `Δp = ρg·h_L = 1000 × 9.81 × ${fmt(hL)} = ${fmt(dp * 1000)} Pa = ${fmt(dp)} kPa`,
          `(검산: Δp = f (L/D) ρV²/2 = ${f} × ${fmt(L / D)} × 1000 × ${fmt(V ** 2)}/2 = ${fmt(dp)} kPa ✓)`,
        ],
      };
    },
  },
  {
    id: 'fluid-buoyancy',
    subjectId: 'fluid_mechanics',
    topic: '부력',
    title: '물에 뜬 나무토막',
    defaults: { a: 0.5, b: 0.4, c: 0.2, rho: 600 },
    vary: (r) => ({ a: range(r, 0.2, 1.5, 0.05), b: range(r, 0.1, 1, 0.05), c: range(r, 0.05, 0.5, 0.01), rho: range(r, 300, 950, 10) }),
    build: ({ a, b, c, rho }) => {
      const V = a * b * c;
      const FB = rho * V * G;
      const depth = (rho / 1000) * c;
      return {
        statement: `크기 ${a} m × ${b} m × ${c} m(높이)인 나무토막(ρ = ${rho} kg/m³)이 넓은 면을 아래로 하여 물(ρ = 1000 kg/m³)에 떠 있다. g = 9.81 m/s².`,
        parts: [part('(a)', '나무토막에 작용하는 부력 F_B', FB, 'N', 5), part('(b)', '물에 잠긴 깊이 h', depth, 'm', 5)],
        hints: ['떠 있는 물체는 부력과 무게가 평형을 이룹니다.', '아르키메데스 원리: 부력은 물체가 밀어낸 유체의 무게와 같습니다.'],
        solution: [
          `부피 V = ${a} × ${b} × ${c} = ${fmt(V)} m³`,
          `평형: F_B = W = ρ_wood·V·g = ${rho} × ${fmt(V)} × 9.81 = ${fmt(FB, 5)} N`,
          `잠긴 부피: V_sub = F_B / (ρ_water·g) = ${fmt(V * (rho / 1000))} m³ → h = ${fmt(V * (rho / 1000))} / (${a} × ${b}) = ${fmt(depth)} m`,
          `잠긴 비율 = ρ_wood/ρ_water = ${fmt(rho / 1000)} (높이 ${c} m의 ${fmt(rho / 10)}%)`,
        ],
      };
    },
  },

  // ───────── 기계동역학 ─────────
  {
    id: 'dynamics-spring-mass',
    subjectId: 'dynamics',
    topic: '진동',
    title: '1자유도 스프링-질량계의 고유진동',
    defaults: { m: 2, k: 800 },
    vary: (r) => ({ m: range(r, 0.2, 20, 0.1), k: range(r, 50, 10000, 50) }),
    build: ({ m, k }) => {
      const wn = sqrt(k / m);
      const fn = wn / (2 * PI);
      return {
        statement: `질량 m = ${m} kg, 스프링 상수 k = ${k} N/m인 비감쇠 1자유도 스프링-질량계가 있다.`,
        parts: [
          part('(a)', '고유 각진동수 ω_n', wn, 'rad/s', 4),
          part('(b)', '고유진동수 f_n', fn, 'Hz', 3),
          part('(c)', '주기 T', 1 / fn, 's', 3),
        ],
        hints: [
          '운동방정식 m·ẍ + k·x = 0에서 고유 각진동수가 나옵니다.',
          'ω_n [rad/s]과 f_n [Hz]은 2π배 차이가 납니다.',
          '주기는 진동수의 역수입니다.',
        ],
        solution: [
          `ω_n = √(k/m) = √(${k}/${m}) = ${fmt(wn)} rad/s`,
          `f_n = ω_n / (2π) = ${fmt(wn)} / 6.2832 = ${fmt(fn)} Hz`,
          `T = 1/f_n = ${fmt(1 / fn)} s`,
        ],
      };
    },
  },
  {
    id: 'dynamics-free-fall',
    subjectId: 'dynamics',
    topic: '에너지 보존',
    title: '자유낙하와 에너지 보존',
    defaults: { m: 2, h: 5 },
    vary: (r) => ({ m: range(r, 0.5, 20, 0.5), h: range(r, 1, 100, 0.5) }),
    build: ({ m, h }) => {
      const v = sqrt(2 * G * h);
      const t = sqrt((2 * h) / G);
      return {
        statement: `질량 m = ${m} kg인 물체를 높이 h = ${h} m에서 정지 상태로 놓는다. g = 9.81 m/s², 공기 저항은 무시한다.`,
        parts: [part('(a)', '바닥에 닿기 직전의 속력 v', v, 'm/s', 5), part('(b)', '낙하에 걸리는 시간 t', t, 's', 5)],
        hints: ['위치에너지가 모두 운동에너지로 바뀝니다. 질량이 결과에 영향을 줄까요?', '등가속도 운동의 변위 식 h = ½gt²를 쓰세요.'],
        solution: [
          `에너지 보존: mgh = ½mv² → v = √(2gh) = √(2 × 9.81 × ${h}) = ${fmt(v)} m/s (질량과 무관)`,
          `h = ½gt² → t = √(2h/g) = √(${2 * h}/9.81) = ${fmt(t)} s`,
          `검산: v = g·t = 9.81 × ${fmt(t)} = ${fmt(G * t)} m/s ✓`,
        ],
      };
    },
  },
  {
    id: 'dynamics-damped-vibration',
    subjectId: 'dynamics',
    topic: '진동',
    title: '감쇠 1자유도계',
    defaults: { m: 2, k: 800, c: 16 },
    vary: (r) => {
      const m = range(r, 0.5, 20, 0.5);
      const k = range(r, 100, 10000, 50);
      const zeta = range(r, 0.02, 0.8, 0.01);
      return { m, k, c: Math.round(2 * zeta * sqrt(k * m) * 10) / 10 };
    },
    // c를 반올림한 뒤에도 부족감쇠(0 < ζ < 1)인지 확인한다.
    valid: ({ m, k, c }) => c > 0 && c / (2 * sqrt(k * m)) < 1,
    build: ({ m, k, c }) => {
      const cc = 2 * sqrt(k * m);
      const zeta = c / cc;
      const wn = sqrt(k / m);
      return {
        statement: `질량 m = ${m} kg, 스프링 상수 k = ${k} N/m, 감쇠계수 c = ${c} N·s/m인 점성 감쇠 1자유도계가 있다.`,
        parts: [part('(a)', '감쇠비 ζ', zeta, '', 5), part('(b)', '감쇠 고유 각진동수 ω_d', wn * sqrt(1 - zeta ** 2), 'rad/s', 5)],
        hints: [
          '감쇠비는 실제 감쇠계수를 임계 감쇠계수 c_c = 2√(km)로 나눈 값입니다.',
          'ζ < 1이면 부족감쇠로 진동합니다. 감쇠 고유진동수는 ω_n보다 약간 작습니다.',
        ],
        solution: [
          `c_c = 2√(km) = 2√(${k} × ${m}) = ${fmt(cc)} N·s/m`,
          `ζ = c/c_c = ${c}/${fmt(cc)} = ${fmt(zeta)} → 부족감쇠`,
          `ω_n = √(k/m) = ${fmt(wn)} rad/s, ω_d = ω_n√(1 − ζ²) = ${fmt(wn)} × √${fmt(1 - zeta ** 2)} = ${fmt(wn * sqrt(1 - zeta ** 2))} rad/s`,
        ],
      };
    },
  },
  {
    id: 'dynamics-curve-friction',
    subjectId: 'dynamics',
    topic: '원운동',
    title: '평탄한 커브를 도는 자동차',
    defaults: { r: 50, kmh: 72 },
    vary: (rng) => ({ r: range(rng, 20, 300, 5), kmh: range(rng, 20, 120, 5) }),
    valid: ({ r, kmh }) => (kmh / 3.6) ** 2 / (r * G) <= 1,
    build: ({ r, kmh }) => {
      const v = kmh / 3.6;
      const an = v ** 2 / r;
      const mu = an / G;
      return {
        statement: `자동차가 반지름 r = ${r} m인 평탄한(뱅크각 없는) 커브를 일정한 속력 ${kmh} km/h로 돈다. g = 9.81 m/s².`,
        parts: [part('(a)', '구심가속도 a_n', an, 'm/s²', 5), part('(b)', '미끄러지지 않기 위한 타이어-노면 최소 마찰계수 μ_min', mu, '', 5)],
        hints: ['먼저 속력을 m/s로 바꾸세요.', '평탄한 커브에서 구심력을 제공하는 힘은 무엇일까요?'],
        solution: [
          `v = ${kmh} km/h = ${fmt(v)} m/s`,
          `a_n = v²/r = ${fmt(v)}² / ${r} = ${fmt(an)} m/s²`,
          `구심력 = 마찰력: m·v²/r ≤ μ·m·g → μ_min = v²/(rg) = ${fmt(v ** 2)} / (${r} × 9.81) = ${fmt(mu)}`,
          '질량과 무관하다. 젖은 노면(μ ≈ 0.4~0.5)에서는 필요한 마찰계수가 이보다 크면 미끄러진다.',
        ],
      };
    },
  },
  {
    id: 'dynamics-flywheel',
    subjectId: 'dynamics',
    topic: '강체 회전',
    title: '플라이휠의 회전 운동에너지',
    defaults: { m: 20, R: 0.3, n: 3000 },
    vary: (r) => ({ m: range(r, 2, 100, 1), R: range(r, 0.1, 0.8, 0.01), n: range(r, 300, 6000, 50) }),
    build: ({ m, R, n }) => {
      const I = 0.5 * m * R ** 2;
      const w = (n * 2 * PI) / 60;
      const E = (0.5 * I * w ** 2) / 1000;
      return {
        statement: `질량 m = ${m} kg, 반지름 R = ${R} m인 균일한 원판형 플라이휠이 ${n} rpm으로 회전한다.`,
        parts: [part('(a)', '회전축에 대한 질량 관성모멘트 I', I, 'kg·m²', 4), part('(b)', '회전 운동에너지 E', E, 'kJ', 6)],
        hints: ['균일한 원판의 관성모멘트는 링(mR²)보다 작습니다.', '운동에너지 식에는 rad/s 단위의 각속도를 써야 합니다.'],
        solution: [
          `I = ½ m R² = 0.5 × ${m} × ${R}² = ${fmt(I)} kg·m²`,
          `ω = ${n} × 2π / 60 = ${fmt(w)} rad/s`,
          `E = ½ I ω² = 0.5 × ${fmt(I)} × ${fmt(w)}² = ${fmt(E * 1000, 5)} J = ${fmt(E)} kJ`,
        ],
      };
    },
  },
  // ───────── 기계설계 (설계 대상별 1문제, 과목 화면에서는 무작위 5개 대상을 골라 출제) ─────────
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

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

const sameParams = (a, b) => Object.keys(a).every((k) => a[k] === b[k]);

/** seed에 맞는 숫자를 고른다. 기본값과 같거나 물리적으로 맞지 않는 조합이면 다시 뽑는다. */
function chooseParams(template, seed) {
  if (seed === 0) return template.defaults;
  const rng = createRng(seed);
  for (let i = 0; i < 50; i++) {
    const params = template.vary(rng);
    if ((!template.valid || template.valid(params)) && !sameParams(params, template.defaults)) return params;
  }
  return template.defaults;
}

function instantiate(template, seed) {
  const params = chooseParams(template, seed);
  return Object.freeze({
    id: template.id,
    subjectId: template.subjectId,
    topic: template.topic,
    title: template.title,
    seed,
    params,
    ...template.build(params),
  });
}

/** 기본 숫자(seed 0)로 만든 문제 목록 */
export const PROBLEMS = Object.freeze(TEMPLATES.map((t) => instantiate(t, 0)));

/** 문제 id와 seed로 문제를 만든다. 없는 문제면 null. */
export function getProblemInstance(problemId, seed = 0) {
  const template = TEMPLATE_BY_ID.get(problemId);
  if (!template || !isValidSeed(seed)) return null;
  return seed === 0 ? PROBLEMS.find((p) => p.id === problemId) : instantiate(template, seed);
}

export function findProblem(problemId) {
  return getProblemInstance(problemId, 0);
}

/** 정답 값·정답 단위·풀이를 제거한다. 단위 선택도 채점 대상이므로 단위 힌트는 주지 않는다. */
export function toPublicProblem(problem) {
  return {
    id: problem.id,
    subjectId: problem.subjectId,
    topic: problem.topic,
    title: problem.title,
    seed: problem.seed,
    statement: problem.statement,
    parts: problem.parts.map((p) => ({ label: p.label, prompt: p.prompt, points: p.points })),
    hints: [...problem.hints],
  };
}

export function listPublicProblems(subjectId) {
  return PROBLEMS.filter((p) => !subjectId || p.subjectId === subjectId).map(toPublicProblem);
}

/** 정답을 공개한 뒤 보여 줄 풀이와 소문항별 정답 */
export function getSolution(problem) {
  return {
    problemId: problem.id,
    seed: problem.seed,
    steps: [...problem.solution],
    answers: problem.parts.map((p) => ({
      label: p.label,
      value: p.answer.value,
      unit: p.answer.unit ?? '',
      display: fmt(p.answer.value),
    })),
  };
}
