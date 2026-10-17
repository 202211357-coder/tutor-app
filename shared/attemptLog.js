// 채점 기록 목록(추가·조회·삭제). 저장 방식은 주입받는다:
// 서버는 JSON 파일(server/historyStore.js), 웹 버전은 브라우저 저장소(src/lib/browserHistory.js)를 쓴다.
export const MAX_ATTEMPTS = 2000;

/** 저장소에서 읽은 항목이 기록으로 쓸 수 있는 형태인지 */
export function isValidAttempt(a) {
  return (
    a &&
    typeof a.problemId === 'string' &&
    typeof a.subjectId === 'string' &&
    Number.isFinite(a.earned) &&
    Number.isFinite(a.max) &&
    typeof a.at === 'string'
  );
}

/**
 * @param {{load?: () => object[], save?: (attempts: object[]) => void, now?: () => Date, maxAttempts?: number}} [options]
 *   save가 예외를 던지면 record·clear도 그 예외를 그대로 던진다(호출한 쪽이 "기록 실패"를 알릴 수 있도록).
 */
export function createAttemptLog({ load = () => [], save = () => {}, now = () => new Date(), maxAttempts = MAX_ATTEMPTS } = {}) {
  let attempts = load();

  return {
    /** 채점 결과 하나를 기록하고 저장된 항목을 돌려준다. */
    record({ problemId, subjectId, seed = 0, earned, max, percent, answers }) {
      const entry = {
        problemId,
        subjectId,
        seed,
        earned,
        max,
        percent,
        answers: { ...answers },
        at: now().toISOString(),
      };
      attempts.push(entry);
      if (attempts.length > maxAttempts) attempts = attempts.slice(-maxAttempts);
      save(attempts);
      return entry;
    },

    /** 오래된 순서의 전체 기록 (복사본) */
    list() {
      return attempts.map((a) => ({ ...a, answers: { ...a.answers } }));
    },

    clear() {
      attempts = [];
      save(attempts);
    },
  };
}
