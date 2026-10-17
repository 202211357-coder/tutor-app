// 학습 기록 요약: 과목별 진도, 다시 풀어 볼 문제, 최근 기록.
// 숫자만 바꾼 변형 문제(seed)도 같은 문제 유형으로 보고 함께 집계한다.

export const RECENT_LIMIT = 20;

function round1(x) {
  return Math.round(x * 10) / 10;
}

/**
 * @param {Array<{problemId: string, subjectId: string, earned: number, max: number, percent: number, at: string}>} attempts 오래된 순
 * @param {Array<{id: string, subjectId: string, title: string, topic?: string}>} problems 현재 문제 목록
 * @param {Array<{id: string, name: string}>} subjects
 */
export function summarizeHistory(attempts, problems, subjects) {
  const problemById = new Map(problems.map((p) => [p.id, p]));

  // 문제별 최고 점수·시도 횟수 (삭제된 문제의 기록은 진도 계산에서 제외)
  const byProblem = new Map();
  for (const a of attempts) {
    if (!problemById.has(a.problemId)) continue;
    const stat = byProblem.get(a.problemId) ?? { attempts: 0, bestPercent: 0, lastPercent: 0, lastAt: '' };
    stat.attempts += 1;
    stat.bestPercent = Math.max(stat.bestPercent, a.percent);
    stat.lastPercent = a.percent;
    stat.lastAt = a.at;
    byProblem.set(a.problemId, stat);
  }

  const bySubject = subjects.map((subject) => {
    const subjectProblems = problems.filter((p) => p.subjectId === subject.id);
    const tried = subjectProblems.filter((p) => byProblem.has(p.id));
    const solved = tried.filter((p) => byProblem.get(p.id).bestPercent >= 100);
    const bests = tried.map((p) => byProblem.get(p.id).bestPercent);
    return {
      subjectId: subject.id,
      name: subject.name,
      total: subjectProblems.length,
      tried: tried.length,
      solved: solved.length,
      averageBest: bests.length ? round1(bests.reduce((s, x) => s + x, 0) / bests.length) : null,
    };
  });

  // 풀어 봤지만 아직 만점이 아닌 문제: 최고 점수가 낮은 순
  const toReview = [...byProblem.entries()]
    .filter(([, stat]) => stat.bestPercent < 100)
    .map(([problemId, stat]) => {
      const p = problemById.get(problemId);
      return { problemId, subjectId: p.subjectId, title: p.title, topic: p.topic ?? '', ...stat };
    })
    .sort((a, b) => a.bestPercent - b.bestPercent || a.lastAt.localeCompare(b.lastAt));

  const recent = attempts
    .slice(-RECENT_LIMIT)
    .reverse()
    .map((a) => ({
      problemId: a.problemId,
      subjectId: a.subjectId,
      title: problemById.get(a.problemId)?.title ?? '(삭제된 문제)',
      earned: a.earned,
      max: a.max,
      percent: a.percent,
      at: a.at,
    }));

  const bestByProblem = Object.fromEntries([...byProblem].map(([id, stat]) => [id, stat.bestPercent]));

  return { totalAttempts: attempts.length, bySubject, toReview, recent, bestByProblem };
}
