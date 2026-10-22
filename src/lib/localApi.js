import { gradeProblem } from '../../shared/grading.js';
import { summarizeHistory } from '../../shared/historySummary.js';
import { getProblemInstance, getSolution, isValidSeed, listPublicProblems, PROBLEMS, toPublicProblem } from '../../shared/problems.js';
import { SUBJECTS } from '../../shared/subjects.js';
import { ApiError } from './api.js';
import { createBrowserHistory } from './browserHistory.js';

// 서버 응답과 같은 모양이 되도록 JSON으로 한 번 직렬화한다. (공유 객체를 화면 코드에 넘기지 않기 위함이기도 하다)
const asJson = (value) => JSON.parse(JSON.stringify(value));

/**
 * 웹 버전(GitHub Pages)용 API. 서버 API(createApi)와 같은 함수·응답·오류 코드를 갖되,
 * 문제 생성·채점·기록을 모두 브라우저 안에서 처리한다. AI 질문은 API 키가 필요하므로 지원하지 않는다.
 * @param {{history?: ReturnType<typeof createBrowserHistory>}} [deps]
 */
export function createLocalApi({ history = createBrowserHistory() } = {}) {
  function resolveProblem(problemId, seed = 0) {
    if (!isValidSeed(seed)) throw new ApiError('BAD_SEED', 'seed는 0 이상의 정수여야 합니다.', 400);
    const problem = typeof problemId === 'string' ? getProblemInstance(problemId, seed) : null;
    if (!problem) throw new ApiError('UNKNOWN_PROBLEM', '문제를 찾을 수 없습니다.', 404);
    return problem;
  }

  return {
    fetchConfig: async () => ({ tutorEnabled: false, edition: 'web' }),

    fetchSubjects: async () => asJson(SUBJECTS.map(({ id, name, description, setSize }) => ({ id, name, description, setSize }))),

    fetchProblems: async (subjectId) => asJson(listPublicProblems(subjectId)),

    fetchProblemVariant: async (problemId, seed) => asJson(toPublicProblem(resolveProblem(problemId, seed))),

    fetchSolution: async (problemId, seed = 0) => asJson(getSolution(resolveProblem(problemId, seed))),

    fetchHistory: async () => asJson(summarizeHistory(history.list(), PROBLEMS, SUBJECTS)),

    clearHistory: async () => {
      try {
        history.clear();
      } catch {
        throw new ApiError('STORAGE_ERROR', '브라우저 저장소에서 기록을 지우지 못했습니다.');
      }
    },

    gradeAnswers: async (problemId, answers, seed = 0) => {
      const problem = resolveProblem(problemId, seed);
      if (answers !== undefined && (typeof answers !== 'object' || answers === null || Array.isArray(answers))) {
        throw new ApiError('BAD_ANSWERS', 'answers는 { 소문항: 답안 } 형태여야 합니다.', 400);
      }
      const result = gradeProblem(problem, answers ?? {});
      let recorded = true;
      try {
        history.record({
          problemId: problem.id,
          subjectId: problem.subjectId,
          seed: problem.seed,
          earned: result.earned,
          max: result.max,
          percent: result.percent,
          answers: answers ?? {},
        });
      } catch {
        // 저장소가 가득 찼거나 막혀 있어도 채점 결과는 돌려준다.
        recorded = false;
      }
      return asJson({ ...result, recorded });
    },

    askTutor: async () => {
      throw new ApiError('AI_NOT_CONFIGURED', '웹 버전에서는 AI 질문 기능을 사용할 수 없습니다.', 503);
    },
  };
}
