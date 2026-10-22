// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const runtime = vi.hoisted(() => ({
  config: null as NextAuthConfig | null,
  admin: vi.fn(), church: vi.fn(), user: vi.fn(), profile: vi.fn(),
}));
vi.mock('next-auth', () => ({ default: (config: NextAuthConfig) => {
  runtime.config = config;
  return { auth: vi.fn(), handlers: {}, signIn: vi.fn(), signOut: vi.fn() };
} }));
vi.mock('@/lib/prisma-factory', () => ({
  getGlobalClient: () => ({ platformAdmin: { findUnique: runtime.admin }, church: { findUnique: runtime.church } }),
  getTenantClient: () => ({ user: { findUnique: runtime.user }, $queryRawUnsafe: runtime.profile }),
}));
vi.mock('@/lib/server/logger', () => ({ serverLogger: { error: vi.fn(), warn: vi.fn() } }));
import '@/auth';

const globalToken: JWT = { id: 'global-admin', email: 'admin@example.test', version: 1, role: 'SUPER_ADMIN', permissions: [], teamIds: [], isPlatformAdmin: true, tenantId: '', tenantSlug: '', authValid: true };
const tenantToken: JWT = { id: 'user', email: 'user@example.test', version: 1, role: 'MEMBER', permissions: [], teamIds: [], isPlatformAdmin: false, tenantId: 'physical-db', tenantSlug: 'public-slug', churchAuthVersion: 1, authValid: true };

async function refresh(token: JWT, trigger?: 'update') {
  const callback = runtime.config!.callbacks!.jwt!;
  return callback({ token: { ...token }, trigger } as Parameters<typeof callback>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  runtime.admin.mockResolvedValue({ id: 'global-admin', active: true, version: 1, role: 'SUPER_ADMIN', permissions: '' });
  runtime.church.mockResolvedValue({ active: true, status: 'ACTIVE', authVersion: 1 });
  runtime.user.mockResolvedValue({ active: true, deletedAt: null, version: 1, role: 'MEMBER', permissions: '' });
  runtime.profile.mockResolvedValue([]);
});

describe('revalidação de sessão preserva acesso válido e recusa revogação', () => {
  it.each([null, { active: false, version: 1 }, { active: true, version: 2 }])('revoga global ausente/inativo/com versão diferente: %j', async (admin) => {
    runtime.admin.mockResolvedValue(admin);
    expect(await refresh(globalToken)).toMatchObject({ authValid: false });
  });

  it('mantém o global válido e atualiza permissões sem depender do navegador', async () => {
    runtime.admin.mockResolvedValue({ active: true, version: 1, role: 'SUPER_ADMIN', permissions: 'one,two' });
    expect(await refresh(globalToken)).toMatchObject({ authValid: true, permissions: ['one', 'two'] });
  });

  it('recusa global quando a revalidação falha', async () => {
    runtime.admin.mockRejectedValue(new Error('indisponível'));
    expect(await refresh(globalToken)).toMatchObject({ authValid: false });
  });

  it('não ressuscita token já revogado em update do cliente', async () => {
    expect(await refresh({ ...tenantToken, authValid: false }, 'update')).toMatchObject({ authValid: false });
    expect(runtime.user).not.toHaveBeenCalled();
  });

  it('mantém atualização de papel/permissões do tenant sem logout', async () => {
    runtime.user.mockResolvedValue({ active: true, deletedAt: null, version: 2, role: 'PASTOR', permissions: 'members:view', linkedMemberId: null });
    expect(await refresh(tenantToken)).toMatchObject({ authValid: true, version: 2, role: 'PASTOR', permissions: ['members:view'] });
  });

  it.each([null, { active: false }, { active: true, deletedAt: new Date() }])('revoga tenant para usuário indisponível: %j', async (user) => {
    runtime.user.mockResolvedValue(user);
    expect(await refresh(tenantToken)).toMatchObject({ authValid: false });
  });

  it('revoga tenant desativado antes de abrir dados do usuário', async () => {
    runtime.church.mockResolvedValue({ active: false, status: 'ACTIVE', authVersion: 1 });
    expect(await refresh(tenantToken)).toMatchObject({ authValid: false });
    expect(runtime.user).not.toHaveBeenCalled();
  });
});
