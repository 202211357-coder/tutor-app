import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { penMark, randomSeed, teacherComment } from '../lib/teacher.js';

const STATUS_LABEL = {
  correct: '정답',
  close: '근사값 (부분 점수)',
  missing_unit: '단위 누락 (부분 점수)',
  wrong: '오답',
  empty: '미입력',
  invalid: '형식 오류',
  unknown_unit: '단위 인식 불가',
  unit_mismatch: '단위 차원 불일치',
};

/**
 * 문제 한 장. seed가 0이면 목록의 기본 문제를, 아니면 서버에서 숫자를 바꾼 문제를 받아 보여 준다.
 * key에 seed가 들어가므로 seed가 바뀌면 입력·채점·힌트 상태가 모두 새로 시작된다.
 */
function ProblemCard({ number, baseProblem, seed, bestPercent, onGraded, onNewNumbers }) {
  const [problem, setProblem] = useState(seed === 0 ? baseProblem : null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [solution, setSolution] = useState(null);

  useEffect(() => {
    if (seed === 0) return;
    api
      .fetchProblemVariant(baseProblem.id, seed)
      .then(setProblem)
      .catch((err) => setError(err.message));
  }, [baseProblem.id, seed]);

  async function handleShowSolution() {
    setError('');
    try {
      setSolution(await api.fetchSolution(baseProblem.id, seed));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrade(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      setResult(await api.gradeAnswers(baseProblem.id, answers, seed));
      onGraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const partResult = (label) => result?.parts.find((p) => p.label === label);

  return (
    <article className="sheet">
      <header className="sheet-head">
        <span className="sheet-number">문제 {number}</span>
        <h3>{baseProblem.title}</h3>
        <div className="chips">
          {baseProblem.topic && <span className="topic-chip">{baseProblem.topic}</span>}
          {seed !== 0 && <span className="variant-chip">숫자 바뀜</span>}
          {bestPercent !== undefined && (
            <span className={bestPercent >= 100 ? 'best-badge done' : 'best-badge'}>최고 {bestPercent}점</span>
          )}
        </div>
        <button type="button" className="ghost-button" onClick={onNewNumbers} disabled={pending}>
          🔄 숫자 바꾸기
        </button>
      </header>

      {!problem ? (
        <p className="sheet-loading">{error ? `새 문제를 불러오지 못했습니다: ${error}` : '선생님이 새 숫자로 문제를 쓰는 중…'}</p>
      ) : (
        <>
          <p className="statement">{problem.statement}</p>
          <form onSubmit={handleGrade}>
            {problem.parts.map((part) => {
              const r = partResult(part.label);
              const mark = r && penMark(r.status);
              return (
                <div key={part.label} className={`part ${r ? `graded ${r.status}` : ''}`}>
                  {mark && (
                    <span className={`pen-mark ${mark.kind}`} role="img" aria-label={mark.label}>
                      {mark.symbol}
                    </span>
                  )}
                  <label>
                    <span className="part-prompt">
                      {part.label} {part.prompt} <span className="points">[{part.points}점]</span>
                    </span>
                    <input
                      value={answers[part.label] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [part.label]: e.target.value }))}
                      placeholder="값과 단위 (예: 12.5 kN)"
                      autoComplete="off"
                    />
                  </label>
                  {r && (
                    <p className="pen-comment">
                      {STATUS_LABEL[r.status] ?? r.status} · {r.earned}/{r.max}점 — {r.feedback}
                    </p>
                  )}
                </div>
              );
            })}
            {error && <p className="error">{error}</p>}
            <div className="sheet-actions">
              <button type="submit" className="primary-button" disabled={pending}>
                {pending ? '채점 중…' : '✍️ 채점받기'}
              </button>
              {hintCount < problem.hints.length && (
                <button type="button" className="ghost-button" onClick={() => setHintCount((n) => n + 1)}>
                  💡 힌트 ({hintCount}/{problem.hints.length})
                </button>
              )}
              {/* 먼저 풀어 보도록, 한 번 이상 채점한 뒤에만 풀이를 열 수 있다. */}
              {!solution && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleShowSolution}
                  disabled={!result}
                  title={result ? '' : '먼저 채점받아 보세요'}
                >
                  📖 풀이 보기
                </button>
              )}
            </div>
          </form>

          {result && (
            <div className="score-row">
              <span className={`score-stamp ${result.percent >= 100 ? 'perfect' : ''}`}>
                {result.earned}
                <small>/{result.max}</small>
              </span>
              <p className="teacher-note">{teacherComment(result.percent)}</p>
            </div>
          )}

          {hintCount > 0 && (
            <ol className="postit">
              {problem.hints.slice(0, hintCount).map((hint, i) => (
                <li key={i}>
                  <strong>힌트 {i + 1}</strong> {hint}
                </li>
              ))}
            </ol>
          )}

          {solution && (
            <div className="mini-board">
              <h4>풀이</h4>
              <ol>
                {solution.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <p className="answers">
                정답: {solution.answers.map((a) => `${a.label} ${a.display ?? a.value} ${a.unit}`.trim()).join('  /  ')}
              </p>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default function ProblemSolver({ subjectId }) {
  const [problems, setProblems] = useState(null);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [bestByProblem, setBestByProblem] = useState({});
  const [seeds, setSeeds] = useState({});

  function refreshBest() {
    // 기록을 못 불러와도 문제 풀이에는 지장이 없으므로 배지만 생략한다.
    api
      .fetchHistory()
      .then((summary) => setBestByProblem(summary.bestByProblem ?? {}))
      .catch(() => {});
  }

  useEffect(() => {
    api
      .fetchProblems(subjectId)
      .then(setProblems)
      .catch((err) => setError(err.message));
    refreshBest();
  }, [subjectId]);

  if (error) return <p className="error">문제를 불러오지 못했습니다: {error}</p>;
  if (!problems) return <p className="sheet-loading">문제지를 나눠 주는 중…</p>;
  if (!problems.length) return <p>이 과목에는 아직 연습 문제가 없습니다.</p>;

  const topics = [...new Set(problems.map((p) => p.topic).filter(Boolean))];
  const visible = topic ? problems.filter((p) => p.topic === topic) : problems;

  function renumber(ids) {
    setSeeds((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, randomSeed()])) }));
  }

  return (
    <section className="problem-list">
      <div className="toolbar">
        {topics.length > 1 && (
          <label className="topic-filter">
            주제
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">전체 ({problems.length})</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t} ({problems.filter((p) => p.topic === t).length})
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="ghost-button" onClick={() => renumber(visible.map((p) => p.id))}>
          🔄 전체 새 문제 (숫자 바꾸기)
        </button>
        {Object.values(seeds).some(Boolean) && (
          <button type="button" className="link" onClick={() => setSeeds({})}>
            처음 숫자로
          </button>
        )}
      </div>
      {visible.map((p, i) => {
        const seed = seeds[p.id] ?? 0;
        return (
          <ProblemCard
            key={`${p.id}:${seed}`}
            number={i + 1}
            baseProblem={p}
            seed={seed}
            bestPercent={bestByProblem[p.id]}
            onGraded={refreshBest}
            onNewNumbers={() => renumber([p.id])}
          />
        );
      })}
    </section>
  );
}
