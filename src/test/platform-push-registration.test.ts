// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ auth: vi.fn(), registerPlatform: vi.fn(), registerTenant: vi.fn() }));
vi.mock('@/auth', () => ({ auth: runtime.auth }));
vi.mock('@/server/notifications/platform-push.controller', () => ({ registerPlatformPushSubscription: runtime.registerPlatform, removePlatformPushSubscription: vi.fn() }));
vi.mock('@/server/notifications/push-subscriptions.controller', () => ({ registerPushSubscription: runtime.registerTenant, removePushSubscription: vi.fn() }));
vi.mock('@/lib/server/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { GET } from '@/app/api/push/vapid-public-key/route';
import { POST } from '@/app/api/push/subscriptions/route';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('VAPID_PUBLIC_KEY', 'test-public-key');
  runtime.registerPlatform.mockResolvedValue({ ok: true });
});
afterEach(() => vi.unstubAllEnvs());

describe('ativação de Push para o admin global', () => {
  it('obtém a chave pública e registra a inscrição global sem igreja vinculada', async () => {
    runtime.auth.mockResolvedValue({ user: { id: 'admin-global', isPlatformAdmin: true, tenantId: '', email: 'admin@test.local' } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ publicKey: 'test-public-key' });
    const body = { endpoint: 'https://push.test/endpoint', keys: { p256dh: 'key', auth: 'auth' } };
    const registered = await POST(new Request('https://church.test/api/push/subscriptions', { method: 'POST', body: JSON.stringify(body) }));
    expect(registered.status).toBe(200);
    expect(runtime.registerPlatform).toHaveBeenCalledWith('admin-global', body);
    expect(runtime.registerTenant).not.toHaveBeenCalled();
  });

  it('continua permitindo que a igreja obtenha a chave', async () => {
    runtime.auth.mockResolvedValue({ user: { id: 'user-a', tenantId: 'igreja-a' } });
    expect((await GET()).status).toBe(200);
  });

  it.each([null, { user: { id: 'unknown' } }, { user: { id: 'admin', isPlatformAdmin: true, authValid: false } }])('rejeita sessão ausente ou inválida: %j', async (session) => {
    runtime.auth.mockResolvedValue(session);
    expect((await GET()).status).toBe(401);
  });

  it('não registra uma sessão global expirada', async () => {
    runtime.auth.mockResolvedValue({ user: { id: 'admin', isPlatformAdmin: true, authValid: false } });
    expect((await POST(new Request('https://church.test/api/push/subscriptions', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect(runtime.registerPlatform).not.toHaveBeenCalled();
  });

  it('distingue uma migração pendente de uma inscrição inválida', async () => {
    runtime.auth.mockResolvedValue({ user: { id: 'admin-global', isPlatformAdmin: true } });
    runtime.registerPlatform.mockRejectedValue(new Error('no such table: PlatformPushSubscription'));
    const response = await POST(new Request('https://church.test/api/push/subscriptions', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('temporariamente indisponíveis');
  });
});
