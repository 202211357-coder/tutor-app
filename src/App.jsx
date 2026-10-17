import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import { prefetchProblems } from './lib/problemCache.js';
import { tipOfTheDay } from './lib/teacher.js';
import HistoryView from './components/HistoryView.jsx';
import ProfessorIcon from './components/ProfessorIcon.jsx';
import ProblemSolver from './components/ProblemSolver.jsx';
import TutorChat from './components/TutorChat.jsx';

const TUTOR_TAB = { id: 'tutor', label: '튜터에게 질문' };
const PRACTICE_TAB = { id: 'practice', label: '연습 문제' };
const HISTORY_TAB = { id: 'history', label: '학습 현황' };

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
        prefetchProblems(list.map((s) => s.id));
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const subject = subjects.find((s) => s.id === subjectId);
  const tabs = tutorEnabled ? [PRACTICE_TAB, HISTORY_TAB, TUTOR_TAB] : [PRACTICE_TAB, HISTORY_TAB];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : PRACTICE_TAB.id;

  // 한 번 연 과목·탭 화면은 지우지 않고 숨겨 둔다. 다시 열 때 다시 불러오거나 깜빡이지 않고,
  // 입력하던 답·바꾼 수치·대화 내용도 그대로 남는다.
  const [visitedSubjects, setVisitedSubjects] = useState([]);
  const [visitedTabs, setVisitedTabs] = useState([]);
  useEffect(() => {
    if (subjectId) setVisitedSubjects((list) => (list.includes(subjectId) ? list : [...list, subjectId]));
  }, [subjectId]);
  useEffect(() => {
    setVisitedTabs((list) => (list.includes(activeTab) ? list : [...list, activeTab]));
  }, [activeTab]);
  const showing = (tabId, id) => activeTab === tabId && (id === undefined || id === subjectId);
  // 방금 연 과목·탭은 effect를 기다리지 않고 바로 포함해 한 프레임 빈 화면이 생기지 않게 한다.
  const subjectViews = !subjectId || visitedSubjects.includes(subjectId) ? visitedSubjects : [...visitedSubjects, subjectId];
  const tabViews = visitedTabs.includes(activeTab) ? visitedTabs : [...visitedTabs, activeTab];

  return (
    <div className="classroom">
      <header className="chalkboard">
        <div className="board-top">
          <div className="board-title">
            <p className="course-code">Mechanical Engineering · Problem Sets</p>
            <h1>기계공학 튜터</h1>
          </div>
          <div className="teacher">
            <p className="speech">
              <strong>오늘의 강의 노트</strong>
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
        {/* 탭을 바꿔도 칠판 높이가 변하지 않도록 설명 줄은 항상 표시한다. */}
        <p className="board-desc">
          {activeTab === 'history'
            ? '전체 과목 · 진도와 최근 채점 기록'
            : subject
              ? `주요 내용 · ${subject.description}`
              : '\u00a0'}
        </p>
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
            AI 질문 기능은 서버에 ANTHROPIC_API_KEY를 설정하면 활성화됩니다. 현재는 연습 문제, 힌트, 풀이, 학습 현황을 이용할 수 있습니다.
          </p>
        )}
        {subjectViews.map((id) => (
          <div key={`practice:${id}`} className="view" hidden={!showing('practice', id)}>
            <ProblemSolver subjectId={id} active={showing('practice', id)} />
          </div>
        ))}
        {tabViews.includes('history') && (
          <div className="view" hidden={!showing('history')}>
            <HistoryView
              active={showing('history')}
              onOpenSubject={(id) => {
                setSubjectId(id);
                setTab(PRACTICE_TAB.id);
              }}
            />
          </div>
        )}
        {tutorEnabled &&
          tabViews.includes('tutor') &&
          subjectViews.map((id) => (
            <div key={`tutor:${id}`} className="view" hidden={!showing('tutor', id)}>
              <TutorChat subjectId={id} />
            </div>
          ))}
      </main>
    </div>
  );
}
