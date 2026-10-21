import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  findPublic: vi.fn(),
  notFound: vi.fn(() => { throw new Error('404'); }),
}));
vi.mock('next/navigation', () => ({ notFound: runtime.notFound }));
vi.mock('@/lib/prisma-factory', () => ({ getGlobalClient: () => ({}) }));
vi.mock('@/server/branding/branding.repository', () => ({ BrandingRepository: class { findPublic = runtime.findPublic; } }));
vi.mock('@/server/branding/branding.service', () => ({ BrandingService: class { normalize(row: unknown) { return row; } } }));
vi.mock('@/components/common', () => ({ LoadingState: () => null }));
vi.mock('@/features/auth/components/LoginForm', () => ({ LoginForm: () => null }));
vi.mock('@/lib/branding/public-metadata', () => ({ getPublicTenantMetadata: vi.fn() }));
import LoginPage from '@/app/auth/login/page';
import { TenantLoginScreen } from '@/features/auth/components/TenantLoginScreen';

beforeEach(() => { runtime.findPublic.mockReset(); runtime.notFound.mockClear(); });

describe('login exclusivo pelo link da igreja', () => {
  it.each([{ igreja: undefined }, { igreja: '' }, { igreja: '  ' }, { igreja: ['igreja-a', 'igreja-b'] }])('retorna 404 para parâmetro ausente, vazio ou ambíguo: %j', async ({ igreja }) => {
    await expect(LoginPage({ searchParams: Promise.resolve({ igreja }) })).rejects.toThrow('404');
    expect(runtime.findPublic).not.toHaveBeenCalled();
  });

  it('rejeita um slug com formato inválido antes de consultar o banco', async () => {
    await expect(TenantLoginScreen({ slug: '../admin' })).rejects.toThrow('404');
    expect(runtime.findPublic).not.toHaveBeenCalled();
  });

  it.each([null, { active: false, status: 'ACTIVE' }, { active: true, status: 'FAILED' }])('não exibe formulário para igreja inexistente ou indisponível: %j', async (row) => {
    runtime.findPublic.mockResolvedValue(row);
    await expect(TenantLoginScreen({ slug: 'igreja-a' })).rejects.toThrow('404');
  });

  it('carrega apenas a igreja ativa identificada pelo slug do link', async () => {
    runtime.findPublic.mockResolvedValue({ slug: 'igreja-a', name: 'Igreja A', active: true, status: 'ACTIVE' });
    const screen = await TenantLoginScreen({ slug: 'Igreja-A' });
    expect(runtime.findPublic).toHaveBeenCalledWith('igreja-a');
    expect(runtime.notFound).not.toHaveBeenCalled();
    const form = screen.props.children.props.children;
    expect(form.props.initialSlug).toBe('igreja-a');
    expect(form.props.lockTenant).toBe(true);
  });
});
