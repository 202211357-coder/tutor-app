// 과목별 연습 문제.
// - answer, solution은 서버에서만 쓴다. 목록 API는 toPublicProblem()으로 가린 뒤 보낸다.
// - hints는 최종 값을 포함하지 않도록 작성하고 목록과 함께 보낸다.
// - 정답 값은 shared/problems.test.js에서 공식으로 다시 계산해 검증한다.

export const PROBLEMS = Object.freeze([
  // ───────── 정역학 ─────────
  {
    id: 'statics-simply-supported-beam',
    subjectId: 'statics',
    topic: '보의 반력',
    title: '단순지지보의 반력과 최대 굽힘모멘트',
    statement:
      '길이 L = 4 m인 단순지지보 AB의 중앙에 집중하중 P = 10 kN이 아래로 작용한다. 보의 자중은 무시한다.',
    parts: [
      { label: '(a)', prompt: '지점 A의 수직 반력 R_A', answer: { value: 5, unit: 'kN' }, points: 4 },
      { label: '(b)', prompt: '최대 굽힘모멘트 M_max', answer: { value: 10, unit: 'kN·m' }, points: 6 },
    ],
    hints: [
      '자유물체도를 그리고 A, B 지점의 수직 반력을 표시하세요.',
      '하중이 정중앙에 있으므로 대칭을 이용할 수 있습니다. 모멘트 평형은 한 지점을 기준으로 세우면 미지수가 하나 줄어듭니다.',
      '최대 굽힘모멘트는 전단력이 0이 되는(부호가 바뀌는) 위치에서 생깁니다.',
    ],
    solution: [
      'ΣM_B = 0: R_A·L − P·(L/2) = 0 → R_A = P/2 = 10/2 = 5 kN',
      'ΣF_y = 0: R_A + R_B = P → R_B = 5 kN',
      '전단력은 중앙에서 +5 kN → −5 kN으로 바뀌므로 최대 모멘트는 중앙에서 생긴다.',
      'M_max = R_A·(L/2) = 5 kN × 2 m = 10 kN·m (공식 PL/4와 같음)',
    ],
  },
  {
    id: 'statics-cantilever',
    subjectId: 'statics',
    topic: '보의 반력',
    title: '캔틸레버보의 고정단 반력',
    statement: '길이 L = 2 m인 캔틸레버보의 자유단에 집중하중 P = 3 kN이 아래로 작용한다. 자중은 무시한다.',
    parts: [
      { label: '(a)', prompt: '고정단의 수직 반력 R', answer: { value: 3, unit: 'kN' }, points: 4 },
      { label: '(b)', prompt: '고정단의 반력 모멘트 M_A의 크기', answer: { value: 6, unit: 'kN·m' }, points: 6 },
    ],
    hints: [
      '고정단은 수직 반력, 수평 반력, 반력 모멘트의 세 가지 반력을 가집니다.',
      '고정단을 기준점으로 모멘트 평형을 세우면 반력 모멘트를 바로 구할 수 있습니다.',
    ],
    solution: [
      'ΣF_y = 0: R − P = 0 → R = 3 kN',
      'ΣM_A = 0: M_A − P·L = 0 → M_A = 3 kN × 2 m = 6 kN·m',
      '캔틸레버에서는 고정단의 굽힘모멘트가 가장 크다 (|M_max| = PL).',
    ],
  },
  {
    id: 'statics-two-cables',
    subjectId: 'statics',
    topic: '힘의 평형',
    title: '두 케이블로 매단 하중',
    statement:
      '무게 W = 1000 N인 물체를 두 케이블이 좌우 대칭으로 매달고 있다. 각 케이블은 수평면과 θ의 각을 이룬다.',
    parts: [
      { label: '(a)', prompt: 'θ = 30°일 때 케이블 하나의 장력 T', answer: { value: 1000, unit: 'N' }, points: 5 },
      { label: '(b)', prompt: 'θ = 60°일 때 케이블 하나의 장력 T', answer: { value: 577.35, unit: 'N' }, points: 5 },
    ],
    hints: [
      '물체를 자유물체로 떼어 내고 두 장력과 무게를 표시하세요. 대칭이므로 두 장력의 크기는 같습니다.',
      '수평 성분은 서로 상쇄됩니다. 수직 방향 힘의 평형만 쓰면 됩니다.',
      '각도가 커지면(케이블이 더 수직에 가까우면) 장력은 커질까요, 작아질까요?',
    ],
    solution: [
      'ΣF_y = 0: 2T·sinθ − W = 0 → T = W / (2 sinθ)',
      '(a) θ = 30°: T = 1000 / (2 × 0.5) = 1000 N',
      '(b) θ = 60°: T = 1000 / (2 × 0.8660) = 577.35 N',
      '케이블이 수평에 가까울수록 sinθ가 작아져 장력이 급격히 커진다.',
    ],
  },

  // ───────── 재료역학 ─────────
  {
    id: 'mom-axial-rod',
    subjectId: 'mechanics_of_materials',
    topic: '축하중',
    title: '원형봉의 축응력과 신장량',
    statement:
      '지름 d = 20 mm, 길이 L = 1 m인 강재 원형봉에 인장 하중 P = 31.4 kN이 작용한다. 탄성계수 E = 200 GPa.',
    parts: [
      { label: '(a)', prompt: '축응력 σ', answer: { value: 99.95, unit: 'MPa' }, points: 5 },
      { label: '(b)', prompt: '신장량 δ', answer: { value: 0.4997, unit: 'mm' }, points: 5 },
    ],
    hints: [
      '축응력은 하중을 단면적으로 나눈 값입니다. 원형 단면적 공식을 지름으로 쓰는지 반지름으로 쓰는지 확인하세요.',
      'N/mm²는 MPa와 같습니다. mm 단위로 계산하면 환산이 간단해집니다.',
      '신장량은 후크의 법칙 σ = Eε와 ε = δ/L을 결합해 구합니다.',
    ],
    solution: [
      'A = πd²/4 = π × 20² / 4 = 314.16 mm²',
      'σ = P/A = 31,400 N / 314.16 mm² = 99.95 N/mm² = 99.95 MPa',
      'δ = σL/E = 99.95 MPa × 1000 mm / 200,000 MPa = 0.4997 mm',
    ],
  },
  {
    id: 'mom-torsion-shaft',
    subjectId: 'mechanics_of_materials',
    topic: '비틀림',
    title: '중실축의 비틀림',
    statement:
      '지름 d = 40 mm, 길이 L = 1 m인 중실 원형축에 토크 T = 500 N·m가 작용한다. 전단탄성계수 G = 80 GPa.',
    parts: [
      { label: '(a)', prompt: '최대 전단응력 τ_max', answer: { value: 39.789, unit: 'MPa' }, points: 5 },
      { label: '(b)', prompt: '비틀림각 φ', answer: { value: 0.024868, unit: 'rad' }, points: 5 },
    ],
    hints: [
      '비틀림 전단응력은 τ = Tr/J이며, 최대값은 바깥 표면(r = d/2)에서 생깁니다.',
      '중실 원형 단면의 극관성모멘트 J는 d의 4제곱에 비례합니다. mm와 m를 섞지 않도록 주의하세요.',
      '비틀림각 φ = TL/(GJ)의 결과는 라디안입니다.',
    ],
    solution: [
      'J = πd⁴/32 = π × 0.04⁴ / 32 = 2.5133 × 10⁻⁷ m⁴',
      'τ_max = T(d/2)/J = 16T/(πd³) = 16 × 500 / (π × 0.04³) = 39.79 × 10⁶ Pa = 39.79 MPa',
      'φ = TL/(GJ) = 500 × 1 / (80 × 10⁹ × 2.5133 × 10⁻⁷) = 0.02487 rad (≈ 1.42°)',
    ],
  },
  {
    id: 'mom-bending-stress',
    subjectId: 'mechanics_of_materials',
    topic: '굽힘',
    title: '직사각형 단면보의 굽힘응력',
    statement: '폭 b = 50 mm, 높이 h = 100 mm인 직사각형 단면보에 굽힘모멘트 M = 5 kN·m가 작용한다.',
    parts: [
      { label: '(a)', prompt: '중립축에 대한 단면 2차 모멘트 I', answer: { value: 4.1667e6, unit: 'mm⁴' }, points: 4 },
      { label: '(b)', prompt: '최대 굽힘응력 σ_max', answer: { value: 60, unit: 'MPa' }, points: 6 },
    ],
    hints: [
      '직사각형 단면의 I는 높이 h의 세제곱에 비례합니다. 어느 방향이 굽힘 방향인지 확인하세요.',
      '굽힘응력 σ = My/I에서 최대값은 중립축에서 가장 먼 곳(y = h/2)에서 생깁니다.',
      'M을 N·mm로 바꾸면 결과가 바로 N/mm²(MPa)로 나옵니다.',
    ],
    solution: [
      'I = bh³/12 = 50 × 100³ / 12 = 4.1667 × 10⁶ mm⁴',
      'M = 5 kN·m = 5 × 10⁶ N·mm, y_max = h/2 = 50 mm',
      'σ_max = M·y_max / I = 5 × 10⁶ × 50 / 4.1667 × 10⁶ = 60 MPa',
    ],
  },

  // ───────── 열역학 ─────────
  {
    id: 'thermo-constant-pressure-heating',
    subjectId: 'thermodynamics',
    topic: '열역학 제1법칙',
    title: '공기의 정압 가열',
    statement:
      '질량 m = 2 kg의 공기를 정압 상태에서 300 K에서 400 K로 가열한다. 공기는 이상기체이며 cp = 1.005 kJ/(kg·K)로 일정하다.',
    parts: [
      { label: '(a)', prompt: '가한 열량 Q', answer: { value: 201, unit: 'kJ' }, points: 5 },
      { label: '(b)', prompt: '비엔탈피 변화 Δh', answer: { value: 100.5, unit: 'kJ/kg' }, points: 5 },
    ],
    hints: [
      '정압 과정에서 가한 열량은 엔탈피 변화와 같습니다.',
      '이상기체의 엔탈피 변화는 cp와 온도 변화로 표현됩니다. 온도 차는 K와 °C가 같습니다.',
    ],
    solution: [
      '정압 과정: Q = ΔH = m·cp·ΔT',
      'Q = 2 kg × 1.005 kJ/(kg·K) × (400 − 300) K = 201 kJ',
      'Δh = cp·ΔT = 1.005 × 100 = 100.5 kJ/kg (= Q/m)',
    ],
  },
  {
    id: 'thermo-ideal-gas-tank',
    subjectId: 'thermodynamics',
    topic: '이상기체',
    title: '강체 탱크 속 이상기체',
    statement:
      '체적 V = 0.5 m³인 강체 탱크에 공기가 압력 200 kPa, 온도 300 K로 들어 있다. 공기의 기체상수 R = 0.287 kJ/(kg·K).',
    parts: [
      { label: '(a)', prompt: '탱크 속 공기의 질량 m', answer: { value: 1.1614, unit: 'kg' }, points: 5 },
      { label: '(b)', prompt: '탱크를 가열해 400 K가 되었을 때 압력 P₂', answer: { value: 266.67, unit: 'kPa' }, points: 5 },
    ],
    hints: [
      '이상기체 상태방정식 PV = mRT를 쓰세요. kPa·m³ = kJ이므로 R의 단위와 맞춰 보세요.',
      '강체 탱크이므로 체적과 질량이 변하지 않습니다. 이때 압력과 온도는 어떤 관계일까요?',
    ],
    solution: [
      'm = PV/(RT) = 200 kPa × 0.5 m³ / (0.287 kJ/(kg·K) × 300 K) = 100 / 86.1 = 1.1614 kg',
      '정적 과정(V, m 일정): P₁/T₁ = P₂/T₂',
      'P₂ = P₁ × T₂/T₁ = 200 × 400/300 = 266.67 kPa',
    ],
  },
  {
    id: 'thermo-carnot',
    subjectId: 'thermodynamics',
    topic: '사이클',
    title: '카르노 열기관의 효율',
    statement: '고온 열저장조 800 K와 저온 열저장조 300 K 사이에서 작동하는 카르노 열기관이 있다.',
    parts: [
      { label: '(a)', prompt: '열효율 η (소수 또는 %로 입력)', answer: { value: 0.625 }, points: 5 },
      { label: '(b)', prompt: '고온부에서 1000 kJ을 받을 때 얻는 최대 일 W', answer: { value: 625, unit: 'kJ' }, points: 5 },
    ],
    hints: [
      '카르노 효율은 두 열저장조의 절대온도만으로 정해집니다.',
      '효율의 정의는 η = W/Q_H입니다.',
    ],
    solution: [
      'η = 1 − T_L/T_H = 1 − 300/800 = 0.625 (62.5%)',
      'W = η·Q_H = 0.625 × 1000 kJ = 625 kJ',
      '실제 열기관의 효율은 이 값보다 항상 낮다 (열역학 제2법칙).',
    ],
  },

  // ───────── 유체역학 ─────────
  {
    id: 'fluid-pipe-flow-rate',
    subjectId: 'fluid_mechanics',
    topic: '연속 방정식',
    title: '원형관의 유량',
    statement: '내경 D = 0.1 m인 원형관에 물(ρ = 1000 kg/m³)이 평균 유속 V = 2 m/s로 흐른다.',
    parts: [
      { label: '(a)', prompt: '체적유량 Q', answer: { value: 0.015708, unit: 'm³/s' }, points: 5 },
      { label: '(b)', prompt: '질량유량 ṁ', answer: { value: 15.708, unit: 'kg/s' }, points: 5 },
    ],
    hints: [
      '체적유량은 단면적과 평균 유속의 곱입니다.',
      '질량유량은 체적유량에 밀도를 곱한 값입니다.',
    ],
    solution: [
      'A = πD²/4 = π × 0.1² / 4 = 7.854 × 10⁻³ m²',
      'Q = A·V = 7.854 × 10⁻³ × 2 = 0.015708 m³/s (= 15.7 L/s)',
      'ṁ = ρQ = 1000 × 0.015708 = 15.708 kg/s',
    ],
  },
  {
    id: 'fluid-hydrostatic-pressure',
    subjectId: 'fluid_mechanics',
    topic: '정수압',
    title: '수조 바닥의 정수압',
    statement:
      '물(ρ = 1000 kg/m³)이 깊이 h = 5 m까지 채워진 개방 수조가 있다. g = 9.81 m/s², 대기압 101.325 kPa.',
    parts: [
      { label: '(a)', prompt: '바닥에서의 계기압력', answer: { value: 49.05, unit: 'kPa' }, points: 5 },
      { label: '(b)', prompt: '바닥에서의 절대압력', answer: { value: 150.375, unit: 'kPa' }, points: 5 },
    ],
    hints: [
      '정지 유체의 압력은 깊이에 비례해 증가합니다 (p = ρgh).',
      '계기압력과 절대압력의 차이는 무엇인지 떠올려 보세요.',
    ],
    solution: [
      'p_gage = ρgh = 1000 × 9.81 × 5 = 49,050 Pa = 49.05 kPa',
      'p_abs = p_atm + p_gage = 101.325 + 49.05 = 150.375 kPa',
    ],
  },
  {
    id: 'fluid-pipe-contraction',
    subjectId: 'fluid_mechanics',
    topic: '베르누이',
    title: '축소관의 유속과 압력 변화',
    statement:
      '수평 원형관의 지름이 D₁ = 0.1 m에서 D₂ = 0.05 m로 줄어든다. 상류 유속 V₁ = 2 m/s, 물의 ρ = 1000 kg/m³, 동점성계수 ν = 1.0 × 10⁻⁶ m²/s. 손실은 무시한다.',
    parts: [
      { label: '(a)', prompt: '하류 유속 V₂', answer: { value: 8, unit: 'm/s' }, points: 3 },
      { label: '(b)', prompt: '압력 강하 p₁ − p₂', answer: { value: 30, unit: 'kPa' }, points: 4 },
      { label: '(c)', prompt: '상류의 레이놀즈 수 Re₁', answer: { value: 200000 }, points: 3 },
    ],
    hints: [
      '비압축성 유동의 연속 방정식: A₁V₁ = A₂V₂. 면적은 지름의 제곱에 비례합니다.',
      '수평관이고 손실이 없으므로 베르누이 방정식에서 위치 수두 항이 사라집니다.',
      'Re = VD/ν입니다. 결과가 약 2300보다 크면 난류로 판정합니다.',
    ],
    solution: [
      'V₂ = V₁ (D₁/D₂)² = 2 × (0.1/0.05)² = 8 m/s',
      '베르누이(수평, 무손실): p₁ − p₂ = ρ(V₂² − V₁²)/2 = 1000 × (64 − 4)/2 = 30,000 Pa = 30 kPa',
      'Re₁ = V₁D₁/ν = 2 × 0.1 / 1.0 × 10⁻⁶ = 2 × 10⁵ → 난류',
    ],
  },

  // ───────── 기계동역학 ─────────
  {
    id: 'dynamics-spring-mass',
    subjectId: 'dynamics',
    topic: '진동',
    title: '1자유도 스프링-질량계의 고유진동',
    statement: '질량 m = 2 kg, 스프링 상수 k = 800 N/m인 비감쇠 1자유도 스프링-질량계가 있다.',
    parts: [
      { label: '(a)', prompt: '고유 각진동수 ω_n', answer: { value: 20, unit: 'rad/s' }, points: 4 },
      { label: '(b)', prompt: '고유진동수 f_n', answer: { value: 3.1831, unit: 'Hz' }, points: 3 },
      { label: '(c)', prompt: '주기 T', answer: { value: 0.31416, unit: 's' }, points: 3 },
    ],
    hints: [
      '운동방정식 m·ẍ + k·x = 0에서 고유 각진동수가 나옵니다.',
      'ω_n [rad/s]과 f_n [Hz]은 2π배 차이가 납니다.',
      '주기는 진동수의 역수입니다.',
    ],
    solution: [
      'ω_n = √(k/m) = √(800/2) = 20 rad/s',
      'f_n = ω_n / (2π) = 20 / 6.2832 = 3.1831 Hz',
      'T = 1/f_n = 0.31416 s',
    ],
  },
  {
    id: 'dynamics-free-fall',
    subjectId: 'dynamics',
    topic: '에너지 보존',
    title: '자유낙하와 에너지 보존',
    statement: '질량 m = 2 kg인 물체를 높이 h = 5 m에서 정지 상태로 놓는다. g = 9.81 m/s², 공기 저항은 무시한다.',
    parts: [
      { label: '(a)', prompt: '바닥에 닿기 직전의 속력 v', answer: { value: 9.9045, unit: 'm/s' }, points: 5 },
      { label: '(b)', prompt: '낙하에 걸리는 시간 t', answer: { value: 1.0096, unit: 's' }, points: 5 },
    ],
    hints: [
      '위치에너지가 모두 운동에너지로 바뀝니다. 질량이 결과에 영향을 줄까요?',
      '등가속도 운동의 변위 식 h = ½gt²를 쓰세요.',
    ],
    solution: [
      '에너지 보존: mgh = ½mv² → v = √(2gh) = √(2 × 9.81 × 5) = 9.9045 m/s (질량과 무관)',
      'h = ½gt² → t = √(2h/g) = √(10/9.81) = 1.0096 s',
      '검산: v = g·t = 9.81 × 1.0096 = 9.904 m/s ✓',
    ],
  },
  {
    id: 'dynamics-damped-vibration',
    subjectId: 'dynamics',
    topic: '진동',
    title: '감쇠 1자유도계',
    statement:
      '질량 m = 2 kg, 스프링 상수 k = 800 N/m, 감쇠계수 c = 16 N·s/m인 점성 감쇠 1자유도계가 있다.',
    parts: [
      { label: '(a)', prompt: '감쇠비 ζ', answer: { value: 0.2 }, points: 5 },
      { label: '(b)', prompt: '감쇠 고유 각진동수 ω_d', answer: { value: 19.596, unit: 'rad/s' }, points: 5 },
    ],
    hints: [
      '감쇠비는 실제 감쇠계수를 임계 감쇠계수 c_c = 2√(km)로 나눈 값입니다.',
      'ζ < 1이면 부족감쇠로 진동합니다. 감쇠 고유진동수는 ω_n보다 약간 작습니다.',
    ],
    solution: [
      'c_c = 2√(km) = 2√(800 × 2) = 80 N·s/m',
      'ζ = c/c_c = 16/80 = 0.2 → 부족감쇠',
      'ω_n = √(k/m) = 20 rad/s, ω_d = ω_n√(1 − ζ²) = 20 × √0.96 = 19.596 rad/s',
    ],
  },
  // ───────── 추가 문제 ─────────
  {
    id: 'statics-incline-friction',
    subjectId: 'statics',
    topic: '마찰',
    title: '경사면 위 블록의 정지마찰',
    statement:
      '질량 m = 10 kg인 블록이 수평과 30°를 이루는 경사면 위에 정지해 있다. g = 9.81 m/s², 정지마찰계수 μs = 0.7.',
    parts: [
      { label: '(a)', prompt: '블록이 정지해 있기 위해 필요한 마찰력의 크기 F', answer: { value: 49.05, unit: 'N' }, points: 3 },
      { label: '(b)', prompt: '경사면이 블록에 주는 수직항력 N', answer: { value: 84.957, unit: 'N' }, points: 3 },
      { label: '(c)', prompt: '미끄러지지 않기 위한 최소 정지마찰계수 μ_min', answer: { value: 0.57735 }, points: 4 },
    ],
    hints: [
      '좌표축을 경사면에 평행·수직 방향으로 잡으면 식이 간단해집니다.',
      '정지 상태의 마찰력은 μN이 아니라 평형 조건에서 정해집니다. μs·N은 최대 정지마찰력입니다.',
      '미끄러지기 직전에는 필요한 마찰력이 최대 정지마찰력과 같아집니다.',
    ],
    solution: [
      '경사면 방향 평형: F = mg sinθ = 10 × 9.81 × 0.5 = 49.05 N',
      '경사면 수직 방향 평형: N = mg cosθ = 10 × 9.81 × 0.8660 = 84.96 N',
      '미끄러지기 직전: μ_min·N = mg sinθ → μ_min = tanθ = tan30° = 0.5774',
      'μs = 0.7 > 0.5774 이므로 블록은 정지 상태를 유지한다. (최대 정지마찰력 0.7 × 84.96 = 59.5 N > 49.05 N)',
    ],
  },
  {
    id: 'statics-simple-truss',
    subjectId: 'statics',
    topic: '트러스',
    title: '삼각형 트러스의 부재력 (절점법)',
    statement:
      '지점 A(핀)와 B(롤러) 사이 거리는 4 m이다. 꼭짓점 C는 AB의 중점 바로 위 3 m 높이에 있고, C에 수직 하중 P = 12 kN이 아래로 작용한다. 부재는 AC, BC, AB 세 개이다.',
    parts: [
      { label: '(a)', prompt: '지점 A의 수직 반력 R_A', answer: { value: 6, unit: 'kN' }, points: 3 },
      { label: '(b)', prompt: '부재 AC의 부재력 크기 F_AC', answer: { value: 7.2111, unit: 'kN' }, points: 4 },
      { label: '(c)', prompt: '부재 AB의 부재력 크기 F_AB', answer: { value: 4, unit: 'kN' }, points: 3 },
    ],
    hints: [
      '먼저 트러스 전체를 자유물체로 보고 반력을 구하세요. 구조와 하중이 대칭입니다.',
      '절점 A에서는 미지 부재력이 두 개뿐입니다. 부재 AC의 방향 성분(수평 2 m, 수직 3 m)을 이용하세요.',
      '부재력의 부호(인장/압축)는 절점에서 부재를 미는지 당기는지로 판단합니다.',
    ],
    solution: [
      '대칭: R_A = R_B = P/2 = 6 kN',
      'AC 길이 = √(2² + 3²) = 3.6056 m',
      '절점 A, 수직 평형: F_AC × (3/3.6056) = 6 → F_AC = 7.211 kN (압축)',
      '절점 A, 수평 평형: F_AB = F_AC × (2/3.6056) = 4 kN (인장)',
    ],
  },
  {
    id: 'mom-thermal-stress',
    subjectId: 'mechanics_of_materials',
    topic: '열응력',
    title: '양단 고정봉의 열응력',
    statement:
      '길이 L = 1 m인 강재 봉의 양 끝이 벽에 고정되어 있다. 온도가 ΔT = 50 K 상승한다. 선팽창계수 α = 12 × 10⁻⁶ /K, E = 200 GPa.',
    parts: [
      { label: '(a)', prompt: '봉에 생기는 열응력의 크기 σ', answer: { value: 120, unit: 'MPa' }, points: 6 },
      { label: '(b)', prompt: '양 끝이 자유롭다면 늘어났을 길이 δ_T', answer: { value: 0.6, unit: 'mm' }, points: 4 },
    ],
    hints: [
      '먼저 구속이 없을 때의 자유 열팽창량을 생각해 보세요.',
      '양단 고정이면 전체 변형량은 0입니다. 열변형을 상쇄하는 기계적 변형이 생겨야 합니다.',
      '결과가 봉의 길이와 관계있는지 확인해 보세요.',
    ],
    solution: [
      '자유 열팽창: δ_T = αΔT·L = 12 × 10⁻⁶ × 50 × 1000 mm = 0.6 mm',
      '적합 조건(전체 변형 0): σL/E = αΔT·L',
      'σ = EαΔT = 200,000 MPa × 12 × 10⁻⁶ × 50 = 120 MPa (압축)',
      '열응력은 길이 L과 무관하다.',
    ],
  },
  {
    id: 'mom-pressure-vessel',
    subjectId: 'mechanics_of_materials',
    topic: '압력용기',
    title: '얇은 원통형 압력용기',
    statement: '내경 D = 1 m, 두께 t = 10 mm인 얇은 원통형 압력용기에 내압 p = 2 MPa가 작용한다.',
    parts: [
      { label: '(a)', prompt: '원주(후프) 응력 σ_h', answer: { value: 100, unit: 'MPa' }, points: 5 },
      { label: '(b)', prompt: '축방향 응력 σ_a', answer: { value: 50, unit: 'MPa' }, points: 5 },
    ],
    hints: [
      'D/t가 충분히 크면(대략 20 이상) 박육 가정을 쓸 수 있습니다.',
      '원주 응력은 용기를 길이 방향으로 반 자른 자유물체, 축방향 응력은 단면으로 자른 자유물체에서 구합니다.',
    ],
    solution: [
      'D/t = 1000/10 = 100 → 박육 가정 적용 가능',
      'σ_h = pD/(2t) = 2 × 1000 / (2 × 10) = 100 MPa',
      'σ_a = pD/(4t) = 2 × 1000 / (4 × 10) = 50 MPa',
      '원주 응력이 축방향 응력의 2배이므로, 원통 용기는 축 방향으로 갈라지기 쉽다.',
    ],
  },
  {
    id: 'mom-euler-buckling',
    subjectId: 'mechanics_of_materials',
    topic: '좌굴',
    title: '원형 기둥의 오일러 좌굴',
    statement: '길이 L = 2 m, 지름 d = 40 mm인 강재 원형 기둥이 축 압축하중을 받는다. E = 200 GPa.',
    parts: [
      { label: '(a)', prompt: '양단 핀 지지일 때 임계 좌굴하중 P_cr', answer: { value: 62.013, unit: 'kN' }, points: 6 },
      { label: '(b)', prompt: '한쪽 고정·다른 쪽 자유일 때 임계 좌굴하중 P_cr', answer: { value: 15.503, unit: 'kN' }, points: 4 },
    ],
    hints: [
      '좌굴은 단면 2차 모멘트 I가 가장 작은 축 방향으로 일어납니다. 원형 단면은 모든 방향이 같습니다.',
      '오일러 공식은 유효 좌굴 길이 L_e를 씁니다. 지지 조건에 따라 L_e가 달라집니다.',
      '고정-자유 기둥의 유효 길이는 실제 길이보다 깁니다.',
    ],
    solution: [
      'I = πd⁴/64 = π × 0.04⁴ / 64 = 1.2566 × 10⁻⁷ m⁴',
      '(a) 핀-핀: L_e = L = 2 m, P_cr = π²EI/L_e² = π² × 200 × 10⁹ × 1.2566 × 10⁻⁷ / 2² = 62.01 kN',
      '(b) 고정-자유: L_e = 2L = 4 m → P_cr = 62.01 / 4 = 15.50 kN',
      '실제 설계에서는 세장비가 충분히 큰지(오일러 공식 적용 범위) 확인하고 안전계수를 적용한다.',
    ],
  },
  {
    id: 'thermo-adiabatic-compression',
    subjectId: 'thermodynamics',
    topic: '단열 과정',
    title: '공기의 가역 단열 압축',
    statement:
      '공기를 100 kPa, 300 K에서 800 kPa까지 가역 단열 압축한다. 공기는 이상기체이며 k = 1.4, cv = 0.718 kJ/(kg·K)이다.',
    parts: [
      { label: '(a)', prompt: '압축 후 온도 T₂ (절대온도)', answer: { value: 543.43, unit: 'K' }, points: 5 },
      { label: '(b)', prompt: '밀폐계로 볼 때 필요한 압축일의 크기 w (단위 질량당)', answer: { value: 174.79, unit: 'kJ/kg' }, points: 5 },
    ],
    hints: [
      '가역 단열 과정의 이상기체는 Pv^k = 일정입니다. 이를 T와 P의 관계로 바꿔 보세요.',
      '단열이므로 Q = 0입니다. 제1법칙에서 일과 내부에너지 변화의 관계를 쓰세요.',
    ],
    solution: [
      'T₂ = T₁ (P₂/P₁)^((k−1)/k) = 300 × 8^(0.2857) = 300 × 1.8114 = 543.4 K',
      '밀폐계 제1법칙(Q = 0): w_in = Δu = cv (T₂ − T₁)',
      'w = 0.718 × (543.4 − 300) = 174.8 kJ/kg',
    ],
  },
  {
    id: 'thermo-otto-cycle',
    subjectId: 'thermodynamics',
    topic: '사이클',
    title: '오토 사이클의 열효율',
    statement: '공기 표준 오토 사이클의 비열비는 k = 1.4이다.',
    parts: [
      { label: '(a)', prompt: '압축비 r = 8일 때 열효율 η', answer: { value: 0.56472 }, points: 5 },
      { label: '(b)', prompt: '압축비 r = 10일 때 열효율 η', answer: { value: 0.60189 }, points: 5 },
    ],
    hints: [
      '오토 사이클의 이론 열효율은 압축비와 비열비만으로 정해집니다.',
      '압축비가 커지면 효율은 어떻게 변할까요? 실제 엔진에서 압축비를 무한히 높이지 못하는 이유도 생각해 보세요.',
    ],
    solution: [
      'η = 1 − 1/r^(k−1)',
      '(a) r = 8: η = 1 − 8^(−0.4) = 1 − 0.4353 = 0.5647 (56.5%)',
      '(b) r = 10: η = 1 − 10^(−0.4) = 1 − 0.3981 = 0.6019 (60.2%)',
      '압축비를 높이면 효율이 오르지만, 가솔린 엔진에서는 노킹 때문에 한계가 있다.',
    ],
  },
  {
    id: 'fluid-pipe-friction-loss',
    subjectId: 'fluid_mechanics',
    topic: '관마찰',
    title: '직관의 마찰 손실 (Darcy–Weisbach)',
    statement:
      '길이 L = 100 m, 내경 D = 0.1 m인 수평 직관에 물(ρ = 1000 kg/m³)이 평균 유속 V = 2 m/s로 흐른다. 마찰계수 f = 0.02, g = 9.81 m/s².',
    parts: [
      { label: '(a)', prompt: '마찰 수두손실 h_L', answer: { value: 4.0775, unit: 'm' }, points: 5 },
      { label: '(b)', prompt: '마찰에 의한 압력 손실 Δp', answer: { value: 40, unit: 'kPa' }, points: 5 },
    ],
    hints: [
      'Darcy–Weisbach 식은 수두손실을 L/D와 속도수두 V²/(2g)의 곱으로 표현합니다.',
      '수두손실과 압력손실은 ρg로 서로 바꿀 수 있습니다.',
    ],
    solution: [
      'h_L = f (L/D) V²/(2g) = 0.02 × (100/0.1) × 2² / (2 × 9.81) = 4.078 m',
      'Δp = ρg·h_L = 1000 × 9.81 × 4.078 = 40,000 Pa = 40 kPa',
      '(검산: Δp = f (L/D) ρV²/2 = 0.02 × 1000 × 1000 × 4/2 = 40 kPa ✓)',
    ],
  },
  {
    id: 'fluid-buoyancy',
    subjectId: 'fluid_mechanics',
    topic: '부력',
    title: '물에 뜬 나무토막',
    statement:
      '크기 0.5 m × 0.4 m × 0.2 m(높이)인 나무토막(ρ = 600 kg/m³)이 넓은 면을 아래로 하여 물(ρ = 1000 kg/m³)에 떠 있다. g = 9.81 m/s².',
    parts: [
      { label: '(a)', prompt: '나무토막에 작용하는 부력 F_B', answer: { value: 235.44, unit: 'N' }, points: 5 },
      { label: '(b)', prompt: '물에 잠긴 깊이 h', answer: { value: 0.12, unit: 'm' }, points: 5 },
    ],
    hints: [
      '떠 있는 물체는 부력과 무게가 평형을 이룹니다.',
      '아르키메데스 원리: 부력은 물체가 밀어낸 유체의 무게와 같습니다.',
    ],
    solution: [
      '부피 V = 0.5 × 0.4 × 0.2 = 0.04 m³',
      '평형: F_B = W = ρ_wood·V·g = 600 × 0.04 × 9.81 = 235.44 N',
      '잠긴 부피: V_sub = F_B / (ρ_water·g) = 0.024 m³ → h = 0.024 / (0.5 × 0.4) = 0.12 m',
      '잠긴 비율 = ρ_wood/ρ_water = 0.6 (높이 0.2 m의 60%)',
    ],
  },
  {
    id: 'dynamics-curve-friction',
    subjectId: 'dynamics',
    topic: '원운동',
    title: '평탄한 커브를 도는 자동차',
    statement:
      '자동차가 반지름 r = 50 m인 평탄한(뱅크각 없는) 커브를 일정한 속력 72 km/h로 돈다. g = 9.81 m/s².',
    parts: [
      { label: '(a)', prompt: '구심가속도 a_n', answer: { value: 8, unit: 'm/s²' }, points: 5 },
      { label: '(b)', prompt: '미끄러지지 않기 위한 타이어-노면 최소 마찰계수 μ_min', answer: { value: 0.81549 }, points: 5 },
    ],
    hints: [
      '먼저 속력을 m/s로 바꾸세요.',
      '평탄한 커브에서 구심력을 제공하는 힘은 무엇일까요?',
    ],
    solution: [
      'v = 72 km/h = 20 m/s',
      'a_n = v²/r = 20² / 50 = 8 m/s²',
      '구심력 = 마찰력: m·v²/r ≤ μ·m·g → μ_min = v²/(rg) = 400 / (50 × 9.81) = 0.8155',
      '질량과 무관하다. 젖은 노면(μ ≈ 0.4~0.5)에서는 이 속도로 돌 수 없다.',
    ],
  },
  {
    id: 'dynamics-flywheel',
    subjectId: 'dynamics',
    topic: '강체 회전',
    title: '플라이휠의 회전 운동에너지',
    statement: '질량 m = 20 kg, 반지름 R = 0.3 m인 균일한 원판형 플라이휠이 3000 rpm으로 회전한다.',
    parts: [
      { label: '(a)', prompt: '회전축에 대한 질량 관성모멘트 I', answer: { value: 0.9, unit: 'kg·m²' }, points: 4 },
      { label: '(b)', prompt: '회전 운동에너지 E', answer: { value: 44.413, unit: 'kJ' }, points: 6 },
    ],
    hints: [
      '균일한 원판의 관성모멘트는 링(mR²)보다 작습니다.',
      '운동에너지 식에는 rad/s 단위의 각속도를 써야 합니다.',
    ],
    solution: [
      'I = ½ m R² = 0.5 × 20 × 0.3² = 0.9 kg·m²',
      'ω = 3000 × 2π / 60 = 314.16 rad/s',
      'E = ½ I ω² = 0.5 × 0.9 × 314.16² = 44,413 J = 44.41 kJ',
    ],
  },
]);

export function findProblem(problemId) {
  return PROBLEMS.find((p) => p.id === problemId) ?? null;
}

/** 정답 값·정답 단위·풀이를 제거한다. 단위 선택도 채점 대상이므로 단위 힌트는 주지 않는다. */
export function toPublicProblem(problem) {
  return {
    id: problem.id,
    subjectId: problem.subjectId,
    title: problem.title,
    topic: problem.topic,
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
    steps: [...problem.solution],
    answers: problem.parts.map((p) => ({ label: p.label, value: p.answer.value, unit: p.answer.unit ?? '' })),
  };
}
