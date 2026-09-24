export type SseStreamOptions = {
  heartbeatMs?: number;
};

const encoder = new TextEncoder();

const encode = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

/** Infraestrutura comum de SSE: encoding, heartbeat, cancelamento e limpeza. */
export function createSseStream(request: Request, options: SseStreamOptions = {}) {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const heartbeatMs = options.heartbeatMs ?? 30_000;
  let closed = false;

  const write = (payload: unknown) => {
    if (!closed) void writer.write(encode(payload)).catch(() => undefined);
  };

  const heartbeat = setInterval(() => {
    write({ type: 'heartbeat', timestamp: new Date().toISOString() });
  }, heartbeatMs);

  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    void writer.close().catch(() => undefined);
  };

  request.signal.addEventListener('abort', close, { once: true });

  return {
    readable: stream.readable,
    write,
    close,
    response: () => new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    }),
  };
}
