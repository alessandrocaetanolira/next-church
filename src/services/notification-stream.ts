'use client';

export type NotificationStreamPayload = {
  type: string;
  notification?: unknown;
  role?: string;
  permissions?: string[];
};

type StreamHandler = (payload: NotificationStreamPayload) => void;

let activeClose: (() => void) | null = null;

/** Abre o SSE autenticado com backoff controlado e uma única conexão por janela. */
export function openNotificationStream(onMessage: StreamHandler) {
  activeClose?.();

  let source: EventSource | null = null;
  let retryTimer: number | undefined;
  let retryMs = 1_000;
  let closed = false;

  const connect = () => {
    if (closed) return;
    source = new EventSource('/api/events');
    source.onopen = () => { retryMs = 1_000; };
    source.onmessage = (event) => {
      try { onMessage(JSON.parse(event.data) as NotificationStreamPayload); }
      catch (error) { console.error('[sse-client] payload inválido', error); }
    };
    source.onerror = () => {
      source?.close();
      if (closed || retryTimer !== undefined) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        connect();
      }, retryMs);
      retryMs = Math.min(retryMs * 2, 30_000);
    };
  };

  connect();

  const close = () => {
    closed = true;
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    source?.close();
    if (activeClose === close) activeClose = null;
  };
  activeClose = close;
  return close;
}
