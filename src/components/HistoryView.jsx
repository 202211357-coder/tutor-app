import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

function formatTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * 학습 기록: 과목별 진도, 다시 풀어 볼 문제, 최근 채점.
 * @param {{active?: boolean, onOpenSubject: (subjectId: string) => void}} props
 */
export default function HistoryView({ active = true, onOpenSubject }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  function load() {
    setError('');
    api
      .fetchHistory()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }

  // 탭이 보일 때마다 새로 집계하되, 받는 동안에는 이전 내용을 그대로 보여 준다(깜빡임 방지).
  useEffect(() => {
    if (active) load();
  }, [active]);

  async function handleClear() {
    if (!window.confirm('모든 학습 기록을 지울까요? 되돌릴 수 없습니다.')) return;
    try {
      await api.clearHistory();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">학습 기록을 불러오지 못했습니다: {error}</p>;
  if (!summary) return <div className="report-card skeleton" aria-label="학습 현황을 불러오는 중" />;
  if (summary.totalAttempts === 0) {
    return (
      <section className="history report-card">
        <h2 className="report-title">학습 현황</h2>
        <p>아직 기록이 없습니다. 연습 문제를 채점하면 자동으로 기록됩니다.</p>
      </section>
    );
  }

  return (
    <section className="history report-card">
      <h2 className="report-title">학습 현황</h2>
      <h3>과목별 진도</h3>
      <table className="progress-table">
        <thead>
          <tr>
            <th>과목</th>
            <th>만점 / 전체</th>
            <th>시도한 문제</th>
            <th>평균 최고 점수</th>
          </tr>
        </thead>
        <tbody>
          {summary.bySubject.map((s) => (
            <tr key={s.subjectId}>
              <td>
                <button type="button" className="link" onClick={() => onOpenSubject(s.subjectId)}>
                  {s.name}
                </button>
              </td>
              <td>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${s.total ? (s.solved / s.total) * 100 : 0}%` }} />
                </span>
                {s.solved} / {s.total}
              </td>
              <td>{s.tried}</td>
              <td>{s.averageBest === null ? '–' : `${s.averageBest}점`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>다시 풀어 볼 문제</h3>
      {summary.toReview.length === 0 ? (
        <p className="teacher-note">시도한 문제를 모두 만점으로 통과했습니다.</p>
      ) : (
        <ul className="review-list">
          {summary.toReview.map((r) => (
            <li key={r.problemId}>
              <button type="button" className="link" onClick={() => onOpenSubject(r.subjectId)}>
                {r.title}
              </button>
              {r.topic && <span className="topic-chip">{r.topic}</span>}
              <span className="muted">
                최고 {r.bestPercent}점 · {r.attempts}회 시도
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>최근 채점</h3>
      <ul className="recent-list">
        {summary.recent.map((r, i) => (
          <li key={`${r.at}-${i}`}>
            <span className="muted">{formatTime(r.at)}</span> {r.title} —{' '}
            <strong>
              {r.earned}/{r.max}점 ({r.percent}%)
            </strong>
          </li>
        ))}
      </ul>

      <div className="study-actions">
        <button type="button" className="ghost-button" onClick={handleClear}>
          기록 전체 삭제
        </button>
      </div>
    </section>
  );
}
