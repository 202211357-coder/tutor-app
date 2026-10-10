import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import ProblemSolver from './components/ProblemSolver.jsx';
import TutorChat from './components/TutorChat.jsx';

const TUTOR_TAB = { id: 'tutor', label: '튜터에게 질문' };
const PRACTICE_TAB = { id: 'practice', label: '연습 문제' };

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [tab, setTab] = useState('practice');
  const [tutorEnabled, setTutorEnabled] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    // 설정을 못 불러오면 튜터 탭을 숨긴 채(채점만) 동작한다.
    api
      .fetchConfig()
      .then((config) => setTutorEnabled(Boolean(config.tutorEnabled)))
      .catch(() => setTutorEnabled(false));
  }, []);

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
  const tabs = tutorEnabled ? [PRACTICE_TAB, TUTOR_TAB] : [PRACTICE_TAB];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : PRACTICE_TAB.id;

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
        {tabs.map((t) => (
          <button key={t.id} className={activeTab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {!tutorEnabled && (
        <p className="notice">AI 튜터 질문은 서버에 ANTHROPIC_API_KEY를 설정하면 나타납니다. 지금은 연습 문제와 풀이를 이용할 수 있습니다.</p>
      )}

      <main>
        {subjectId && activeTab === 'practice' && <ProblemSolver key={subjectId} subjectId={subjectId} />}
        {subjectId && activeTab === 'tutor' && <TutorChat key={subjectId} subjectId={subjectId} />}
      </main>
    </div>
  );
}
