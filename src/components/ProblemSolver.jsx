import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { getProblems, peekProblems } from '../lib/problemCache.js';
import { penMark, teacherComment } from '../lib/teacher.js';
import { fetchDifferentVariant } from '../lib/variants.js';

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
 * 문제 한 장.
 * 수치를 바꿔도 카드를 새로 만들지 않는다: 새 수치를 받는 동안 기존 내용을 흐리게 유지하고,
 * 도착하면 본문만 교체(페이드)해 카드 높이가 출렁이지 않게 한다.
 * renumber / resetToken이 바뀌면 목록 전체 명령(전체 수치 변경 / 기본 수치로)을 따른다.
 */
function ProblemCard({ number, baseProblem, renumber, resetToken, bestPercent, onGraded, onSeedChange }) {
  const [problem, setProblem] = useState(baseProblem);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [solution, setSolution] = useState(null);
  const problemRef = useRef(baseProblem);
  const requestId = useRef(0);

  function show(next) {
    problemRef.current = next;
    setProblem(next);
    setAnswers({});
    setResult(null);
    setHintCount(0);
    setSolution(null);
    setError('');
    setVersion((v) => v + 1);
    onSeedChange(baseProblem.id, next.seed ?? 0);
  }

  async function loadNewNumbers() {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const next = await fetchDifferentVariant(api.fetchProblemVariant, problemRef.current);
      if (id === requestId.current) show(next);
    } catch (err) {
      if (id === requestId.current) setError(`새 문제를 불러오지 못했습니다: ${err.message}`);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  // 목록의 "전체 문제 수치 변경": 그때 보이던 문제만 대상 (처음 렌더링 때는 실행하지 않음)
  useEffect(() => {
    if (renumber.n > 0 && renumber.ids.includes(baseProblem.id)) loadNewNumbers();
  }, [renumber]);

  // 목록의 "기본 수치로"
  useEffect(() => {
    if (resetToken > 0 && (problemRef.current.seed ?? 0) !== 0) {
      requestId.current += 1; // 진행 중인 요청이 있으면 무시
      setLoading(false);
      show(baseProblem);
    }
  }, [resetToken]);

  async function handleShowSolution() {
    setError('');
    try {
      setSolution(await api.fetchSolution(baseProblem.id, problemRef.current.seed ?? 0));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGrade(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      setResult(await api.gradeAnswers(baseProblem.id, answers, problemRef.current.seed ?? 0));
      onGraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const partResult = (label) => result?.parts.find((p) => p.label === label);
  const isVariant = (problem.seed ?? 0) !== 0;

  return (
    <article className="sheet" aria-busy={loading}>
      <header className="sheet-head">
        <span className="sheet-number">Q{number}</span>
        <h3>{baseProblem.title}</h3>
        <div className="chips">
          {baseProblem.topic && <span className="topic-chip">{baseProblem.topic}</span>}
          {isVariant && <span className="variant-chip">수치 변경됨</span>}
          {bestPercent !== undefined && (
            <span className={bestPercent >= 100 ? 'best-badge done' : 'best-badge'}>최고 {bestPercent}점</span>
          )}
        </div>
        <button type="button" className="ghost-button" onClick={loadNewNumbers} disabled={pending || loading}>
          {loading ? '불러오는 중…' : '새 수치로 풀기'}
        </button>
      </header>

      <div key={version} className={loading ? 'sheet-body fade-in is-loading' : 'sheet-body fade-in'}>
        <p className="statement">{problem.statement}</p>
        <form onSubmit={handleGrade}>
          {problem.parts.map((part) => {
            const r = partResult(part.label);
            const mark = r && penMark(r.status);
            return (
              <div key={part.label} className={`part ${r ? `graded ${r.status}` : ''}`}>
                {mark && (
                  <span className={`pen-mark pop-in ${mark.kind}`} role="img" aria-label={mark.label}>
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
                    disabled={loading}
                  />
                </label>
                {r && (
                  <p className="pen-comment fade-in">
                    {STATUS_LABEL[r.status] ?? r.status} · {r.earned}/{r.max}점 — {r.feedback}
                  </p>
                )}
              </div>
            );
          })}
          {error && <p className="error">{error}</p>}
          <div className="sheet-actions">
            <button type="submit" className="primary-button" disabled={pending || loading}>
              {pending ? '채점 중…' : '채점'}
            </button>
            {hintCount < problem.hints.length && (
              <button type="button" className="ghost-button" onClick={() => setHintCount((n) => n + 1)}>
                힌트 ({hintCount}/{problem.hints.length})
              </button>
            )}
            {/* 먼저 풀어 보도록, 한 번 이상 채점한 뒤에만 풀이를 열 수 있다. */}
            {!solution && (
              <button
                type="button"
                className="ghost-button"
                onClick={handleShowSolution}
                disabled={!result}
                title={result ? '' : '먼저 채점해 보세요'}
              >
                풀이 보기
              </button>
            )}
          </div>
        </form>

        {result && (
          <div className="score-row fade-in">
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
              <li key={i} className="fade-in">
                <strong>힌트 {i + 1}</strong> {hint}
              </li>
            ))}
          </ol>
        )}

        {solution && (
          <div className="mini-board fade-in">
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
      </div>
    </article>
  );
}

/**
 * 한 과목의 문제 목록. App이 과목별로 한 번만 만들고 숨김/표시만 바꾸므로,
 * 과목을 오가도 입력·채점 결과·바꾼 수치가 유지된다.
 * @param {{subjectId: string, active: boolean}} props
 */
export default function ProblemSolver({ subjectId, active }) {
  const [problems, setProblems] = useState(() => peekProblems(subjectId));
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [bestByProblem, setBestByProblem] = useState({});
  const [renumber, setRenumber] = useState({ n: 0, ids: [] });
  const [resetToken, setResetToken] = useState(0);
  const [variantIds, setVariantIds] = useState([]);

  function handleSeedChange(id, seed) {
    setVariantIds((ids) => (seed === 0 ? ids.filter((x) => x !== id) : ids.includes(id) ? ids : [...ids, id]));
  }

  function refreshBest() {
    // 기록을 못 불러와도 문제 풀이에는 지장이 없으므로 배지만 생략한다.
    api
      .fetchHistory()
      .then((summary) => setBestByProblem(summary.bestByProblem ?? {}))
      .catch(() => {});
  }

  useEffect(() => {
    getProblems(subjectId)
      .then(setProblems)
      .catch((err) => setError(err.message));
  }, [subjectId]);

  // 다른 과목·탭에서 채점했을 수 있으므로, 화면에 다시 보일 때마다 최고 점수만 조용히 갱신한다.
  useEffect(() => {
    if (active) refreshBest();
  }, [active]);

  if (error) return <p className="error">문제를 불러오지 못했습니다: {error}</p>;
  if (!problems) return <div className="sheet skeleton" aria-label="문제를 불러오는 중" />;
  if (!problems.length) return <p>이 과목에는 아직 연습 문제가 없습니다.</p>;

  const topics = [...new Set(problems.map((p) => p.topic).filter(Boolean))];
  const visible = topic ? problems.filter((p) => p.topic === topic) : problems;

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
        <button type="button" className="ghost-button" onClick={() => setRenumber((r) => ({ n: r.n + 1, ids: visible.map((p) => p.id) }))}>
          전체 문제 수치 변경
        </button>
        {variantIds.length > 0 && (
          <button type="button" className="link" onClick={() => setResetToken((t) => t + 1)}>
            기본 수치로
          </button>
        )}
      </div>
      {/* 주제 필터로 가린 문제도 지우지 않고 숨겨서, 입력·변경한 수치가 유지되게 한다. */}
      {problems.map((p) => (
        <div key={p.id} hidden={!visible.includes(p)}>
          <ProblemCard
            number={visible.indexOf(p) + 1}
            baseProblem={p}
            renumber={renumber}
            resetToken={resetToken}
            bestPercent={bestByProblem[p.id]}
            onGraded={refreshBest}
            onSeedChange={handleSeedChange}
          />
        </div>
      ))}
    </section>
  );
}
