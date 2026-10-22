// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const runtime = vi.hoisted(() => ({ directory: '', admin: vi.fn(), church: vi.fn() }));
vi.mock('@/lib/prisma-factory', () => ({
  getDatabaseDirectory: () => runtime.directory,
  getGlobalClient: () => ({ platformAdmin: { findUnique: runtime.admin }, church: { findUnique: runtime.church } }),
  getTenantClient: vi.fn(),
}));
vi.mock('@/lib/server/logger', () => ({ serverLogger: { error: vi.fn(), warn: vi.fn() } }));
import { GET, POST } from '@/app/api/auth/[...nextauth]/route';
import { closeAuthRateLimitStores } from '@/lib/server/public-auth-rate-limit';

let directory: string;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('AUTH_SECRET', 'segredo-descartavel-authjs-handler-test');
  vi.stubEnv('AUTH_URL', 'http://localhost');
  vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', '');
  vi.stubEnv('AUTH_LOGIN_ACCOUNT_LIMIT', '5');
  vi.stubEnv('AUTH_LOGIN_IP_LIMIT', '60');
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-login-http-'));
  runtime.directory = directory;
  runtime.admin.mockResolvedValue({ id: 'global-admin', email: 'admin@example.test', name: 'Admin', role: 'SUPER_ADMIN',
    permissions: '', active: true, version: 1, passwordHash: await bcrypt.hash('123456', 4) });
});
afterEach(async () => {
  await closeAuthRateLimitStores();
  fs.rmSync(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function cookieHeader(response: Response) {
  return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
}

async function credentials() {
  const response = await GET(new NextRequest('http://localhost/api/auth/csrf'));
  const { csrfToken } = await response.json();
  return { csrfToken: String(csrfToken), cookie: cookieHeader(response) };
}

function login(csrfToken: string, cookie: string) {
  return new NextRequest('http://localhost/api/auth/callback/credentials', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1', cookie },
    body: new URLSearchParams({ email: 'admin@example.test', password: '123456', churchSlug: '', csrfToken, callbackUrl: 'http://localhost/admin/tenants' }),
  });
}

describe('contrato Request/Response com handlers reais do Auth.js', () => {
  it('preserva CSRF, login global e sessão; versão revogada é detectada', async () => {
    const { csrfToken, cookie } = await credentials();
    const response = await POST(login(csrfToken, cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ url: 'http://localhost/admin/tenants' });
    const sessionCookie = cookieHeader(response);
    expect(sessionCookie).toContain('authjs.session-token=');
    const request = () => new NextRequest('http://localhost/api/auth/session', { headers: { cookie: sessionCookie } });
    const session = await GET(request());
    expect(await session.json()).toMatchObject({ user: { isPlatformAdmin: true, authValid: true, tenantId: '' } });
    runtime.admin.mockResolvedValue({ active: true, version: 2 });
    const revoked = await GET(request());
    expect(await revoked.json()).toMatchObject({ user: { authValid: false } });
  });

  it('devolve 429 antes de autenticar a sexta tentativa, com formato esperado por signIn', async () => {
    const { csrfToken, cookie } = await credentials();
    for (let i = 0; i < 5; i++) expect((await POST(login(csrfToken, cookie))).status).toBe(200);
    const blocked = await POST(login(csrfToken, cookie));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    const body = await blocked.json();
    expect(new URL(body.url).searchParams.get('code')).toBe('rate_limited');
    expect(runtime.admin).toHaveBeenCalledTimes(5);
  });

  it('continua recusando credenciais sem o token CSRF correspondente', async () => {
    const { cookie } = await credentials();
    const response = await POST(login('csrf-incorreto', cookie));
    expect(cookieHeader(response)).not.toContain('authjs.session-token=');
    expect(runtime.admin).not.toHaveBeenCalled();
  });
});
