import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import ProblemSolver from './components/ProblemSolver.jsx';
import TutorChat from './components/TutorChat.jsx';

const TABS = [
  { id: 'tutor', label: '튜터에게 질문' },
  { id: 'practice', label: '연습 문제' },
];

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [tab, setTab] = useState('tutor');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api
      .fetchSubjects()
      .then((list) => {
        setSubjects(list);
        setSubjectId((current) => current || list[0]?.id || '');
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const subject = subjects.find((s) => s.id === subjectId);

  return (
    <div className="app">
      <header className="app-header">
        <h1>기계공학 AI 튜터</h1>
        <label className="subject-picker">
          과목
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!subjects.length}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {loadError && <p className="error">과목 목록을 불러오지 못했습니다: {loadError}</p>}
      {subject && <p className="subject-desc">{subject.description}</p>}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {subjectId && tab === 'tutor' && <TutorChat key={subjectId} subjectId={subjectId} />}
        {subjectId && tab === 'practice' && <ProblemSolver key={subjectId} subjectId={subjectId} />}
      </main>
    </div>
  );
}
