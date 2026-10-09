import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { gradeProblem } from '../shared/grading.js';
import { detectImageType, IMAGE_ERROR, MAX_IMAGE_BYTES, validateImageMeta } from '../shared/imagePolicy.js';
import { findProblem, listPublicProblems } from '../shared/problems.js';
import { DEFAULT_MODE, SUBJECTS, UnknownModeError, UnknownSubjectError } from '../shared/subjects.js';
import { TutorServiceError } from './tutorService.js';

export const MAX_QUESTION_LENGTH = 4000;
const DEFAULT_IMAGE_QUESTION = '첨부한 풀이(이미지)를 검토해 주세요.';

function sendError(res, status, code, message) {
  res.status(status).json({ code, message });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10 },
});

// multer 오류(용량 초과 등)를 JSON 응답으로 바꾼다.
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 413, IMAGE_ERROR.TOO_LARGE, `파일이 너무 큽니다. (최대 ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
      }
      return sendError(res, 400, 'BAD_UPLOAD', `업로드 요청이 올바르지 않습니다. (${err.code})`);
    }
    return next(err);
  });
}

function parseHistory(raw) {
  if (raw === undefined || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {{tutorService: {ask: Function}, staticDir?: string}} deps
 */
export function createApp({ tutorService, staticDir }) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/subjects', (_req, res) => {
    res.json(SUBJECTS.map(({ id, name, description }) => ({ id, name, description })));
  });

  app.get('/api/problems', (req, res) => {
    const subjectId = typeof req.query.subject === 'string' ? req.query.subject : undefined;
    res.json(listPublicProblems(subjectId));
  });

  app.post('/api/grade', (req, res) => {
    const { problemId, answers } = req.body ?? {};
    const problem = typeof problemId === 'string' ? findProblem(problemId) : null;
    if (!problem) return sendError(res, 404, 'UNKNOWN_PROBLEM', '문제를 찾을 수 없습니다.');
    if (answers !== undefined && (typeof answers !== 'object' || answers === null || Array.isArray(answers))) {
      return sendError(res, 400, 'BAD_ANSWERS', 'answers는 { 소문항: 답안 } 형태여야 합니다.');
    }
    res.json(gradeProblem(problem, answers ?? {}));
  });

  app.post('/api/tutor', uploadImage, async (req, res) => {
    const { subjectId, mode = DEFAULT_MODE } = req.body ?? {};
    const history = parseHistory(req.body?.history);
    if (history === null) return sendError(res, 400, 'BAD_HISTORY', 'history 형식이 올바르지 않습니다.');

    let image;
    if (req.file) {
      const meta = validateImageMeta({ name: req.file.originalname, type: req.file.mimetype, size: req.file.size });
      if (!meta.ok) {
        const status = meta.code === IMAGE_ERROR.TOO_LARGE ? 413 : meta.code === IMAGE_ERROR.UNSUPPORTED_TYPE ? 415 : 400;
        return sendError(res, status, meta.code, meta.message);
      }
      // 확장자·MIME은 클라이언트가 속일 수 있으므로 실제 바이트로 다시 확인한다.
      if (detectImageType(req.file.buffer) !== meta.mediaType) {
        return sendError(res, 415, IMAGE_ERROR.CONTENT_MISMATCH, '파일 내용이 이미지 형식과 일치하지 않습니다.');
      }
      image = { mediaType: meta.mediaType, base64: req.file.buffer.toString('base64') };
    }

    const rawQuestion = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!rawQuestion && !image) return sendError(res, 400, 'EMPTY_QUESTION', '질문을 입력하거나 이미지를 첨부하세요.');
    if (rawQuestion.length > MAX_QUESTION_LENGTH) {
      return sendError(res, 400, 'QUESTION_TOO_LONG', `질문은 ${MAX_QUESTION_LENGTH}자 이하로 입력하세요.`);
    }

    try {
      const result = await tutorService.ask({
        subjectId,
        mode,
        question: rawQuestion || DEFAULT_IMAGE_QUESTION,
        history,
        image,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof UnknownSubjectError || error instanceof UnknownModeError) {
        return sendError(res, 400, error.code, error.message);
      }
      if (error instanceof TutorServiceError) return sendError(res, error.status, error.code, error.message);
      throw error;
    }
  });

  app.use('/api', (_req, res) => sendError(res, 404, 'NOT_FOUND', '존재하지 않는 API입니다.'));

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // 예상하지 못한 오류: 내부 메시지를 노출하지 않는다.
  app.use((err, _req, res, _next) => {
    console.error(err);
    sendError(res, 500, 'INTERNAL', '서버 내부 오류가 발생했습니다.');
  });

  return app;
}
