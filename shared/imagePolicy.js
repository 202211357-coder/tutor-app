// 업로드 이미지 정책. 클라이언트(사전 검증)와 서버(최종 검증)가 같은 규칙을 쓴다.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Claude API가 받는 이미지 형식 중 손풀이 사진에 쓸 형식만 허용한다.
export const ALLOWED_IMAGE_TYPES = Object.freeze({
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
});

export const IMAGE_ERROR = Object.freeze({
  NO_FILE: 'NO_FILE',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  EMPTY_FILE: 'EMPTY_FILE',
  TOO_LARGE: 'TOO_LARGE',
  CONTENT_MISMATCH: 'CONTENT_MISMATCH',
});

const ACCEPT_LIST = Object.entries(ALLOWED_IMAGE_TYPES)
  .flatMap(([, exts]) => exts.map((e) => `.${e}`))
  .join(', ');

/** <input accept> 값 */
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_IMAGE_TYPES).join(',');

function fail(code, message) {
  return { ok: false, code, message };
}

function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * 파일 메타데이터(이름, MIME, 크기)를 검사한다.
 * 브라우저가 MIME을 비워 보내는 경우가 있어, 그때는 확장자로 형식을 정한다.
 * @returns {{ok: true, mediaType: string} | {ok: false, code: string, message: string}}
 */
export function validateImageMeta(file) {
  if (!file) return fail(IMAGE_ERROR.NO_FILE, '파일이 선택되지 않았습니다.');
  const { name = '', type = '', size } = file;
  const ext = extensionOf(name);
  const typeFromExt = Object.keys(ALLOWED_IMAGE_TYPES).find((t) => ALLOWED_IMAGE_TYPES[t].includes(ext));

  if (!typeFromExt) {
    return fail(IMAGE_ERROR.UNSUPPORTED_TYPE, `지원하지 않는 파일 형식입니다. (${ACCEPT_LIST}만 가능)`);
  }
  if (type && type !== typeFromExt) {
    return fail(IMAGE_ERROR.UNSUPPORTED_TYPE, `파일 확장자(.${ext})와 형식(${type})이 일치하지 않습니다.`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    return fail(IMAGE_ERROR.EMPTY_FILE, '빈 파일입니다.');
  }
  if (size > MAX_IMAGE_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(1);
    return fail(IMAGE_ERROR.TOO_LARGE, `파일이 너무 큽니다. (${mb}MB, 최대 ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
  }
  return { ok: true, mediaType: typeFromExt };
}

/** 파일 앞부분 바이트(매직 넘버)로 실제 이미지 형식을 판별한다. 모르면 null. */
export function detectImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return 'image/png';
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  const ascii = (start, end) => String.fromCharCode(...b.slice(start, end));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}
