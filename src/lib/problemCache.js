import { api } from './api.js';

// 과목별 문제 목록은 서버에서 바뀌지 않으므로 한 번 받은 결과(Promise)를 재사용한다.
// 앱 시작 시 모든 과목을 미리 받아 두면, 처음 여는 과목도 로딩 화면 없이 바로 보인다.
const cache = new Map();
const loaded = new Map(); // 이미 도착한 목록 (첫 렌더링에서 동기적으로 꺼내 쓰기 위함)

export function getProblems(subjectId, fetchProblems = api.fetchProblems) {
  if (!cache.has(subjectId)) {
    const promise = fetchProblems(subjectId).then(
      (list) => {
        loaded.set(subjectId, list);
        return list;
      },
      (err) => {
        cache.delete(subjectId); // 실패한 요청은 다음에 다시 시도할 수 있게 지운다
        throw err;
      },
    );
    cache.set(subjectId, promise);
  }
  return cache.get(subjectId);
}

/** 이미 받아 둔 목록이 있으면 바로 돌려준다 (없으면 null) */
export function peekProblems(subjectId) {
  return loaded.get(subjectId) ?? null;
}

export function prefetchProblems(subjectIds, fetchProblems = api.fetchProblems) {
  for (const id of subjectIds) getProblems(id, fetchProblems).catch(() => {});
}

export function clearProblemCache() {
  cache.clear();
  loaded.clear();
}
