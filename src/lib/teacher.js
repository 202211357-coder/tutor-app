// 화면에 쓰이는 "선생님" 문구. 순수 함수로 두어 테스트한다.

export const TIPS = Object.freeze([
  '단위부터 맞추면 반은 맞힌 거예요. mm와 m를 섞지 않았는지 먼저 보세요.',
  '풀기 전에 자유물체도부터! 힘을 빠짐없이 그리면 식은 저절로 나옵니다.',
  '답이 나오면 크기를 의심해 보세요. 응력이 10만 MPa라면 어딘가 틀린 거예요.',
  '공식을 외우기보다 어떤 가정에서 나온 식인지 기억하세요.',
  '틀린 문제는 숫자를 바꿔 한 번 더 풀어 보세요. 그래야 진짜 내 것이 됩니다.',
  'ω[rad/s]와 f[Hz]는 2π배 차이! 진동 문제의 단골 실수예요.',
  '온도가 들어간 식은 절대온도(K)로 계산하는 게 원칙이에요.',
]);

/** 날짜마다 바뀌는 오늘의 한마디 (같은 날에는 같은 문구) */
export function tipOfTheDay(date = new Date(), tips = TIPS) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return tips[((day % tips.length) + tips.length) % tips.length];
}

/** 채점 결과에 붙는 선생님 코멘트 */
export function teacherComment(percent) {
  if (percent >= 100) return '완벽해요! 숫자를 바꿔서 한 번 더 확인해 볼까요?';
  if (percent >= 70) return '거의 다 왔어요. 틀린 소문항의 단위와 계산을 다시 봐요.';
  if (percent >= 40) return '방향은 맞아요. 힌트를 하나씩 열어 보며 다시 도전!';
  if (percent > 0) return '괜찮아요. 풀이를 보면서 한 단계씩 따라가 봐요.';
  return '처음엔 누구나 그래요. 첫 번째 힌트부터 같이 봐요.';
}

/** 소문항 채점 상태 → 빨간 펜 표시 */
export function penMark(status) {
  if (status === 'correct') return { kind: 'correct', symbol: '○', label: '맞음' };
  if (status === 'close' || status === 'missing_unit') return { kind: 'partial', symbol: '△', label: '부분 점수' };
  return { kind: 'wrong', symbol: '✗', label: '틀림' };
}

/** 새 변형 문제용 seed (1 이상). 0은 기본 숫자를 뜻한다. */
export function randomSeed(random = Math.random) {
  return Math.floor(random() * 2147483646) + 1;
}
