import { describe, expect, it } from 'vitest';
import { RECENT_LIMIT, summarizeHistory } from './historySummary.js';

const subjects = [
  { id: 'statics', name: '정역학' },
  { id: 'dynamics', name: '기계동역학' },
];
const problems = [
  { id: 's1', subjectId: 'statics', title: '보', topic: '보의 반력' },
  { id: 's2', subjectId: 'statics', title: '트러스', topic: '트러스' },
  { id: 's3', subjectId: 'statics', title: '마찰', topic: '마찰' },
  { id: 'd1', subjectId: 'dynamics', title: '진동', topic: '진동' },
];

let minute = 0;
const a = (problemId, percent) => {
  minute += 1;
  const subjectId = problems.find((p) => p.id === problemId)?.subjectId ?? 'statics';
  return { problemId, subjectId, earned: percent / 10, max: 10, percent, at: `2026-10-17T09:${String(minute).padStart(2, '0')}:00Z` };
};

describe('summarizeHistory', () => {
  it('기록이 없으면 모든 과목이 0이고 평균은 null', () => {
    const s = summarizeHistory([], problems, subjects);
    expect(s.totalAttempts).toBe(0);
    expect(s.bySubject).toEqual([
      { subjectId: 'statics', name: '정역학', total: 3, tried: 0, solved: 0, averageBest: null },
      { subjectId: 'dynamics', name: '기계동역학', total: 1, tried: 0, solved: 0, averageBest: null },
    ]);
    expect(s.toReview).toEqual([]);
    expect(s.recent).toEqual([]);
  });

  it('문제별 최고 점수로 진도를 계산한다 (마지막 점수가 낮아도 최고 점수 유지)', () => {
    const s = summarizeHistory([a('s1', 100), a('s1', 40), a('s2', 50), a('s2', 80)], problems, subjects);
    expect(s.bySubject[0]).toMatchObject({ total: 3, tried: 2, solved: 1, averageBest: 90 });
    expect(s.bestByProblem).toEqual({ s1: 100, s2: 80 });
  });

  it('다시 풀어 볼 문제: 만점이 아닌 문제만, 최고 점수가 낮은 순', () => {
    const s = summarizeHistory([a('s1', 100), a('s2', 80), a('s3', 30), a('d1', 55)], problems, subjects);
    expect(s.toReview.map((r) => [r.problemId, r.bestPercent])).toEqual([
      ['s3', 30],
      ['d1', 55],
      ['s2', 80],
    ]);
    expect(s.toReview[0]).toMatchObject({ title: '마찰', topic: '마찰', attempts: 1, subjectId: 'statics' });
  });

  it('나중에 만점을 받으면 다시 풀어 볼 목록에서 빠진다', () => {
    const s = summarizeHistory([a('s2', 50), a('s2', 100)], problems, subjects);
    expect(s.toReview).toEqual([]);
  });

  it('최근 채점은 최신순으로 최대 RECENT_LIMIT개', () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) => a('s1', i));
    const s = summarizeHistory(many, problems, subjects);
    expect(s.recent).toHaveLength(RECENT_LIMIT);
    expect(s.recent[0].percent).toBe(RECENT_LIMIT + 4);
    expect(s.totalAttempts).toBe(RECENT_LIMIT + 5);
  });

  it('지금은 없는 문제의 기록은 진도에서 빼고, 최근 목록에는 표시만 한다', () => {
    const s = summarizeHistory([a('removed', 20), a('s1', 100)], problems, subjects);
    expect(s.bySubject[0].tried).toBe(1);
    expect(s.toReview).toEqual([]);
    expect(s.recent.map((r) => r.title)).toEqual(['보', '(삭제된 문제)']);
  });
});
