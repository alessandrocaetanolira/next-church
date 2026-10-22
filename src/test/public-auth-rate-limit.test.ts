// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AuthRateLimitStore } from '@/lib/server/auth-rate-limit-store';

const runtime = vi.hoisted(() => ({ directory: '', church: vi.fn() }));
vi.mock('@/lib/prisma-factory', () => ({
  getDatabaseDirectory: () => runtime.directory,
  getGlobalClient: () => ({ church: { findUnique: runtime.church } }),
}));
import { closeAuthRateLimitStores, ensureLoginRateLimit, getAuthClientAddress, protectPublicAuthRequest } from '@/lib/server/public-auth-rate-limit';

let directory: string;
const clients: AuthRateLimitStore[] = [];

beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', 'segredo-descartavel-so-para-testes');
  vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', '');
  vi.stubEnv('AUTH_LOGIN_ACCOUNT_LIMIT', '5');
  vi.stubEnv('AUTH_LOGIN_IP_LIMIT', '60');
  vi.stubEnv('AUTH_REGISTER_IP_LIMIT', '5');
  vi.stubEnv('AUTH_REGISTER_ACCOUNT_LIMIT', '3');
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-auth-limit-'));
  runtime.directory = directory;
  runtime.church.mockResolvedValue({ id: 'stable-church-id' });
});

