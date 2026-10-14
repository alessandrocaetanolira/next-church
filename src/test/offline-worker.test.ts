// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Usa o Serwist real e o sw.ts real; simula apenas APIs do navegador/rede.
const listeners = new Map<string, ((event: unknown) => void)[]>();
const documents = new Map<string, Response>();
const disable = vi.fn().mockResolvedValue(undefined);
const enable = vi.fn().mockResolvedValue(undefined);

class WorkerFetchEvent extends Event {
  response?: Promise<Response>;
  pending: Promise<unknown>[] = [];
  constructor(public request: Request) { super('fetch'); }
  waitUntil(promise: Promise<unknown>) { this.pending.push(promise); }
  respondWith(response: Promise<Response>) { this.response = response; }
}
function key(input: Request | string) {
  return new URL(typeof input === 'string' ? input : input.url, 'https://church.local').pathname;
}
function fullKey(input: Request | string) {
  return new URL(typeof input === 'string' ? input : input.url, 'https://church.local').href;
}
function documentRequest(path: string) {
  const request = new Request(`https://church.local${path}`);
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  Object.defineProperty(request, 'destination', { value: 'document' });
  return request;
}
async function dispatch(request: Request) {
  const event = new WorkerFetchEvent(request);
  for (const listener of listeners.get('fetch') ?? []) listener(event);
  const response = await event.response;
  await Promise.allSettled(event.pending);
  return response!;
}

beforeEach(async () => {
  vi.resetModules(); listeners.clear(); documents.clear(); vi.clearAllMocks();
  const location = new URL('https://church.local/serwist/sw.js');
  const cache = {
    match: vi.fn(async (request: Request | string) => (documents.get(fullKey(request)) ?? documents.get(key(request)))?.clone()),
    put: vi.fn(async (request: Request | string, response: Response) => { documents.set(fullKey(request), response.clone()); }),
    keys: vi.fn(async () => []), delete: vi.fn(async () => true),
  };
  const caches = { open: vi.fn(async () => cache), match: cache.match };
  vi.stubGlobal('location', location);
  vi.stubGlobal('FetchEvent', WorkerFetchEvent);
  vi.stubGlobal('ExtendableEvent', Event);
  vi.stubGlobal('self', {
    location, caches, __WB_DISABLE_DEV_LOGS: true,
    __SW_MANIFEST: [{ url: '/offline', revision: 'build-test' }, { url: '/bible', revision: 'build-test' }],
    registration: { scope: 'https://church.local/', navigationPreload: { disable, enable } },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, [...listeners.get(type) ?? [], listener]),
  });
  vi.stubGlobal('caches', caches);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network offline')));
  await import('../app/sw');
});
afterEach(() => vi.unstubAllGlobals());

describe('abertura fria offline no Service Worker', () => {
  it.each(['/pwa-start', '/', '/members/123'])('entrega HTML para %s sem redirect ou segunda consulta', async (path) => {
    documents.set('/offline', new Response('<html>Você está offline</html>', { headers: { 'Content-Type': 'text/html' } }));
    const response = await dispatch(documentRequest(path));
    expect(response.status).toBe(200);
    expect(response.headers.get('Location')).toBeNull();
    expect(await response.text()).toContain('Você está offline');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retorna Bíblia precacheada sem acessar a rede', async () => {
    documents.set('/bible', new Response('<html>Bíblia</html>'));
    expect(await (await dispatch(documentRequest('/bible'))).text()).toContain('Bíblia');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mostra aviso independente de chunks se o navegador removeu o cache', async () => {
    const response = await dispatch(documentRequest('/pwa-start'));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Reconecte o aplicativo');
  });

  it('desativa preload habilitado pelo worker anterior na ativação', async () => {
    const pending: Promise<unknown>[] = [];
    for (const listener of listeners.get('activate') ?? []) listener({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
    expect(disable).toHaveBeenCalledOnce();
    expect(enable).not.toHaveBeenCalled();
  });

  it('não substitui uma API por HTML offline', async () => {
    const response = await dispatch(new Request('https://church.local/api/bible'));
    expect(response.type).toBe('error');
  });

  it('instala HTML novo apesar de um documento antigo sem revisão estar no cache', async () => {
    documents.set('https://church.local/offline', new Response('<html>chunk-antigo.js</html>'));
    vi.mocked(fetch).mockResolvedValue(new Response('<html>chunk-do-build-novo.js</html>'));
    const pending: Promise<unknown>[] = [];
    const install = new Event('install');
    Object.assign(install, { waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    for (const listener of listeners.get('install') ?? []) listener(install);
    await Promise.all(pending);
    const saved = documents.get('https://church.local/offline?__WB_REVISION__=build-test');
    expect(await saved?.text()).toContain('chunk-do-build-novo.js');
    expect(fetch).toHaveBeenCalledTimes(2); // offline + Bíblia, ambas versionadas
  });
});
