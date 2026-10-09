import { describe, expect, it } from 'vitest';
import {
  buildSystemPrompt,
  DEFAULT_MODE,
  getSubject,
  MODES,
  SUBJECTS,
  UnknownModeError,
  UnknownSubjectError,
} from './subjects.js';

// 과목별로 프롬프트에 반드시 들어가야 하는 핵심 지도 포인트
const SUBJECT_KEYWORDS = {
  statics: ['정역학', '자유물체도', 'ΣM = 0'],
  mechanics_of_materials: ['재료역학', 'σ = Eε', 'SFD/BMD'],
  thermodynamics: ['열역학', '절대온도(K)', '밀폐계/개방계'],
  fluid_mechanics: ['유체역학', '베르누이', '레이놀즈 수'],
  dynamics: ['기계동역학', 'ω_n = 2πf_n', '감쇠비 ζ'],
};

describe('SUBJECTS', () => {
  it('과목 id가 중복되지 않는다', () => {
    const ids = SUBJECTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('테스트 키워드 표가 모든 과목을 다룬다', () => {
    expect(Object.keys(SUBJECT_KEYWORDS).sort()).toEqual(SUBJECTS.map((s) => s.id).sort());
  });
});

describe('buildSystemPrompt: 과목별 분기', () => {
  it.each(Object.entries(SUBJECT_KEYWORDS))('%s 프롬프트에 해당 과목 지침이 들어간다', (subjectId, keywords) => {
    const prompt = buildSystemPrompt(subjectId);
    for (const keyword of keywords) expect(prompt).toContain(keyword);
  });

  it.each(SUBJECTS.map((s) => s.id))('%s 프롬프트에 다른 과목 지침이 섞이지 않는다', (subjectId) => {
    const prompt = buildSystemPrompt(subjectId);
    for (const other of SUBJECTS.filter((s) => s.id !== subjectId)) {
      expect(prompt).not.toContain(`## 과목: ${other.name}`);
      for (const line of other.focus) expect(prompt).not.toContain(line);
    }
  });

  it('모든 과목 프롬프트에 공통 지침(한국어·SI 단위)이 들어간다', () => {
    for (const { id } of SUBJECTS) {
      const prompt = buildSystemPrompt(id);
      expect(prompt).toContain('기계공학 전공 학부생');
      expect(prompt).toContain('SI 표준 표기');
    }
  });

  it('모든 과목의 프롬프트가 서로 다르다', () => {
    const prompts = SUBJECTS.map((s) => buildSystemPrompt(s.id));
    expect(new Set(prompts).size).toBe(SUBJECTS.length);
  });

  it('같은 입력이면 항상 같은 프롬프트를 만든다 (프롬프트 캐시 유지)', () => {
    expect(buildSystemPrompt('statics', { mode: 'solution' })).toBe(buildSystemPrompt('statics', { mode: 'solution' }));
  });
});

describe('buildSystemPrompt: 모드 분기', () => {
  it('모드를 생략하면 기본 모드(힌트)를 쓴다', () => {
    expect(DEFAULT_MODE).toBe('hint');
    expect(buildSystemPrompt('dynamics')).toBe(buildSystemPrompt('dynamics', { mode: 'hint' }));
  });

  it('힌트 모드는 최종 답을 바로 주지 말라고 지시한다', () => {
    const prompt = buildSystemPrompt('statics', { mode: 'hint' });
    expect(prompt).toContain(MODES.hint.instruction);
    expect(prompt).not.toContain(MODES.solution.instruction);
  });

  it('풀이 모드는 단계별 풀이와 검산을 지시한다', () => {
    const prompt = buildSystemPrompt('statics', { mode: 'solution' });
    expect(prompt).toContain(MODES.solution.instruction);
    expect(prompt).not.toContain(MODES.hint.instruction);
  });
});

describe('잘못된 입력', () => {
  it.each([undefined, null, '', 'STATICS', 'electromagnetics'])('알 수 없는 과목 %j 는 UnknownSubjectError', (id) => {
    expect(() => buildSystemPrompt(id)).toThrow(UnknownSubjectError);
    expect(() => getSubject(id)).toThrow(UnknownSubjectError);
  });

  it('UnknownSubjectError는 코드 UNKNOWN_SUBJECT를 가진다', () => {
    try {
      getSubject('nope');
      expect.unreachable();
    } catch (error) {
      expect(error.code).toBe('UNKNOWN_SUBJECT');
    }
  });

  it.each(['', 'answer', 'HINT'])('알 수 없는 모드 %j 는 UnknownModeError', (mode) => {
    expect(() => buildSystemPrompt('statics', { mode })).toThrow(UnknownModeError);
  });
});
