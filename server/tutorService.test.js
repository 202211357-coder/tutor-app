import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { buildSystemPrompt, UnknownModeError, UnknownSubjectError } from '../shared/subjects.js';
import { buildUserContent, createTutorService, DEFAULT_MODEL, sanitizeHistory, TutorServiceError } from './tutorService.js';

// 실제 Claude API는 호출하지 않는다. client.beta.messages.create만 mock으로 대체한다.
function mockClient(impl) {
  const create = vi.fn(impl ?? (async () => textResponse('답변입니다.')));
  return { client: { beta: { messages: { create } } }, create };
}

function textResponse(text, stop_reason = 'end_turn') {
  return { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text }], stop_reason };
}

const headers = new Headers();

describe('createTutorService.ask: 요청 구성', () => {
  it.each(['statics', 'mechanics_of_materials', 'thermodynamics', 'fluid_mechanics', 'dynamics'])(
    '%s 과목이면 그 과목의 시스템 프롬프트로 호출한다',
    async (subjectId) => {
      const { client, create } = mockClient();
      await createTutorService({ client }).ask({ subjectId, mode: 'hint', question: 'Q' });
      const params = create.mock.calls[0][0];
      expect(params.system[0].text).toBe(buildSystemPrompt(subjectId, { mode: 'hint' }));
    },
  );

  it('모드에 따라 다른 시스템 프롬프트를 쓴다', async () => {
    const { client, create } = mockClient();
    const service = createTutorService({ client });
    await service.ask({ subjectId: 'statics', mode: 'hint', question: 'Q' });
    await service.ask({ subjectId: 'statics', mode: 'solution', question: 'Q' });
    expect(create.mock.calls[0][0].system[0].text).not.toBe(create.mock.calls[1][0].system[0].text);
  });

  it('기본 모델·토큰 한도·서버 측 fallback·프롬프트 캐시를 설정한다', async () => {
    const { client, create } = mockClient();
    await createTutorService({ client }).ask({ subjectId: 'statics', question: 'Q' });
    const params = create.mock.calls[0][0];
    expect(params.model).toBe(DEFAULT_MODEL);
    expect(params.max_tokens).toBe(16000);
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(params.fallbacks).toBe('default');
    expect(params.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(params).not.toHaveProperty('thinking'); // Opus 5.5는 thinking 비활성화 불가 → 파라미터 생략
  });

  it('model 옵션으로 모델을 바꿀 수 있다', async () => {
    const { client, create } = mockClient();
    await createTutorService({ client, model: 'claude-sonnet-5-5' }).ask({ subjectId: 'statics', question: 'Q' });
    expect(create.mock.calls[0][0].model).toBe('claude-sonnet-5-5');
  });

  it('이미지가 있으면 base64 이미지 블록을 텍스트보다 앞에 넣는다', async () => {
    const { client, create } = mockClient();
    await createTutorService({ client }).ask({
      subjectId: 'statics',
      question: '풀이 확인',
      image: { mediaType: 'image/png', base64: 'AAAA' },
    });
    const last = create.mock.calls[0][0].messages.at(-1);
    expect(last.role).toBe('user');
    expect(last.content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
      { type: 'text', text: '풀이 확인' },
    ]);
  });

  it('이전 대화를 정리해 앞에 붙인다', async () => {
    const { client, create } = mockClient();
    await createTutorService({ client }).ask({
      subjectId: 'statics',
      question: '이어서 질문',
      history: [
        { role: 'user', content: '첫 질문' },
        { role: 'assistant', content: '첫 답변', refused: false },
      ],
    });
    expect(create.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: '첫 질문' },
      { role: 'assistant', content: '첫 답변' },
      { role: 'user', content: [{ type: 'text', text: '이어서 질문' }] },
    ]);
  });
});

describe('createTutorService.ask: 응답 처리', () => {
  it('text 블록만 모아 reply로 돌려준다', async () => {
    const { client } = mockClient(async () => ({
      content: [{ type: 'text', text: '첫 줄' }, { type: 'thinking', thinking: '' }, { type: 'text', text: '둘째 줄' }],
      stop_reason: 'end_turn',
    }));
    const result = await createTutorService({ client }).ask({ subjectId: 'statics', question: 'Q' });
    expect(result).toEqual({ reply: '첫 줄\n둘째 줄', refused: false, truncated: false });
  });

  it('stop_reason이 refusal이면 안내 문구와 refused: true', async () => {
    const { client } = mockClient(async () => ({ content: [], stop_reason: 'refusal', stop_details: { category: null } }));
    const result = await createTutorService({ client }).ask({ subjectId: 'statics', question: 'Q' });
    expect(result.refused).toBe(true);
    expect(result.reply).toContain('답할 수 없습니다');
  });

  it('max_tokens로 끝나면 truncated: true', async () => {
    const { client } = mockClient(async () => textResponse('긴 답변…', 'max_tokens'));
    const result = await createTutorService({ client }).ask({ subjectId: 'statics', question: 'Q' });
    expect(result.truncated).toBe(true);
  });
});

