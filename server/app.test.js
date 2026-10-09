import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_BYTES } from '../shared/imagePolicy.js';
import { PROBLEMS } from '../shared/problems.js';
import { SUBJECTS, UnknownModeError, UnknownSubjectError } from '../shared/subjects.js';
import { createApp, MAX_QUESTION_LENGTH } from './app.js';
import { TutorServiceError } from './tutorService.js';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);

/** 매직 넘버가 맞는 가짜 PNG (전체 크기 size 바이트) */
function fakePng(size = 64) {
  const buf = Buffer.alloc(size);
  PNG_HEADER.copy(buf);
  return buf;
}

let tutorService;
let app;

beforeEach(() => {
  // Claude API 호출부(tutorService)는 mock. 라우트의 입력 검증과 오류 변환만 검사한다.
  tutorService = { ask: vi.fn(async () => ({ reply: '답변', refused: false, truncated: false })) };
  app = createApp({ tutorService });
});

function postTutor() {
  return request(app).post('/api/tutor').field('subjectId', 'statics').field('mode', 'hint');
}

describe('GET /api/subjects, /api/problems', () => {
  it('과목 목록을 돌려준다 (프롬프트 내용은 노출하지 않음)', async () => {
    const res = await request(app).get('/api/subjects').expect(200);
    expect(res.body.map((s) => s.id)).toEqual(SUBJECTS.map((s) => s.id));
    expect(res.body[0]).not.toHaveProperty('focus');
  });

  it('과목별 문제를 정답 없이 돌려준다', async () => {
    const res = await request(app).get('/api/problems?subject=statics').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((p) => p.subjectId === 'statics')).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('"answer"');
  });
});

describe('POST /api/grade', () => {
  const beam = PROBLEMS.find((p) => p.id === 'statics-simply-supported-beam');

  it('채점 결과를 돌려준다 (단위가 다른 답안 포함)', async () => {
    const res = await request(app)
      .post('/api/grade')
      .send({ problemId: beam.id, answers: { '(a)': '5000 N', '(b)': '10 kN·m' } })
      .expect(200);
    expect(res.body).toMatchObject({ earned: 10, max: 10, percent: 100 });
  });

  it('빈 답안은 0점', async () => {
    const res = await request(app).post('/api/grade').send({ problemId: beam.id, answers: {} }).expect(200);
    expect(res.body.earned).toBe(0);
  });

  it('없는 문제 → 404', async () => {
    const res = await request(app).post('/api/grade').send({ problemId: 'nope', answers: {} }).expect(404);
    expect(res.body.code).toBe('UNKNOWN_PROBLEM');
  });

  it.each([['문자열'], [['5 kN']], [null]])('answers가 객체가 아니면(%j) 400', async (answers) => {
    const res = await request(app).post('/api/grade').send({ problemId: beam.id, answers }).expect(400);
    expect(res.body.code).toBe('BAD_ANSWERS');
  });
});

describe('POST /api/tutor: 정상 흐름', () => {
  it('텍스트 질문 → tutorService.ask 호출 후 응답 전달', async () => {
    const res = await postTutor().field('question', '반력은?').expect(200);
    expect(res.body).toEqual({ reply: '답변', refused: false, truncated: false });
    expect(tutorService.ask).toHaveBeenCalledWith({
      subjectId: 'statics',
      mode: 'hint',
      question: '반력은?',
      history: [],
      image: undefined,
    });
  });

  it('이미지 첨부 → base64와 실제 형식을 넘긴다', async () => {
    const png = fakePng();
    await postTutor().field('question', '검토').attach('image', png, { filename: 'sol.png', contentType: 'image/png' }).expect(200);
    const { image } = tutorService.ask.mock.calls[0][0];
    expect(image).toEqual({ mediaType: 'image/png', base64: png.toString('base64') });
  });

  it('질문 없이 이미지만 보내면 기본 질문을 채운다', async () => {
    await postTutor().attach('image', fakePng(), { filename: 'sol.png', contentType: 'image/png' }).expect(200);
    expect(tutorService.ask.mock.calls[0][0].question).toContain('검토');
  });

  it('정확히 5MB 이미지는 허용', async () => {
    await postTutor()
      .attach('image', fakePng(MAX_IMAGE_BYTES), { filename: 'big.png', contentType: 'image/png' })
      .expect(200);
  });

  it('history(JSON 문자열)를 파싱해 넘긴다', async () => {
    const history = [{ role: 'user', content: '이전 질문' }];
    await postTutor().field('question', 'Q').field('history', JSON.stringify(history)).expect(200);
    expect(tutorService.ask.mock.calls[0][0].history).toEqual(history);
  });
});

