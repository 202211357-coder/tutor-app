import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `vite build --mode pages`: GitHub Pages(웹 버전)용 빌드. 사이트가 https://<계정>.github.io/tutor-app/ 아래에 있으므로
// 자원 경로의 기준을 저장소 이름으로 바꾸고, API는 브라우저 안에서 처리한다(src/lib/client.js).
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/tutor-app/' : '/',
  plugins: [react()],
  server: {
    // 개발 모드: 프론트(5173)에서 /api 요청을 Express 서버(3001)로 넘긴다.
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**'],
  },
}));
