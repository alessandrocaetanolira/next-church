// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

const runtime = vi.hoisted(() => ({ directory: '', insert: vi.fn(), hash: vi.fn(), notify: vi.fn() }));
vi.mock('bcryptjs', () => ({ default: { hash: runtime.hash } }));
vi.mock('@/lib/prisma-factory', () => ({
  getDatabaseDirectory: () => runtime.directory,
  getGlobalClient: () => ({ church: { findUnique: async () => ({ id: 'church-id', slug: 'church', databaseKey: 'physical-db', active: true, status: 'ACTIVE' }) } }),
  getTenantClient: () => ({ $queryRawUnsafe: async () => [], $executeRawUnsafe: runtime.insert }),
}));
vi.mock('@/lib/server/notification-service', () => ({ notifyPendingMemberRegistration: runtime.notify }));
import { POST } from '@/app/api/public/register/route';
import { closeAuthRateLimitStores } from '@/lib/server/public-auth-rate-limit';

let directory: string;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('AUTH_SECRET', 'segredo-descartavel-register-test');
  vi.stubEnv('AUTH_RATE_LIMIT_IP_HEADER', '');
  vi.stubEnv('AUTH_REGISTER_IP_LIMIT', '5');
  vi.stubEnv('AUTH_REGISTER_ACCOUNT_LIMIT', '3');
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-register-limit-'));
  runtime.directory = directory;
  runtime.hash.mockResolvedValue('hash-interno-sentinela');
  runtime.insert.mockResolvedValue(1);
  runtime.notify.mockResolvedValue(undefined);
});
afterEach(async () => {
  await closeAuthRateLimitStores();
  fs.rmSync(directory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('rate limit no endpoint real de cadastro público', () => {
  it('mantém aprovação pendente e impede bcrypt/INSERT/notificação na sexta tentativa do IP', async () => {
    const send = (index: number) => POST(new NextRequest('http://localhost/api/public/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ churchSlug: 'church', name: "João D'Ávila", email: `user-${index}@example.test`, phone: '(11) 99999-9999', password: '123456', approved: true, role: 'ADMIN' }),
    }));
    for (let i = 0; i < 5; i++) {
      const response = await send(i);
      expect(response.status).toBe(201);
      const value = await response.json();
      expect(value.approved).toBe(false);
      expect(JSON.stringify(value)).not.toContain('hash-interno-sentinela');
    }
    expect((await send(5)).status).toBe(429);
    expect(runtime.hash).toHaveBeenCalledTimes(5);
    expect(runtime.insert).toHaveBeenCalledTimes(5);
    expect(runtime.notify).toHaveBeenCalledTimes(5);
    expect(runtime.insert.mock.calls.every((call) => call[7] === false)).toBe(true);
  });

  it('rejeita text/plain e JSON malformado antes de efeitos', async () => {
    const send = (contentType: string, body: string) => POST(new NextRequest('http://localhost/api/public/register', {
      method: 'POST', headers: { 'Content-Type': contentType }, body,
    }));
    expect((await send('text/plain', '{}')).status).toBe(415);
    expect((await send('application/json', '{')).status).toBe(400);
    expect(runtime.hash).not.toHaveBeenCalled();
    expect(runtime.insert).not.toHaveBeenCalled();
    expect(runtime.notify).not.toHaveBeenCalled();
  });
});
