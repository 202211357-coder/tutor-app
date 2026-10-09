import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../shared/subjects.js';

export const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;
const MAX_HISTORY_MESSAGES = 20;
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export class TutorServiceError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'TutorServiceError';
    this.code = code;
    this.status = status;
  }
}

/**
 * 이전 대화(history)를 API 형식으로 정리한다.
 * 문자열 content의 user/assistant 메시지만 남기고, 첫 메시지는 user가 되도록 앞쪽 assistant를 버린다.
 */
export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const cleaned = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  return cleaned;
}

/**
 * 이번 질문을 user 메시지로 만든다. 이미지는 텍스트보다 앞에 둔다.
 * @param {{question: string, image?: {mediaType: string, base64: string}}} input
 */
export function buildUserContent({ question, image }) {
  const content = [];
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } });
  }
  content.push({ type: 'text', text: question });
  return content;
}

function mapApiError(error) {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new TutorServiceError('AI_AUTH', '서버의 Claude API 키 설정을 확인하세요.', 500);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new TutorServiceError('AI_RATE_LIMIT', '요청이 많아 잠시 후 다시 시도해 주세요.', 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new TutorServiceError('AI_BAD_REQUEST', 'AI 요청 형식이 올바르지 않습니다.', 502);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new TutorServiceError('AI_UNAVAILABLE', 'AI 서버에 연결할 수 없습니다.', 503);
  }
  if (error instanceof Anthropic.APIError) {
    return new TutorServiceError('AI_ERROR', `AI 서버 오류가 발생했습니다. (${error.status ?? 'unknown'})`, 502);
  }
  return null;
}

/**
 * Claude API 호출부. client는 테스트에서 mock으로 주입한다.
 * @param {{client: Anthropic | null, model?: string}} deps
 */
export function createTutorService({ client, model = DEFAULT_MODEL }) {
  return {
    async ask({ subjectId, mode, question, history = [], image }) {
      // 과목·모드가 잘못되면 UnknownSubjectError / UnknownModeError가 그대로 올라간다.
      const systemPrompt = buildSystemPrompt(subjectId, { mode });
      if (!client) {
        throw new TutorServiceError('AI_NOT_CONFIGURED', '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.', 503);
      }

      const messages = [...sanitizeHistory(history), { role: 'user', content: buildUserContent({ question, image }) }];

      let response;
      try {
        response = await client.beta.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          // 안전 분류기가 거절하면 서버 측에서 권장 모델로 재시도한다.
          betas: [FALLBACK_BETA],
          fallbacks: 'default',
          output_config: { effort: 'medium' },
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages,
        });
      } catch (error) {
        throw mapApiError(error) ?? error;
      }

      if (response.stop_reason === 'refusal') {
        return {
          reply: '이 질문에는 답할 수 없습니다. 질문을 바꿔서 다시 시도해 주세요.',
          refused: true,
          truncated: false,
        };
      }

      const reply = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return { reply, refused: false, truncated: response.stop_reason === 'max_tokens' };
    },
  };
}
