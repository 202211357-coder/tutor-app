import { describe, expect, it } from 'vitest';
import { SUBJECTS } from '../../shared/subjects.js';
import {
  GENERAL_NOTES_KEY,
  LECTURE_NOTES,
  lectureNote,
  penMark,
  randomSeed,
  teacherComment,
  tipOfTheDay,
} from './teacher.js';

describe('tipOfTheDay', () => {
  const general = LECTURE_NOTES[GENERAL_NOTES_KEY];

  it('같은 날에는 같은 문구, 다음 날에는 다음 문구', () => {
    const morning = new Date(2026, 9, 17, 8, 0);
    const night = new Date(2026, 9, 17, 23, 59);
    const tomorrow = new Date(2026, 9, 18, 8, 0);
    expect(tipOfTheDay(morning)).toBe(tipOfTheDay(night));
    const i = general.indexOf(tipOfTheDay(morning));
    expect(tipOfTheDay(tomorrow)).toBe(general[(i + 1) % general.length]);
  });

  it('항상 목록 안의 문구를 돌려준다', () => {
    for (let d = 0; d < 30; d++) expect(general).toContain(tipOfTheDay(new Date(2026, 0, 1 + d)));
  });
});

describe('lectureNote', () => {
  it('과목 5개 모두 전용 노트가 있다', () => {
    expect(Object.keys(LECTURE_NOTES).sort()).toEqual([...SUBJECTS.map((s) => s.id), GENERAL_NOTES_KEY].sort());
  });

  it.each(Object.keys(LECTURE_NOTES))('%s: 노트가 10개 이상이고 중복이 없다', (key) => {
    const notes = LECTURE_NOTES[key];
    expect(notes.length).toBeGreaterThanOrEqual(10);
    expect(new Set(notes).size).toBe(notes.length);
  });

  it('노트 문구는 과목끼리도 겹치지 않는다', () => {
    const all = Object.values(LECTURE_NOTES).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('과목마다 그 과목의 노트를 고르고, 같은 날에는 바뀌지 않는다', () => {
    const morning = new Date(2026, 9, 17, 8, 0);
    const night = new Date(2026, 9, 17, 23, 59);
    for (const { id } of SUBJECTS) {
      expect(LECTURE_NOTES[id]).toContain(lectureNote(id, morning));
      expect(lectureNote(id, night)).toBe(lectureNote(id, morning));
    }
  });

  it('열흘 동안 매일 다른 노트가 나온다', () => {
    const seen = new Set();
    for (let d = 0; d < 10; d++) seen.add(lectureNote('statics', new Date(2026, 9, 1 + d)));
    expect(seen.size).toBe(10);
  });

  it('모르는 과목이면 공통 노트를 쓴다', () => {
    expect(LECTURE_NOTES[GENERAL_NOTES_KEY]).toContain(lectureNote('unknown'));
    expect(LECTURE_NOTES[GENERAL_NOTES_KEY]).toContain(lectureNote(GENERAL_NOTES_KEY));
  });
});

describe('teacherComment', () => {
  it.each([
    [100, '정답입니다'],
    [70, '대부분'],
    [99.9, '대부분'],
    [40, '방향은'],
    [69.9, '방향은'],
    [10, '핵심 개념'],
    [0, '첫 번째 힌트'],
  ])('%d점 → "%s"', (percent, phrase) => {
    expect(teacherComment(percent)).toContain(phrase);
  });

  it('0점이어도 "시작 전" 같은 말은 하지 않는다 (답을 냈는데 틀린 경우)', () => {
    expect(teacherComment(0)).not.toContain('시작 전');
  });

  it('반말·감탄형(~요!, ~봐요) 대신 존댓말 평서형으로 쓴다', () => {
    for (const p of [0, 10, 40, 70, 100]) {
      const text = teacherComment(p);
      expect(text).not.toMatch(/!|봐요|해요\./);
      expect(text.endsWith('.')).toBe(true);
    }
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
