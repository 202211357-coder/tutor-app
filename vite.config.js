import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
});
