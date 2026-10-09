// 과목별 연습 문제. 정답(answer)은 서버에서만 쓰고, 클라이언트에는 toPublicProblem()으로 가린 뒤 보낸다.

export const PROBLEMS = Object.freeze([
  {
    id: 'statics-simply-supported-beam',
    subjectId: 'statics',
    title: '단순지지보의 반력과 최대 굽힘모멘트',
    statement:
      '길이 L = 4 m인 단순지지보 AB의 중앙에 집중하중 P = 10 kN이 아래로 작용한다. 보의 자중은 무시한다.',
    parts: [
      { label: '(a)', prompt: '지점 A의 수직 반력 R_A', answer: { value: 5, unit: 'kN' }, points: 4 },
      { label: '(b)', prompt: '최대 굽힘모멘트 M_max', answer: { value: 10, unit: 'kN·m' }, points: 6 },
    ],
  },
  {
    id: 'mom-axial-rod',
    subjectId: 'mechanics_of_materials',
    title: '원형봉의 축응력과 신장량',
    statement:
      '지름 d = 20 mm, 길이 L = 1 m인 강재 원형봉에 인장 하중 P = 31.4 kN이 작용한다. 탄성계수 E = 200 GPa.',
    parts: [
      // σ = P/A = 31400 / (π·10²) = 99.95 MPa
      { label: '(a)', prompt: '축응력 σ', answer: { value: 99.95, unit: 'MPa' }, points: 5 },
      // δ = σL/E = 99.95e6 · 1 / 200e9 = 0.4997 mm
      { label: '(b)', prompt: '신장량 δ', answer: { value: 0.4997, unit: 'mm' }, points: 5 },
    ],
  },
  {
    id: 'thermo-constant-pressure-heating',
    subjectId: 'thermodynamics',
    title: '공기의 정압 가열',
    statement:
      '질량 m = 2 kg의 공기를 정압 상태에서 300 K에서 400 K로 가열한다. 공기는 이상기체이며 cp = 1.005 kJ/(kg·K)로 일정하다.',
    parts: [
      { label: '(a)', prompt: '가한 열량 Q', answer: { value: 201, unit: 'kJ' }, points: 5 },
      { label: '(b)', prompt: '비엔탈피 변화 Δh', answer: { value: 100.5, unit: 'kJ/kg' }, points: 5 },
    ],
  },
  {
    id: 'fluid-pipe-flow-rate',
    subjectId: 'fluid_mechanics',
    title: '원형관의 유량',
    statement: '내경 D = 0.1 m인 원형관에 물(ρ = 1000 kg/m³)이 평균 유속 V = 2 m/s로 흐른다.',
    parts: [
      // Q = (π/4)·0.1²·2 = 0.015708 m³/s
      { label: '(a)', prompt: '체적유량 Q', answer: { value: 0.015708, unit: 'm³/s' }, points: 5 },
      { label: '(b)', prompt: '질량유량 ṁ', answer: { value: 15.708, unit: 'kg/s' }, points: 5 },
    ],
  },
  {
    id: 'dynamics-spring-mass',
    subjectId: 'dynamics',
    title: '1자유도 스프링-질량계의 고유진동',
    statement: '질량 m = 2 kg, 스프링 상수 k = 800 N/m인 비감쇠 1자유도 스프링-질량계가 있다.',
    parts: [
      { label: '(a)', prompt: '고유 각진동수 ω_n', answer: { value: 20, unit: 'rad/s' }, points: 4 },
      // f_n = 20 / 2π = 3.1831 Hz
      { label: '(b)', prompt: '고유진동수 f_n', answer: { value: 3.1831, unit: 'Hz' }, points: 3 },
      // T = 1 / f_n = 0.31416 s
      { label: '(c)', prompt: '주기 T', answer: { value: 0.31416, unit: 's' }, points: 3 },
    ],
  },
]);

export function findProblem(problemId) {
  return PROBLEMS.find((p) => p.id === problemId) ?? null;
}

/** 정답 값과 정답 단위를 제거한다. 단위 선택도 채점 대상이므로 힌트로 주지 않는다. */
export function toPublicProblem(problem) {
  return {
    id: problem.id,
    subjectId: problem.subjectId,
    title: problem.title,
    statement: problem.statement,
    parts: problem.parts.map((p) => ({ label: p.label, prompt: p.prompt, points: p.points })),
  };
}

export function listPublicProblems(subjectId) {
  return PROBLEMS.filter((p) => !subjectId || p.subjectId === subjectId).map(toPublicProblem);
}