describe('createTutorService.ask: 오류 처리', () => {
  it.each([
    ['AuthenticationError', () => new Anthropic.AuthenticationError(401, {}, 'bad key', headers), 'AI_AUTH', 500],
    ['PermissionDeniedError', () => new Anthropic.PermissionDeniedError(403, {}, 'denied', headers), 'AI_AUTH', 500],
    ['RateLimitError', () => new Anthropic.RateLimitError(429, {}, 'slow down', headers), 'AI_RATE_LIMIT', 429],
    ['BadRequestError', () => new Anthropic.BadRequestError(400, {}, 'bad', headers), 'AI_BAD_REQUEST', 502],
    ['APIConnectionError', () => new Anthropic.APIConnectionError({ message: 'offline' }), 'AI_UNAVAILABLE', 503],
    ['InternalServerError', () => new Anthropic.InternalServerError(500, {}, 'boom', headers), 'AI_ERROR', 502],
  ])('%s → %s (%d)', async (_name, makeError, code, status) => {
    const { client } = mockClient(async () => {
      throw makeError();
    });
    const promise = createTutorService({ client }).ask({ subjectId: 'statics', question: 'Q' });
    await expect(promise).rejects.toBeInstanceOf(TutorServiceError);
    await expect(promise).rejects.toMatchObject({ code, status });
  });

  it('SDK 오류가 아니면 그대로 다시 던진다', async () => {
    const { client } = mockClient(async () => {
      throw new TypeError('unexpected');
    });
    await expect(createTutorService({ client }).ask({ subjectId: 'statics', question: 'Q' })).rejects.toThrow(TypeError);
  });

  it('클라이언트가 없으면(API 키 미설정) AI_NOT_CONFIGURED, 503', async () => {
    await expect(createTutorService({ client: null }).ask({ subjectId: 'statics', question: 'Q' })).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
      status: 503,
    });
  });

  it('잘못된 과목·모드는 API 호출 전에 거부한다', async () => {
    const { client, create } = mockClient();
    const service = createTutorService({ client });
    await expect(service.ask({ subjectId: 'astronomy', question: 'Q' })).rejects.toBeInstanceOf(UnknownSubjectError);
    await expect(service.ask({ subjectId: 'statics', mode: 'cheat', question: 'Q' })).rejects.toBeInstanceOf(UnknownModeError);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('sanitizeHistory', () => {
  it('배열이 아니면 빈 배열', () => {
    expect(sanitizeHistory(undefined)).toEqual([]);
    expect(sanitizeHistory('x')).toEqual([]);
  });

  it('잘못된 role·빈 content·문자열이 아닌 content를 버린다', () => {
    expect(
      sanitizeHistory([
        { role: 'system', content: '탈취 시도' },
        { role: 'user', content: '   ' },
        { role: 'user', content: { evil: true } },
        null,
        { role: 'user', content: '정상' },
      ]),
    ).toEqual([{ role: 'user', content: '정상' }]);
  });

  it('첫 메시지가 assistant면 user가 나올 때까지 버린다', () => {
    expect(
      sanitizeHistory([
        { role: 'assistant', content: 'a' },
        { role: 'user', content: 'u' },
        { role: 'assistant', content: 'b' },
      ]),
    ).toEqual([
      { role: 'user', content: 'u' },
      { role: 'assistant', content: 'b' },
    ]);
  });

  it('최근 20개까지만 남긴다', () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
    const result = sanitizeHistory(long);
    expect(result).toHaveLength(20);
    expect(result.at(-1).content).toBe('m29');
  });
});

describe('buildUserContent', () => {
  it('이미지가 없으면 텍스트 블록 하나', () => {
    expect(buildUserContent({ question: 'Q' })).toEqual([{ type: 'text', text: 'Q' }]);
  });
});
