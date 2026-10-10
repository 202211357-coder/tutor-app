import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { browserCommand, openBrowser } from './openBrowser.js';

const URL = 'http://localhost:3001';

function fakeChild() {
  const child = new EventEmitter();
  child.unref = vi.fn();
  return child;
}

describe('browserCommand', () => {
  it.each([
    ['win32', 'cmd', ['/c', 'start', '', URL]],
    ['darwin', 'open', [URL]],
    ['linux', 'xdg-open', [URL]],
  ])('%s → %s', (platform, command, args) => {
    expect(browserCommand(URL, platform)).toEqual([command, args]);
  });
});

describe('openBrowser', () => {
  it('명령을 분리 실행하고 서버 프로세스와 묶지 않는다(unref)', () => {
    const child = fakeChild();
    const spawnImpl = vi.fn(() => child);
    openBrowser(URL, { platform: 'win32', spawnImpl, log: vi.fn() });
    expect(spawnImpl).toHaveBeenCalledWith('cmd', ['/c', 'start', '', URL], { stdio: 'ignore', detached: true });
    expect(child.unref).toHaveBeenCalled();
  });

  it('브라우저 실행 오류(error 이벤트) 시 안내만 출력한다', () => {
    const child = fakeChild();
    const log = vi.fn();
    openBrowser(URL, { platform: 'linux', spawnImpl: () => child, log });
    child.emit('error', new Error('ENOENT'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining(URL));
  });

  it('spawn 자체가 예외를 던져도 서버를 멈추지 않는다', () => {
    const log = vi.fn();
    expect(() =>
      openBrowser(URL, {
        spawnImpl: () => {
          throw new Error('boom');
        },
        log,
      }),
    ).not.toThrow();
    expect(log).toHaveBeenCalledOnce();
  });
});
