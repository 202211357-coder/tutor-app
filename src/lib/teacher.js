// 화면에 쓰이는 튜터 문구(대학 조교 말투). 순수 함수로 두어 테스트한다.

export const TIPS = Object.freeze([
  '계산 전에 단위를 SI로 통일하세요. mm와 m의 혼용은 가장 흔한 10³배 오차의 원인입니다.',
  '자유물체도(FBD)를 먼저 그리면 미지수와 평형 방정식의 개수를 바로 확인할 수 있습니다.',
  '결과의 크기를 공학적으로 검토하세요. 강재 응력이 수만 MPa라면 단위 환산을 다시 확인해야 합니다.',
  '공식보다 가정을 기억하세요. 베르누이 식은 정상·비압축성·비점성·동일 유선 조건에서만 성립합니다.',
  '틀린 문제는 수치를 바꿔 다시 풀어 보세요. 다른 조건에서도 적용할 수 있어야 이해한 것입니다.',
  'ω_n [rad/s]과 f_n [Hz]은 2π배 차이입니다. 진동 문제에서 가장 흔한 실수 중 하나입니다.',
  '이상기체 관계식에는 절대온도(K)를 사용합니다. °C를 그대로 대입하면 결과가 크게 달라집니다.',
]);

/** 날짜마다 바뀌는 오늘의 강의 노트 (같은 날에는 같은 문구) */
export function tipOfTheDay(date = new Date(), tips = TIPS) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return tips[((day % tips.length) + tips.length) % tips.length];
}

/** 채점 결과에 붙는 튜터 코멘트 */
export function teacherComment(percent) {
  if (percent >= 100) return '정답입니다. 수치를 바꾼 변형 문제로 같은 개념을 한 번 더 확인해 보세요.';
  if (percent >= 70) return '대부분 맞았습니다. 감점된 소문항의 단위와 유효숫자를 점검하세요.';
  if (percent >= 40) return '풀이 방향은 타당합니다. 힌트를 참고해 누락된 조건이 없는지 확인하세요.';
  if (percent > 0) return '핵심 개념부터 다시 정리해 봅시다. 풀이를 단계별로 따라가 보세요.';
  return '아직 정답이 없습니다. 첫 번째 힌트에서 접근 방법을 확인해 보세요.';
}

/** 소문항 채점 상태 → 채점 표시 */
export function penMark(status) {
  if (status === 'correct') return { kind: 'correct', symbol: '○', label: '맞음' };
  if (status === 'close' || status === 'missing_unit') return { kind: 'partial', symbol: '△', label: '부분 점수' };
  return { kind: 'wrong', symbol: '✗', label: '틀림' };
}

/** 새 변형 문제용 seed (1 이상). 0은 기본 숫자를 뜻한다. */
export function randomSeed(random = Math.random) {
  return Math.floor(random() * 2147483646) + 1;
}
