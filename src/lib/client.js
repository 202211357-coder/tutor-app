import { createApi } from './api.js';
import { createLocalApi } from './localApi.js';

// 화면 코드가 쓰는 API. GitHub Pages 빌드(--mode pages)에는 서버가 없으므로 브라우저 안에서 채점·기록한다.
// MODE는 빌드할 때 상수로 바뀌므로, 각 빌드에는 쓰는 쪽 코드만 남는다.
export const api = import.meta.env.MODE === 'pages' ? createLocalApi() : createApi();