afterEach(async () => {
  await closeAuthRateLimitStores();
  await Promise.all(clients.splice(0).map((client) => client.disconnect()));
  fs.rmSync(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function store() {
  const client = new AuthRateLimitStore(path.join(directory, 'auth-security.db'));
  clients.push(client);
  return client;
}

function request(input: unknown = { email: 'user@example.test', churchSlug: 'church-a', password: '123456' }) {
  return new Request('https://church.test/api/auth/callback/credentials', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
}

describe('store SQLite de rate limit compartilhado', () => {
  it('limita concorrência entre conexões e mantém quota após nova instância', async () => {
    const instances = [store(), store()];
    const results = await Promise.all(Array.from({ length: 24 }, (_, i) => instances[i % 2].consume('same-account', 5, 60_000, 1_000)));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect((await store().consume('same-account', 5, 60_000, 2_000)).allowed).toBe(false);
    expect((await instances[0].consume('another-account', 5, 60_000, 2_000)).allowed).toBe(true);
    expect(fs.readdirSync(directory)).not.toContain('global.db');
  });

  it('expira na fronteira e tentativas recusadas não estendem a janela', async () => {
    const client = store();
    expect(await client.consume('key', 1, 60_000, 1_000)).toMatchObject({ allowed: true, retryAfter: 60 });
    expect(await client.consume('key', 1, 60_000, 60_999)).toMatchObject({ allowed: false, retryAfter: 1 });
    expect(await client.consume('key', 1, 60_000, 61_000)).toMatchObject({ allowed: true, retryAfter: 60 });
  });
});

describe('admissão de tentativas públicas antes de efeitos', () => {
  it('bloqueia a sexta tentativa de conta com 429 e contrato consumido pelo Auth.js', async () => {
    const handler = vi.fn(async (forwarded: Request) => {
      // authorize usa o mesmo contexto e não cobra a tentativa uma segunda vez.
      await ensureLoginRateLimit(forwarded, await forwarded.json());
      return Response.json({ success: true });
    });
    for (let i = 0; i < 5; i++) expect((await protectPublicAuthRequest(request(), 'login', handler)).status).toBe(200);
    const blocked = await protectPublicAuthRequest(request(), 'login', handler);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    const result = await blocked.json();
    expect(new URL(result.url).searchParams.get('code')).toBe('rate_limited');
    expect(handler).toHaveBeenCalledTimes(5);
    expect(fs.readFileSync(path.join(directory, 'auth-security.db')).toString()).not.toContain('user@example.test');
  });

  it('normaliza conta e não reinicia a quota com outro slug da mesma igreja', async () => {
    vi.stubEnv('AUTH_LOGIN_ACCOUNT_LIMIT', '1');
    const handler = vi.fn(async () => Response.json({ success: true }));
    expect((await protectPublicAuthRequest(request({ email: ' USER@example.test ', churchSlug: 'old-slug' }), 'login', handler)).status).toBe(200);
    expect((await protectPublicAuthRequest(request({ email: 'user@example.test', churchSlug: 'new-slug' }), 'login', handler)).status).toBe(429);
    runtime.church.mockResolvedValue({ id: 'another-church' });
    expect((await protectPublicAuthRequest(request(), 'login', handler)).status).toBe(200);
    expect((await protectPublicAuthRequest(request({ email: 'user@example.test', churchSlug: '' }), 'login', handler)).status).toBe(200);
  });

  it('limita IP mesmo trocando conta e não confia em headers sem configuração', async () => {
    vi.stubEnv('AUTH_LOGIN_IP_LIMIT', '1');
    const handler = vi.fn(async () => Response.json({ success: true }));
    expect((await protectPublicAuthRequest(request(), 'login', handler)).status).toBe(200);
    const next = request({ email: 'another@example.test', churchSlug: '' });
    next.headers.set('x-forwarded-for', '203.0.113.42');
    expect((await protectPublicAuthRequest(next, 'login', handler)).status).toBe(429);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('cadastro tem quotas próprias e aceita JSON com charset', async () => {
    const handler = vi.fn(async () => Response.json({ approved: false }, { status: 201 }));
    for (let i = 0; i < 3; i++) {
      const req = request();
      req.headers.set('content-type', 'application/json; charset=utf-8');
      expect((await protectPublicAuthRequest(req, 'register', handler)).status).toBe(201);
    }
    expect((await protectPublicAuthRequest(request(), 'register', handler)).status).toBe(429);
    expect((await protectPublicAuthRequest(request(), 'login', handler)).status).toBe(201);
    expect(handler).toHaveBeenCalledTimes(4);
  });

  it('entrada malformada conta por IP, e tamanho/tipo inválidos não chegam ao handler', async () => {
    vi.stubEnv('AUTH_REGISTER_IP_LIMIT', '2');
    const handler = vi.fn(async () => Response.json({}));
    const malformed = new Request('http://localhost/api/public/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    expect((await protectPublicAuthRequest(malformed, 'register', handler)).status).toBe(400);
    const plain = new Request('http://localhost/api/public/register', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
    expect((await protectPublicAuthRequest(plain, 'register', handler)).status).toBe(415);
    expect((await protectPublicAuthRequest(request(), 'register', handler)).status).toBe(429);
    const oversized = new Request('http://localhost/api/auth/callback/credentials', { method: 'POST', body: 'x'.repeat(16 * 1024 + 1) });
    expect((await protectPublicAuthRequest(oversized, 'login', handler)).status).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });

  it('indisponibilidade do store retorna 503 sem efeitos nem mensagem interna', async () => {
    runtime.directory = path.join(directory, 'missing-parent');
    const handler = vi.fn(async () => Response.json({}));
    const response = await protectPublicAuthRequest(request(), 'login', handler);
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(directory);
    expect(handler).not.toHaveBeenCalled();
  });

  it('authorize fora da rota também está limitado', async () => {
    vi.stubEnv('AUTH_LOGIN_ACCOUNT_LIMIT', '1');
    const input = { email: 'user@example.test', churchSlug: '' };
    await ensureLoginRateLimit(request(input), input);
    await expect(ensureLoginRateLimit(request(input), input)).rejects.toMatchObject({ status: 429 });
  });
});

describe('origem de IP explicitamente configurada', () => {
  it('separa visitantes Cloudflare e ignora X-Forwarded-For ao contar a quota', async () => {
    vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', 'cf-connecting-ip');
    vi.stubEnv('AUTH_LOGIN_IP_LIMIT', '1');
    const handler = vi.fn(async () => Response.json({ success: true }));
    const send = (ip: string, email: string, forwarded: string) => {
      const req = request({ email, churchSlug: '' });
      req.headers.set('cf-connecting-ip', ip);
      req.headers.set('x-forwarded-for', forwarded);
      return protectPublicAuthRequest(req, 'login', handler);
    };
    expect((await send('198.51.100.1', 'first@example.test', '203.0.113.1')).status).toBe(200);
    expect((await send('198.51.100.1', 'second@example.test', '203.0.113.2')).status).toBe(429);
    expect((await send('198.51.100.2', 'second@example.test', '203.0.113.2')).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('trocar o IP Cloudflare não reinicia o limite da mesma conta', async () => {
    vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', 'cf-connecting-ip');
    vi.stubEnv('AUTH_LOGIN_ACCOUNT_LIMIT', '1');
    const handler = vi.fn(async () => Response.json({ success: true }));
    const first = request();
    first.headers.set('cf-connecting-ip', '198.51.100.1');
    expect((await protectPublicAuthRequest(first, 'login', handler)).status).toBe(200);
    const second = request();
    second.headers.set('cf-connecting-ip', '198.51.100.2');
    expect((await protectPublicAuthRequest(second, 'login', handler)).status).toBe(429);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('não usa X-Forwarded-For como fallback se o header Cloudflare estiver ausente', async () => {
    vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', 'cf-connecting-ip');
    vi.stubEnv('AUTH_LOGIN_IP_LIMIT', '1');
    const handler = vi.fn(async () => Response.json({ success: true }));
    const first = request({ email: 'first@example.test', churchSlug: '' });
    first.headers.set('x-forwarded-for', '198.51.100.1');
    expect((await protectPublicAuthRequest(first, 'login', handler)).status).toBe(200);
    const second = request({ email: 'second@example.test', churchSlug: '' });
    second.headers.set('cf-connecting-ip', 'invalid');
    second.headers.set('x-forwarded-for', '198.51.100.2');
    expect((await protectPublicAuthRequest(second, 'login', handler)).status).toBe(429);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignora headers arbitrários e interpreta a cadeia somente quando configurada', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.1, 203.0.113.1' });
    expect(getAuthClientAddress(headers)).toBe('unverified-source');
    vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', 'x-forwarded-for');
    vi.stubEnv('AUTH_RATE_LIMIT_PROXY_HOPS', '1');
    expect(getAuthClientAddress(headers)).toBe('203.0.113.1');
    vi.stubEnv('AUTH_RATE_LIMIT_PROXY_HOPS', '2');
    expect(getAuthClientAddress(headers)).toBe('198.51.100.1');
    vi.stubEnv('AUTH_RATE_LIMIT_PROXY_HOPS', '');
    expect(() => getAuthClientAddress(headers)).toThrow();
  });

  it('normaliza IPv6 e recusa valor malformado em header de IP único', () => {
    vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', 'cf-connecting-ip');
    expect(getAuthClientAddress(new Headers({ 'cf-connecting-ip': '2001:0db8:0:0:0:0:0:1' }))).toBe('2001:db8::1');
    expect(getAuthClientAddress(new Headers({ 'cf-connecting-ip': '::ffff:192.0.2.1' }))).toBe('192.0.2.1');
    expect(getAuthClientAddress(new Headers({ 'cf-connecting-ip': 'client,proxy' }))).toBe('unverified-source');
  });
});
