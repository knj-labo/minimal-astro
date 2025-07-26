import { vi } from 'vitest';

// Polyfill & spy for window.requestIdleCallback
globalThis.requestIdleCallback = vi.fn((cb: IdleRequestCallback, _opts?: IdleRequestOptions) => {
  // 0ms で callback を呼び出す簡易ポリフィル（タイムアウトを無視）
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  }, 0) as unknown as number;
}) as unknown as typeof requestIdleCallback;

globalThis.cancelIdleCallback = vi.fn((id: number) => clearTimeout(id));

// Also set on window object for module-level captures
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'requestIdleCallback', {
    value: globalThis.requestIdleCallback,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'cancelIdleCallback', {
    value: globalThis.cancelIdleCallback,
    writable: true,
    configurable: true,
  });
}
