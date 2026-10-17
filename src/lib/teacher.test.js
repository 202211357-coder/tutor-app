import { describe, expect, it } from 'vitest';
import { penMark, randomSeed, teacherComment, tipOfTheDay, TIPS } from './teacher.js';

describe('tipOfTheDay', () => {
  it('같은 날에는 같은 문구, 다음 날에는 다음 문구', () => {
    const morning = new Date(2026, 9, 17, 8, 0);
    const night = new Date(2026, 9, 17, 23, 59);
    const tomorrow = new Date(2026, 9, 18, 8, 0);
    expect(tipOfTheDay(morning)).toBe(tipOfTheDay(night));
    const i = TIPS.indexOf(tipOfTheDay(morning));
    expect(tipOfTheDay(tomorrow)).toBe(TIPS[(i + 1) % TIPS.length]);
  });

  it('항상 목록 안의 문구를 돌려준다', () => {
    for (let d = 0; d < 30; d++) expect(TIPS).toContain(tipOfTheDay(new Date(2026, 0, 1 + d)));
  });
});

describe('teacherComment', () => {
  it.each([
    [100, '완벽'],
    [70, '거의 다'],
    [99.9, '거의 다'],
    [40, '방향은'],
    [69.9, '방향은'],
    [10, '풀이를'],
    [0, '첫 번째 힌트'],
  ])('%d점 → "%s"', (percent, phrase) => {
    expect(teacherComment(percent)).toContain(phrase);
  });

  it('0점이어도 "시작 전" 같은 말은 하지 않는다 (답을 냈는데 틀린 경우)', () => {
    expect(teacherComment(0)).not.toContain('시작 전');
  });
});

describe('penMark', () => {
  it.each([
    ['correct', '○'],
    ['close', '△'],
    ['missing_unit', '△'],
    ['wrong', '✗'],
    ['empty', '✗'],
    ['unit_mismatch', '✗'],
  ])('%s → %s', (status, symbol) => {
    expect(penMark(status).symbol).toBe(symbol);
  });
});

describe('randomSeed', () => {
  it('1 이상 2^31−1 이하의 정수 (0은 기본 문제라 제외)', () => {
    expect(randomSeed(() => 0)).toBe(1);
    expect(randomSeed(() => 0.999999999999)).toBe(2147483646);
    for (let i = 0; i < 100; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s) && s >= 1 && s <= 2 ** 31 - 1).toBe(true);
    }
  });
});
