import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openNotificationStream } from '@/services/notification-stream';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }
}

describe('cliente SSE de notificações', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reconecta com backoff após erro e evita conexão duplicada', async () => {
    const onMessage = vi.fn();
    const close = openNotificationStream(onMessage);
    const first = FakeEventSource.instances[0];

    first.onerror?.();
    expect(FakeEventSource.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeEventSource.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeEventSource.instances).toHaveLength(2);

    FakeEventSource.instances[1].onmessage?.(
      new MessageEvent('message', { data: JSON.stringify({ type: 'notification' }) }),
    );
    expect(onMessage).toHaveBeenCalledWith({ type: 'notification' });

    close();
    expect(FakeEventSource.instances[1].close).toHaveBeenCalledTimes(1);
  });

  it('fecha a conexão anterior ao abrir uma nova', () => {
    const firstClose = openNotificationStream(vi.fn());
    const first = FakeEventSource.instances[0];
    openNotificationStream(vi.fn());

    expect(first.close).toHaveBeenCalledTimes(1);
    firstClose();
  });
});
