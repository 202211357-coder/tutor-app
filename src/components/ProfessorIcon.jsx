/** 칠판 옆 교수님 흉상 (장식용 그림). 성인 비율, 재킷·셔츠·넥타이, 희끗한 옆머리, 얇은 사각 안경. */
export default function ProfessorIcon({ className = 'teacher-icon' }) {
  return (
    <svg className={className} viewBox="6 12 84 84" aria-hidden="true">
      <defs>
        <linearGradient id="prof-jacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5566" />
          <stop offset="1" stopColor="#363f4d" />
        </linearGradient>
        <linearGradient id="prof-skin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9bd98" />
          <stop offset="0.55" stopColor="#f1caa7" />
          <stop offset="1" stopColor="#dcae89" />
        </linearGradient>
      </defs>

      {/* 재킷 */}
      <path d="M10 96c1-17 9-26 22-29l16-3 16 3c13 3 21 12 22 29z" fill="url(#prof-jacket)" />
      {/* 셔츠 */}
      <path d="M37 66l11 18 11-18-11-3z" fill="#eef0f2" />
      {/* 넥타이 */}
      <path d="M45.6 68.5h4.8l-.8 3.2h-3.2z" fill="#5e2430" />
      <path d="M46.4 71.5h3.2l2.2 14.5-3.8 4.2-3.8-4.2z" fill="#7a2f3d" />
      <path d="M47 75l3.4 3M46.2 80l4.4 4" stroke="#8f4553" strokeWidth="0.9" />
      {/* 라펠 */}
      <path d="M36 65.5l12 19-7 11.5-9-25z" fill="#2f3743" />
      <path d="M60 65.5l-12 19 7 11.5 9-25z" fill="#2f3743" />
      <path d="M33 72l5 1.5M63 72l-5 1.5" stroke="#262d37" strokeWidth="0.8" />
      {/* 목 */}
      <path d="M41.5 51h13v10.5c-3.8 3-9.2 3-13 0z" fill="#d9a983" />
      {/* 셔츠 깃 */}
      <path d="M41.2 60.5l6.8 5.6-3.6 5.4-5.2-7.4z" fill="#f7f8f9" stroke="#cfd4da" strokeWidth="0.5" />
      <path d="M54.8 60.5l-6.8 5.6 3.6 5.4 5.2-7.4z" fill="#f7f8f9" stroke="#cfd4da" strokeWidth="0.5" />
      {/* 귀 */}
      <ellipse cx="34.6" cy="39.5" rx="2.6" ry="4" fill="#e3b28c" />
      <ellipse cx="61.4" cy="39.5" rx="2.6" ry="4" fill="#e3b28c" />
      {/* 얼굴 */}
      <path d="M35.5 36c0-10 5.5-15.5 12.5-15.5S60.5 26 60.5 36v5c0 9-6.2 15.5-12.5 15.5S35.5 50 35.5 41z" fill="url(#prof-skin)" />
      {/* 턱 그림자(면도 자국) */}
      <path d="M38.5 45c1.5 6.5 5.4 10 9.5 10s8-3.5 9.5-10c-2.5 3-6 4.5-9.5 4.5s-7-1.5-9.5-4.5z" fill="#8a7464" opacity="0.18" />
      {/* 머리카락: 짙은 윗머리 + 희끗한 옆머리 */}
      <path d="M35 37c-1-11 4.6-18.5 13-18.5 8.6 0 14 7 13 18.5-.9-5.6-2.4-9.2-5-11.3-2.3 1.5-5.4 2.2-8.6 2.2-3.6 0-6.8-.8-9-2.4-2.3 2-3.5 5.6-3.4 11.5z" fill="#4b4540" />
      <path d="M35 37c-.4-3.2-.2-6 .7-8.5 1 2.6 1.4 5.2 1.3 8.3zM61 37c.4-3.2.2-6-.7-8.5-1 2.6-1.4 5.2-1.3 8.3z" fill="#a8a29c" />
      <path d="M41 22.5c3.5-1.6 9.6-1.8 13.6.4" stroke="#6b645e" strokeWidth="0.8" fill="none" />
      {/* 눈썹 */}
      <path d="M39.6 33.4c2-1 4.4-1.1 6.2-.4M50.2 33c1.8-.7 4.2-.6 6.2.4" stroke="#4b4540" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* 눈 */}
      <ellipse cx="43" cy="37.4" rx="1.15" ry="0.9" fill="#2a2522" />
      <ellipse cx="53" cy="37.4" rx="1.15" ry="0.9" fill="#2a2522" />
      {/* 안경 (얇은 사각 테) */}
      <rect x="38.6" y="34.4" width="8.8" height="6" rx="1.6" fill="#ffffff" fillOpacity="0.12" stroke="#2b2b2b" strokeWidth="0.9" />
      <rect x="48.6" y="34.4" width="8.8" height="6" rx="1.6" fill="#ffffff" fillOpacity="0.12" stroke="#2b2b2b" strokeWidth="0.9" />
      <path d="M47.4 36.6c.4-.5 .8-.5 1.2 0M38.6 36.4l-3 -.8M57.4 36.4l3-.8" stroke="#2b2b2b" strokeWidth="1" fill="none" />
      {/* 코·입 */}
      <path d="M48.6 39.5l1 4.6c-.6.6-1.6.7-2.4.3" stroke="#c48f6c" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M44.6 48.2c2.2 1 4.6 1 6.8 0" stroke="#9b5f4c" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* 주머니 행커치프 */}
      <path d="M66 76l6-1.2.8 2.6-6.4 1z" fill="#c9cfd8" />
    </svg>
  );
}
