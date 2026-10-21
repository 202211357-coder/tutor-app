import { spawn } from 'node:child_process';

/** 운영체제별 "기본 브라우저로 URL 열기" 명령 */
export function browserCommand(url, platform = process.platform) {
  // Windows: start의 첫 인자는 창 제목이므로 빈 문자열을 넘긴다 (Node가 ""로 인용).
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', url]];
  if (platform === 'darwin') return ['open', [url]];
  return ['xdg-open', [url]];
}

/**
 * 기본 브라우저로 URL을 연다. 실패해도 서버는 계속 동작하고 안내만 출력한다.
 * @param {string} url
 * @param {{platform?: string, spawnImpl?: typeof spawn, log?: (msg: string) => void}} [options]
 */
export function openBrowser(url, { platform = process.platform, spawnImpl = spawn, log = console.log } = {}) {
  const [command, args] = browserCommand(url, platform);
  const fail = () => log(`[tutor-app] 브라우저를 자동으로 열지 못했습니다. ${url} 을 직접 여세요.`);
  try {
    const child = spawnImpl(command, args, { stdio: 'ignore', detached: true });
    child.on('error', fail);
    child.unref();
  } catch {
    fail();
  }
}
