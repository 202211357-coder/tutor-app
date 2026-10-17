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

const TEMPLATES = [
  // ───────── 정역학 ─────────
  {
    id: 'statics-simply-supported-beam',
    subjectId: 'statics',
    topic: '보의 반력',
    title: '단순지지보의 반력과 최대 굽힘모멘트',
    defaults: { L: 4, P: 10 },
    vary: (r) => ({ L: pick(r, [3, 4, 5, 6, 8]), P: pick(r, [6, 8, 10, 12, 15, 20]) }),
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
    vary: (r) => ({ L: pick(r, [1, 1.5, 2, 2.5, 3]), P: pick(r, [2, 3, 4, 5, 8]) }),
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
    vary: (r) => ({ W: pick(r, [500, 800, 1000, 1200, 1500, 2000]), thA: pick(r, [20, 25, 30, 35]), thB: pick(r, [45, 50, 60, 70]) }),
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
    vary: (r) => ({ m: pick(r, [2, 5, 10, 20]), th: pick(r, [15, 20, 25, 30]) }),
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
    vary: (r) => ({ s: pick(r, [4, 6, 8]), h: pick(r, [2, 3, 4]), P: pick(r, [6, 10, 12, 20]) }),
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
    vary: (r) => ({ d: pick(r, [10, 12, 16, 20, 25, 30]), L: pick(r, [0.5, 1, 1.5, 2]), P: pick(r, [10, 20, 30, 40, 50]) }),
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
    vary: (r) => ({ d: pick(r, [30, 40, 50, 60]), L: pick(r, [0.5, 1, 1.5, 2]), T: pick(r, [200, 300, 500, 800, 1000, 1500]) }),
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
    vary: (r) => ({ b: pick(r, [30, 40, 50, 60]), h: pick(r, [60, 80, 100, 120, 150]), M: pick(r, [2, 3, 5, 8, 10]) }),
    valid: ({ b, h, M }) => (M * 1e6 * (h / 2)) / ((b * h ** 3) / 12) <= 250,
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
    vary: (r) => ({ L: pick(r, [0.5, 1, 2, 3]), dT: pick(r, [20, 30, 40, 50, 60, 80]) }),
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
    vary: (r) => ({ D: pick(r, [0.5, 1, 1.5, 2]), t: pick(r, [5, 8, 10, 12, 15, 20]), p: pick(r, [0.5, 1, 2, 3]) }),
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
    vary: (r) => ({ L: pick(r, [1, 1.5, 2, 2.5, 3]), d: pick(r, [20, 30, 40, 50]) }),
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
    vary: (r) => ({ m: pick(r, [1, 1.5, 2, 3, 5]), T1: pick(r, [280, 300, 320]), dT: pick(r, [50, 100, 150, 200]) }),
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
    vary: (r) => ({
      V: pick(r, [0.2, 0.5, 1, 2]),
      P1: pick(r, [100, 150, 200, 300, 500]),
      T1: pick(r, [290, 300, 310]),
      T2: pick(r, [350, 400, 450, 500]),
    }),
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
    vary: (r) => ({ TH: pick(r, [600, 700, 800, 1000, 1200]), TL: pick(r, [280, 300, 320, 350]), QH: pick(r, [500, 1000, 1500, 2000]) }),
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
    vary: (r) => ({ T1: pick(r, [290, 300, 310]), ratio: pick(r, [4, 6, 8, 10, 12]) }),
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
    vary: (r) => ({ ra: pick(r, [6, 7, 8]), rb: pick(r, [9, 10, 11, 12]) }),
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
    vary: (r) => ({ D: pick(r, [0.05, 0.08, 0.1, 0.15, 0.2]), V: pick(r, [0.5, 1, 1.5, 2, 3]) }),
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
    defaults: { h: 5 },
    vary: (r) => ({ h: pick(r, [2, 3, 5, 8, 10, 15]) }),
    build: ({ h }) => {
      const pg = (1000 * G * h) / 1000;
      return {
        statement: `물(ρ = 1000 kg/m³)이 깊이 h = ${h} m까지 채워진 개방 수조가 있다. g = 9.81 m/s², 대기압 101.325 kPa.`,
        parts: [part('(a)', '바닥에서의 계기압력', pg, 'kPa', 5), part('(b)', '바닥에서의 절대압력', 101.325 + pg, 'kPa', 5)],
        hints: ['정지 유체의 압력은 깊이에 비례해 증가합니다 (p = ρgh).', '계기압력과 절대압력의 차이는 무엇인지 떠올려 보세요.'],
        solution: [
          `p_gage = ρgh = 1000 × 9.81 × ${h} = ${fmt(pg * 1000, 5)} Pa = ${fmt(pg)} kPa`,
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
      const D1 = pick(r, [0.1, 0.15, 0.2]);
      return { D1, D2: Number((D1 * pick(r, [0.5, 0.6, 0.75])).toFixed(3)), V1: pick(r, [1, 1.5, 2, 2.5]) };
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
      L: pick(r, [50, 100, 200, 500]),
      D: pick(r, [0.05, 0.1, 0.15, 0.2]),
      V: pick(r, [1, 1.5, 2, 3]),
      f: pick(r, [0.015, 0.02, 0.025, 0.03]),
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
    vary: (r) => ({ a: pick(r, [0.4, 0.5, 0.6]), b: pick(r, [0.3, 0.4]), c: pick(r, [0.1, 0.2, 0.3]), rho: pick(r, [500, 600, 700, 800]) }),
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
    vary: (r) => ({ m: pick(r, [0.5, 1, 2, 4, 5]), k: pick(r, [200, 500, 800, 1000, 2000]) }),
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
    vary: (r) => ({ m: pick(r, [1, 2, 5]), h: pick(r, [2, 3, 5, 10, 20]) }),
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
      const m = pick(r, [1, 2, 4, 5]);
      const k = pick(r, [500, 800, 1000, 2000]);
      const zeta = pick(r, [0.05, 0.1, 0.2, 0.3, 0.5]);
      return { m, k, c: Math.round(2 * zeta * sqrt(k * m) * 10) / 10 };
    },
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
    vary: (rng) => ({ r: pick(rng, [60, 80, 100, 120, 150]), kmh: pick(rng, [40, 50, 60, 72, 80]) }),
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
    vary: (r) => ({ m: pick(r, [10, 20, 30, 50]), R: pick(r, [0.2, 0.25, 0.3, 0.4]), n: pick(r, [1000, 1500, 2000, 3000, 3600]) }),
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