describe('POST /api/tutor: 이미지 업로드 예외', () => {
  it.each([
    ['diagram.gif', 'image/gif'],
    ['report.pdf', 'application/pdf'],
    ['noext', 'application/octet-stream'],
  ])('지원하지 않는 형식 %s → 415 UNSUPPORTED_TYPE', async (filename, contentType) => {
    const res = await postTutor().field('question', 'Q').attach('image', fakePng(), { filename, contentType }).expect(415);
    expect(res.body.code).toBe('UNSUPPORTED_TYPE');
    expect(tutorService.ask).not.toHaveBeenCalled();
  });

  it('확장자는 png지만 내용이 이미지가 아니면 → 415 CONTENT_MISMATCH', async () => {
    const res = await postTutor()
      .field('question', 'Q')
      .attach('image', Buffer.from('this is not really a png file'), { filename: 'fake.png', contentType: 'image/png' })
      .expect(415);
    expect(res.body.code).toBe('CONTENT_MISMATCH');
  });

  it('확장자는 jpg인데 내용은 png → 415 CONTENT_MISMATCH', async () => {
    const res = await postTutor()
      .field('question', 'Q')
      .attach('image', fakePng(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .expect(415);
    expect(res.body.code).toBe('CONTENT_MISMATCH');
  });

  it('5MB + 1바이트 → 413 TOO_LARGE', async () => {
    const res = await postTutor()
      .field('question', 'Q')
      .attach('image', fakePng(MAX_IMAGE_BYTES + 1), { filename: 'big.png', contentType: 'image/png' })
      .expect(413);
    expect(res.body.code).toBe('TOO_LARGE');
    expect(tutorService.ask).not.toHaveBeenCalled();
  });

  it('빈 파일 → 400 EMPTY_FILE', async () => {
    const res = await postTutor()
      .field('question', 'Q')
      .attach('image', Buffer.alloc(0), { filename: 'empty.png', contentType: 'image/png' })
      .expect(400);
    expect(res.body.code).toBe('EMPTY_FILE');
  });

  it('필드 이름이 image가 아니면 → 400 BAD_UPLOAD', async () => {
    const res = await postTutor()
      .field('question', 'Q')
      .attach('photo', fakePng(), { filename: 'a.png', contentType: 'image/png' })
      .expect(400);
    expect(res.body.code).toBe('BAD_UPLOAD');
  });

  it('이미지를 2장 보내면 → 400 BAD_UPLOAD', async () => {
    const res = await postTutor()
      .field('question', 'Q')
      .attach('image', fakePng(), { filename: 'a.png', contentType: 'image/png' })
      .attach('image', fakePng(), { filename: 'b.png', contentType: 'image/png' })
      .expect(400);
    expect(res.body.code).toBe('BAD_UPLOAD');
  });
});

describe('POST /api/tutor: 입력 검증과 AI 오류 변환', () => {
  it('질문도 이미지도 없으면 400 EMPTY_QUESTION', async () => {
    const res = await postTutor().field('question', '   ').expect(400);
    expect(res.body.code).toBe('EMPTY_QUESTION');
  });

  it('질문이 너무 길면 400', async () => {
    const res = await postTutor().field('question', 'a'.repeat(MAX_QUESTION_LENGTH + 1)).expect(400);
    expect(res.body.code).toBe('QUESTION_TOO_LONG');
  });

  it('history가 JSON 배열이 아니면 400', async () => {
    const res = await postTutor().field('question', 'Q').field('history', '{broken').expect(400);
    expect(res.body.code).toBe('BAD_HISTORY');
  });

  it('알 수 없는 과목 → 400 UNKNOWN_SUBJECT', async () => {
    tutorService.ask.mockRejectedValueOnce(new UnknownSubjectError('astronomy'));
    const res = await postTutor().field('question', 'Q').expect(400);
    expect(res.body.code).toBe('UNKNOWN_SUBJECT');
  });

  it('알 수 없는 모드 → 400 UNKNOWN_MODE', async () => {
    tutorService.ask.mockRejectedValueOnce(new UnknownModeError('cheat'));
    const res = await postTutor().field('question', 'Q').expect(400);
    expect(res.body.code).toBe('UNKNOWN_MODE');
  });

  it.each([
    ['AI_RATE_LIMIT', 429],
    ['AI_UNAVAILABLE', 503],
    ['AI_NOT_CONFIGURED', 503],
    ['AI_ERROR', 502],
  ])('TutorServiceError %s → %d', async (code, status) => {
    tutorService.ask.mockRejectedValueOnce(new TutorServiceError(code, '메시지', status));
    const res = await postTutor().field('question', 'Q').expect(status);
    expect(res.body).toEqual({ code, message: '메시지' });
  });

  it('예상하지 못한 오류 → 500, 내부 메시지 비노출', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    tutorService.ask.mockRejectedValueOnce(new Error('secret internal detail'));
    const res = await postTutor().field('question', 'Q').expect(500);
    expect(res.body.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('secret');
    spy.mockRestore();
  });

  it('없는 API 경로 → 404 JSON', async () => {
    const res = await request(app).get('/api/unknown').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
