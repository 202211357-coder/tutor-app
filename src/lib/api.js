import { validateImageMeta } from '../../shared/imagePolicy.js';

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// 서버가 JSON 오류 본문을 주지 못했을 때(프록시 오류 등) 상태 코드로 메시지를 정한다.
function fallbackError(status) {
  if (status === 413) return new ApiError('TOO_LARGE', '파일이 너무 커서 업로드하지 못했습니다.', status);
  if (status === 415) return new ApiError('UNSUPPORTED_TYPE', '지원하지 않는 파일 형식입니다.', status);
  if (status >= 500) return new ApiError('SERVER_ERROR', `서버 오류로 요청에 실패했습니다. (${status})`, status);
  return new ApiError('REQUEST_FAILED', `요청에 실패했습니다. (${status})`, status);
}

/**
 * 서버 API 클라이언트. 테스트에서는 fetchImpl을 mock으로 주입한다.
 * @param {typeof fetch} [fetchImpl]
 */
export function createApi(fetchImpl = (...args) => globalThis.fetch(...args)) {
  async function request(path, options) {
    let response;
    try {
      response = await fetchImpl(path, options);
    } catch {
      throw new ApiError('NETWORK', '서버에 연결할 수 없습니다. 네트워크 상태를 확인하세요.');
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      if (body && typeof body.code === 'string') {
        throw new ApiError(body.code, body.message ?? '요청에 실패했습니다.', response.status);
      }
      throw fallbackError(response.status);
    }
    if (body === null) throw new ApiError('BAD_RESPONSE', '서버 응답을 해석할 수 없습니다.', response.status);
    return body;
  }

  return {
    fetchSubjects: () => request('/api/subjects'),

    fetchProblems: (subjectId) => request(`/api/problems?subject=${encodeURIComponent(subjectId)}`),

    gradeAnswers: (problemId, answers) =>
      request('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, answers }),
      }),

    /**
     * 튜터에게 질문한다. 이미지는 전송 전에 형식·용량을 먼저 검사해 불필요한 업로드를 막는다.
     * @param {{subjectId: string, mode: string, question: string, history?: Array, imageFile?: File | null}} input
     */
    askTutor: async ({ subjectId, mode, question, history = [], imageFile = null }) => {
      const form = new FormData();
      form.append('subjectId', subjectId);
      form.append('mode', mode);
      form.append('question', question ?? '');
      form.append('history', JSON.stringify(history));
      if (imageFile) {
        const check = validateImageMeta(imageFile);
        if (!check.ok) throw new ApiError(check.code, check.message);
        form.append('image', imageFile, imageFile.name);
      }
      return request('/api/tutor', { method: 'POST', body: form });
    },
  };
}

export const api = createApi();
