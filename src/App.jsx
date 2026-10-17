import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import { tipOfTheDay } from './lib/teacher.js';
import HistoryView from './components/HistoryView.jsx';
import ProfessorIcon from './components/ProfessorIcon.jsx';
import ProblemSolver from './components/ProblemSolver.jsx';
import TutorChat from './components/TutorChat.jsx';

const TUTOR_TAB = { id: 'tutor', label: '선생님께 질문' };
const PRACTICE_TAB = { id: 'practice', label: '연습 문제' };
const HISTORY_TAB = { id: 'history', label: '성적표' };

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
  const tabs = tutorEnabled ? [PRACTICE_TAB, HISTORY_TAB, TUTOR_TAB] : [PRACTICE_TAB, HISTORY_TAB];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : PRACTICE_TAB.id;

  return (
    <div className="classroom">
      <header className="chalkboard">
        <div className="board-top">
          <h1>
            기계공학 <span>튜터 교실</span>
          </h1>
          <div className="teacher">
            <p className="speech">
              <strong>오늘의 한마디</strong>
              {tipOfTheDay()}
            </p>
            <ProfessorIcon />
          </div>
        </div>

        <nav className="subjects" aria-label="과목">
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === subjectId ? 'chalk-button active' : 'chalk-button'}
              aria-pressed={s.id === subjectId}
              onClick={() => setSubjectId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </nav>
        {subject && activeTab !== 'history' && <p className="board-desc">오늘 배울 내용 · {subject.description}</p>}
        <div className="chalk-tray" aria-hidden="true" />
      </header>

      {loadError && <p className="error">과목 목록을 불러오지 못했습니다: {loadError}</p>}

      <nav className="notebook-tabs" aria-label="메뉴">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={activeTab === t.id ? 'tab active' : 'tab'}
            aria-current={activeTab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="desk">
        {!tutorEnabled && activeTab === 'practice' && (
          <p className="notice">
            AI 질문 기능은 서버에 ANTHROPIC_API_KEY를 설정하면 나타납니다. 지금은 연습 문제·힌트·풀이·성적표를 쓸 수 있어요.
          </p>
        )}
        {subjectId && activeTab === 'practice' && <ProblemSolver key={subjectId} subjectId={subjectId} />}
        {activeTab === 'history' && (
          <HistoryView
            onOpenSubject={(id) => {
              setSubjectId(id);
              setTab(PRACTICE_TAB.id);
            }}
          />
        )}
        {subjectId && activeTab === 'tutor' && <TutorChat key={subjectId} subjectId={subjectId} />}
      </main>
    </div>
  );
}
