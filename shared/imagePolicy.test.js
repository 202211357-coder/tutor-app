import { describe, expect, it } from 'vitest';
import { ACCEPT_ATTRIBUTE, detectImageType, IMAGE_ERROR, MAX_IMAGE_BYTES, validateImageMeta } from './imagePolicy.js';

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const WEBP_HEADER = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0x24, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)));

describe('validateImageMeta: 지원 형식', () => {
  it.each([
    ['solution.png', 'image/png', 'image/png'],
    ['solution.jpg', 'image/jpeg', 'image/jpeg'],
    ['solution.JPEG', 'image/jpeg', 'image/jpeg'],
    ['solution.webp', 'image/webp', 'image/webp'],
    ['my.notes.v2.PNG', 'image/png', 'image/png'],
  ])('%s (%s) 허용', (name, type, mediaType) => {
    expect(validateImageMeta({ name, type, size: 1024 })).toEqual({ ok: true, mediaType });
  });

  it('브라우저가 MIME을 비워 보내면 확장자로 형식을 정한다', () => {
    expect(validateImageMeta({ name: 'a.jpg', type: '', size: 10 })).toEqual({ ok: true, mediaType: 'image/jpeg' });
  });

  it('<input accept> 값에 허용 MIME이 모두 들어 있다', () => {
    expect(ACCEPT_ATTRIBUTE.split(',')).toEqual(['image/png', 'image/jpeg', 'image/webp']);
  });
});

describe('validateImageMeta: 지원하지 않는 확장자', () => {
  it.each([
    ['diagram.gif', 'image/gif'],
    ['scan.bmp', 'image/bmp'],
    ['photo.heic', 'image/heic'],
    ['report.pdf', 'application/pdf'],
    ['virus.exe', 'application/octet-stream'],
    ['noextension', ''],
    ['trailingdot.', ''],
  ])('%s → UNSUPPORTED_TYPE', (name, type) => {
    const r = validateImageMeta({ name, type, size: 1024 });
    expect(r).toMatchObject({ ok: false, code: IMAGE_ERROR.UNSUPPORTED_TYPE });
    expect(r.message).toContain('.png');
  });

  it('확장자와 MIME이 다르면 거부한다 (png 이름에 gif 형식)', () => {
    expect(validateImageMeta({ name: 'a.png', type: 'image/gif', size: 10 })).toMatchObject({
      ok: false,
      code: IMAGE_ERROR.UNSUPPORTED_TYPE,
    });
  });

  it('확장자와 MIME이 둘 다 허용 형식이어도 서로 다르면 거부한다', () => {
    expect(validateImageMeta({ name: 'a.png', type: 'image/jpeg', size: 10 }).ok).toBe(false);
  });
});

describe('validateImageMeta: 용량', () => {
  it('정확히 최대 용량(5MB)은 허용', () => {
    expect(validateImageMeta({ name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES }).ok).toBe(true);
  });

  it('최대 용량 + 1바이트는 TOO_LARGE', () => {
    const r = validateImageMeta({ name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 });
    expect(r).toMatchObject({ ok: false, code: IMAGE_ERROR.TOO_LARGE });
    expect(r.message).toContain('최대 5MB');
  });

  it.each([0, -1, NaN, undefined])('크기 %j → EMPTY_FILE', (size) => {
    expect(validateImageMeta({ name: 'a.png', type: 'image/png', size })).toMatchObject({
      ok: false,
      code: IMAGE_ERROR.EMPTY_FILE,
    });
  });

  it('파일이 없으면 NO_FILE', () => {
    expect(validateImageMeta(null)).toMatchObject({ ok: false, code: IMAGE_ERROR.NO_FILE });
  });
});

describe('detectImageType (매직 넘버)', () => {
  it.each([
    [PNG_HEADER, 'image/png'],
    [JPEG_HEADER, 'image/jpeg'],
    [WEBP_HEADER, 'image/webp'],
  ])('헤더로 %s 형식을 판별한다', (header, expected) => {
    expect(detectImageType(Uint8Array.from(header))).toBe(expected);
  });

  it('텍스트 파일은 null', () => {
    expect(detectImageType(new TextEncoder().encode('hello, this is not an image'))).toBeNull();
  });

  it('GIF는 지원 형식이 아니므로 null', () => {
    expect(detectImageType(new TextEncoder().encode('GIF89a......'))).toBeNull();
  });

  it('12바이트보다 짧거나 비어 있으면 null', () => {
    expect(detectImageType(Uint8Array.from(PNG_HEADER.slice(0, 8)))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
    expect(detectImageType(null)).toBeNull();
  });
});
