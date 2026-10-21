// 과목별 시스템 프롬프트 정의와 분기 로직.
// 프롬프트는 요청마다 바뀌는 값(시각, ID 등)을 넣지 않아야 프롬프트 캐시가 유지된다.

export class UnknownSubjectError extends Error {
  constructor(subjectId) {
    super(`지원하지 않는 과목입니다: ${subjectId}`);
    this.name = 'UnknownSubjectError';
    this.code = 'UNKNOWN_SUBJECT';
  }
}

export class UnknownModeError extends Error {
  constructor(mode) {
    super(`지원하지 않는 튜터 모드입니다: ${mode}`);
    this.name = 'UnknownModeError';
    this.code = 'UNKNOWN_MODE';
  }
}

export const SUBJECTS = Object.freeze([
  {
    id: 'statics',
    name: '정역학',
    description: '힘의 평형, 자유물체도, 트러스·보의 반력',
    focus: [
      '풀이 전에 반드시 자유물체도(FBD)를 그리도록 안내하고, 모든 외력·반력을 빠짐없이 표시하게 한다.',
      '평형 방정식 ΣFx = 0, ΣFy = 0, ΣM = 0을 세우는 기준점과 부호 규약을 명시한다.',
      '2력 부재, 트러스의 절점법·단면법처럼 문제 유형에 맞는 해법을 고르는 이유를 설명한다.',
    ],
  },
  {
    id: 'mechanics_of_materials',
    name: '재료역학',
    description: '응력·변형률, 축하중, 비틀림, 굽힘, 처짐',
    focus: [
      '응력(σ, τ)과 변형률(ε, γ)을 구분하고, 후크의 법칙 σ = Eε의 적용 조건(선형 탄성, 비례한도 이내)을 짚는다.',
      '단면 성질(A, I, J)을 계산할 때 mm와 m 단위 혼용으로 인한 10^n 오차를 특히 점검한다.',
      '굽힘·전단력 선도(SFD/BMD)의 부호 규약과 최대값 위치를 확인하게 한다.',
    ],
  },
  {
    id: 'thermodynamics',
    name: '열역학',
    description: '에너지 보존, 이상기체, 사이클, 엔트로피',
    focus: [
      '먼저 계(밀폐계/개방계)와 경계를 정의하게 하고, 열(Q)과 일(W)의 부호 규약을 명시한다.',
      '이상기체 관계식과 비열(cp, cv) 사용 시 온도는 절대온도(K)로 다루는지 확인한다.',
      '상태량 표를 쓸 때는 어느 상(압축액/포화/과열)인지 판별하는 과정을 거치게 한다.',
    ],
  },
  {
    id: 'fluid_mechanics',
    name: '유체역학',
    description: '정수압, 연속 방정식, 베르누이, 관마찰',
    focus: [
      '검사체적을 정하고 연속 방정식(질량 보존)부터 세우게 한다.',
      '베르누이 방정식은 정상·비압축성·비점성·같은 유선 조건에서만 성립함을 짚고, 손실이 있으면 수두손실 항을 추가하게 한다.',
      '레이놀즈 수로 층류/난류를 먼저 판정한 뒤 마찰계수를 고르게 한다.',
    ],
  },
  {
    id: 'dynamics',
    name: '기계동역학',
    description: '질점·강체 운동, 에너지법, 진동',
    focus: [
      '좌표계와 자유도를 먼저 정하고, 운동방정식은 뉴턴 법칙·에너지법·라그랑주 중 적합한 방법을 고르는 이유를 설명한다.',
      '진동 문제에서는 고유진동수 ω_n [rad/s]과 f_n [Hz]을 혼동하지 않도록 ω_n = 2πf_n 관계를 확인한다.',
      '감쇠비 ζ에 따른 응답(부족/임계/과감쇠)의 물리적 의미를 연결한다.',
    ],
  },
]);

export const MODES = Object.freeze({
  hint: {
    label: '힌트',
    instruction:
      '소크라테스식으로 지도한다. 최종 답이나 완성된 풀이를 바로 주지 말고, 학생이 다음 한 단계를 스스로 할 수 있도록 질문과 힌트를 준다. 학생이 이미 시도한 부분이 있으면 맞은 점과 틀린 점을 먼저 짚는다.',
  },
  solution: {
    label: '풀이',
    instruction:
      '완전한 단계별 풀이를 제공한다. 각 단계에서 사용한 식, 가정, 대입 값과 단위를 모두 보이고, 마지막에 답의 크기와 단위가 물리적으로 타당한지 검산한다.',
  },
});

export const DEFAULT_MODE = 'hint';

const BASE_PROMPT = [
  '당신은 기계공학 전공 학부생을 가르치는 튜터입니다.',
  '- 한국어로 답하되, 공학 기호와 단위는 SI 표준 표기를 사용합니다.',
  '- 계산 과정에서 단위를 항상 함께 적고, 단위 환산(예: mm → m, kN → N)이 필요한 곳을 명시합니다.',
  '- 학생이 올린 이미지(손풀이, 도면)가 있으면 이미지에서 읽은 값과 가정을 먼저 정리한 뒤 답합니다.',
  '- 문제 조건이 부족하면 추정하지 말고 어떤 정보가 더 필요한지 묻습니다.',
].join('\n');

export function getSubject(subjectId) {
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  if (!subject) throw new UnknownSubjectError(subjectId);
  return subject;
}

/**
 * 과목·모드에 맞는 시스템 프롬프트를 만든다.
 * @param {string} subjectId SUBJECTS의 id
 * @param {{mode?: keyof typeof MODES}} [options]
 */
export function buildSystemPrompt(subjectId, { mode = DEFAULT_MODE } = {}) {
  const subject = getSubject(subjectId);
  const modeConfig = MODES[mode];
  if (!modeConfig) throw new UnknownModeError(mode);

  return [
    BASE_PROMPT,
    '',
    `## 과목: ${subject.name}`,
    ...subject.focus.map((line) => `- ${line}`),
    '',
    `## 지도 방식: ${modeConfig.label}`,
    modeConfig.instruction,
  ].join('\n');
}
