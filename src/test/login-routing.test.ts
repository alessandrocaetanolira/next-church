// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const runtime = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: runtime.auth }));
vi.mock('@/lib/access-control', () => ({ canAccessRoute: () => true, hasPlanFeature: () => true }));
vi.mock('@/lib/plan-features', () => ({ getPlanFeatureForPath: () => null }));

import { proxy } from '@/proxy';
import { getLoginUrl, isLoginRoute } from '@/lib/login-routing';

beforeEach(() => vi.resetAllMocks());

describe('destino do login', () => {
  it('preserva o contexto global mesmo com um slug de igreja antigo', () => {
    expect(getLoginUrl({ pathname: '/admin/tenants', tenantSlug: 'igreja-antiga' })).toBe('/admin/login');
    expect(getLoginUrl({ isPlatformAdmin: true, tenantSlug: 'igreja-antiga' })).toBe('/admin/login');
    expect(getLoginUrl({ pathname: '/members', tenantSlug: ' Igreja-A ' })).toBe('/auth/login?igreja=igreja-a');
    expect(isLoginRoute('/admin/login')).toBe(true);
    expect(isLoginRoute('/auth/login/igreja-a')).toBe(true);
    expect(isLoginRoute('/admin/login-invalido')).toBe(false);
  });

  it('permite abrir o login global sem consultar a sessão antiga', async () => {
    const response = await proxy(new NextRequest('https://church.test/admin/login'));
    expect(response.headers.get('location')).toBeNull();
    expect(runtime.auth).not.toHaveBeenCalled();
  });

  it('leva uma rota administrativa sem sessão para o login global', async () => {
    runtime.auth.mockResolvedValue(null);
    const response = await proxy(new NextRequest('https://church.test/admin/tenants'));
    expect(response.headers.get('location')).toBe('https://church.test/admin/login');
  });

  it('mantém a sessão global expirada no contexto administrativo', async () => {
    runtime.auth.mockResolvedValue({ user: { authValid: false, isPlatformAdmin: true } });
    const response = await proxy(new NextRequest('https://church.test/admin/plans'));
    expect(response.headers.get('location')).toBe('https://church.test/admin/login?reason=session-expired');
  });

  it('mantém o slug da igreja ao expirar uma sessão de tenant', async () => {
    runtime.auth.mockResolvedValue({ user: { authValid: false, tenantSlug: 'igreja-a' } });
    const response = await proxy(new NextRequest('https://church.test/members'));
    expect(response.headers.get('location')).toBe('https://church.test/auth/login?igreja=igreja-a&reason=session-expired');
  });
});
