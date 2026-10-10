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
  const [hintCount, setHintCount] = useState(0);
  const [solution, setSolution] = useState(null);

  async function handleShowSolution() {
    setError('');
    try {
      setSolution(await api.fetchSolution(problem.id));
    } catch (err) {
      setError(err.message);
    }
  }

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

      {hintCount > 0 && (
        <ol className="hints">
          {problem.hints.slice(0, hintCount).map((hint, i) => (
            <li key={i}>
              <strong>힌트 {i + 1}</strong> {hint}
            </li>
          ))}
        </ol>
      )}
      <div className="study-actions">
        {hintCount < problem.hints.length && (
          <button type="button" onClick={() => setHintCount((n) => n + 1)}>
            힌트 보기 ({hintCount}/{problem.hints.length})
          </button>
        )}
        {/* 먼저 풀어 보도록, 한 번 이상 채점한 뒤에만 풀이를 열 수 있다. */}
        {!solution && (
          <button type="button" onClick={handleShowSolution} disabled={!result} title={result ? '' : '먼저 채점해 보세요'}>
            풀이 보기
          </button>
        )}
      </div>

      {solution && (
        <div className="solution">
          <h4>풀이</h4>
          <ol>
            {solution.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <p className="answers">
            정답: {solution.answers.map((a) => `${a.label} ${a.value} ${a.unit}`.trim()).join(' / ')}
          </p>
        </div>
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
