import { describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_BYTES } from '../../shared/imagePolicy.js';
import { ApiError, createApi } from './api.js';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function pngFile(size = 100, name = 'sol.png', type = 'image/png') {
  return new File([new Uint8Array(size)], name, { type });
}

const baseInput = { subjectId: 'statics', mode: 'hint', question: '질문' };

describe('askTutor: 정상 업로드', () => {
  it('FormData로 질문·이력·이미지를 보내고 응답을 돌려준다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { reply: '답', refused: false, truncated: false }));
    const file = pngFile();
    const result = await createApi(fetchImpl).askTutor({ ...baseInput, history: [{ role: 'user', content: 'a' }], imageFile: file });

    expect(result.reply).toBe('답');
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/tutor');
    expect(options.method).toBe('POST');
    const form = options.body;
    expect(form.get('subjectId')).toBe('statics');
    expect(form.get('mode')).toBe('hint');
    expect(JSON.parse(form.get('history'))).toEqual([{ role: 'user', content: 'a' }]);
    expect(form.get('image').name).toBe('sol.png');
  });

  it('이미지가 없으면 image 필드를 보내지 않는다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { reply: '답' }));
    await createApi(fetchImpl).askTutor(baseInput);
    expect(fetchImpl.mock.calls[0][1].body.has('image')).toBe(false);
  });
});

describe('askTutor: 전송 전 검증 (서버 호출 없음)', () => {
  it.each([
    ['diagram.gif', 'image/gif'],
    ['scan.bmp', 'image/bmp'],
    ['doc.pdf', 'application/pdf'],
  ])('지원하지 않는 확장자 %s → UNSUPPORTED_TYPE', async (name, type) => {
    const fetchImpl = vi.fn();
    await expect(createApi(fetchImpl).askTutor({ ...baseInput, imageFile: pngFile(100, name, type) })).rejects.toMatchObject({
      code: 'UNSUPPORTED_TYPE',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('용량 초과 → TOO_LARGE', async () => {
    const fetchImpl = vi.fn();
    const promise = createApi(fetchImpl).askTutor({ ...baseInput, imageFile: pngFile(MAX_IMAGE_BYTES + 1) });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: 'TOO_LARGE' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('빈 파일 → EMPTY_FILE', async () => {
    const fetchImpl = vi.fn();
    await expect(createApi(fetchImpl).askTutor({ ...baseInput, imageFile: pngFile(0) })).rejects.toMatchObject({
      code: 'EMPTY_FILE',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('askTutor: 업로드 실패', () => {
  it('네트워크 오류(fetch reject) → NETWORK', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createApi(fetchImpl).askTutor({ ...baseInput, imageFile: pngFile() })).rejects.toMatchObject({
      code: 'NETWORK',
      status: 0,
    });
  });

  it('연결 실패 안내는 인터넷이 아니라 앱 서버(검은 창)를 가리킨다', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const error = await createApi(fetchImpl).fetchProblems('statics').catch((e) => e);
    expect(error.message).toContain('start-tutor.bat');
    expect(error.message).not.toContain('네트워크');
  });

  it('서버가 JSON 오류를 주면 그 코드와 메시지를 쓴다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(415, { code: 'CONTENT_MISMATCH', message: '내용 불일치' }));
    await expect(createApi(fetchImpl).askTutor({ ...baseInput, imageFile: pngFile() })).rejects.toMatchObject({
      code: 'CONTENT_MISMATCH',
      message: '내용 불일치',
      status: 415,
    });
  });

  it('프록시가 HTML 413을 주면(JSON 아님) TOO_LARGE', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>413 Request Entity Too Large</html>', { status: 413 }));
    await expect(createApi(fetchImpl).askTutor({ ...baseInput, imageFile: pngFile() })).rejects.toMatchObject({
      code: 'TOO_LARGE',
      status: 413,
    });
  });

  it('JSON이 아닌 415 → UNSUPPORTED_TYPE', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 415 }));
    await expect(createApi(fetchImpl).askTutor(baseInput)).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
  });

  it.each([500, 502, 503])('JSON이 아닌 %d → SERVER_ERROR', async (status) => {
    const fetchImpl = vi.fn(async () => new Response('Bad Gateway', { status }));
    await expect(createApi(fetchImpl).askTutor(baseInput)).rejects.toMatchObject({ code: 'SERVER_ERROR', status });
  });

  it('JSON이 아닌 404 → REQUEST_FAILED', async () => {
    const fetchImpl = vi.fn(async () => new Response('not found', { status: 404 }));
    await expect(createApi(fetchImpl).askTutor(baseInput)).rejects.toMatchObject({ code: 'REQUEST_FAILED' });
  });

  it('성공 상태인데 본문이 JSON이 아니면 BAD_RESPONSE', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }));
    await expect(createApi(fetchImpl).askTutor(baseInput)).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });
});

describe('기타 API', () => {
  it('fetchProblems는 과목 id를 URL 인코딩한다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, []));
    await createApi(fetchImpl).fetchProblems('a b&c');
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/problems?subject=a%20b%26c');
  });

  it('fetchSolution은 문제 id를 URL 인코딩한다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { steps: [] }));
    await createApi(fetchImpl).fetchSolution('a/b');
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/problems/a%2Fb/solution');
  });

  it('fetchConfig는 /api/config를 호출한다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { tutorEnabled: false }));
    expect(await createApi(fetchImpl).fetchConfig()).toEqual({ tutorEnabled: false });
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/config');
  });

  it('gradeAnswers는 JSON 본문으로 보낸다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { earned: 1 }));
    await createApi(fetchImpl).gradeAnswers('p1', { '(a)': '5 kN' });
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ problemId: 'p1', answers: { '(a)': '5 kN' } });
  });
});
