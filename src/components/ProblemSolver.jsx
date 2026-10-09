import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const STATUS_LABEL = {
  correct: '정답',
  close: '근사 (부분 점수)',
  missing_unit: '단위 누락 (부분 점수)',
  wrong: '오답',
  empty: '미입력',
  invalid: '형식 오류',
  unknown_unit: '단위 인식 불가',
  unit_mismatch: '단위 차원 불일치',
};

function ProblemCard({ problem }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleGrade(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      setResult(await api.gradeAnswers(problem.id, answers));
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const partResult = (label) => result?.parts.find((p) => p.label === label);

  return (
    <article className="problem">
      <h3>{problem.title}</h3>
      <p>{problem.statement}</p>
      <form onSubmit={handleGrade}>
        {problem.parts.map((part) => {
          const r = partResult(part.label);
          return (
            <div key={part.label} className="part">
              <label>
                {part.label} {part.prompt} <span className="points">[{part.points}점]</span>
                <input
                  value={answers[part.label] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [part.label]: e.target.value }))}
                  placeholder="값과 단위 (예: 12.5 kN)"
                />
              </label>
              {r && (
                <p className={`grade ${r.status}`}>
                  {STATUS_LABEL[r.status] ?? r.status} · {r.earned}/{r.max}점 — {r.feedback}
                </p>
              )}
            </div>
          );
        })}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? '채점 중…' : '채점하기'}
        </button>
      </form>
      {result && (
        <p className="total">
          합계 {result.earned} / {result.max}점 ({result.percent}%)
        </p>
      )}
    </article>
  );
}

export default function ProblemSolver({ subjectId }) {
  const [problems, setProblems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .fetchProblems(subjectId)
      .then(setProblems)
      .catch((err) => setError(err.message));
  }, [subjectId]);

  if (error) return <p className="error">문제를 불러오지 못했습니다: {error}</p>;
  if (!problems) return <p>불러오는 중…</p>;
  if (!problems.length) return <p>이 과목에는 아직 연습 문제가 없습니다.</p>;
  return (
    <section className="problem-list">
      {problems.map((p) => (
        <ProblemCard key={p.id} problem={p} />
      ))}
    </section>
  );
}
