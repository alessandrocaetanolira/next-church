import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preserveOfflineLogos, readOfflineLogos } from '@/lib/branding/offline-logos';

const runtime = vi.hoisted(() => ({
  user: { id: 'user-a', tenantId: 'tenant-a', tenantSlug: 'tenant-a', isPlatformAdmin: false },
}));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: runtime.user }) }));
vi.mock('@/services/settings/settings-api', () => ({ getUserBranding: vi.fn() }));
import { getUserBranding } from '@/services/settings/settings-api';
import { AppSettingsProvider, useAppSettings } from '@/components/providers/AppSettingsProvider';
import { AppLogo } from '@/components/shared/AppLogo';

function Consumer() {
  const { settings } = useAppSettings();
  return <><p>{settings.appName}</p><AppLogo className="h-12 w-40" /></>;
}
const source = '/api/files/tenant-a/branding/logo.webp?v=2';
const image = 'data:image/webp;base64,dGVzdA==';

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  runtime.user = { id: 'user-a', tenantId: 'tenant-a', tenantSlug: 'tenant-a', isPlatformAdmin: false };
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('cópia local dos logos', () => {
  it('preserva a imagem e não compartilha o cache entre tenants', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['logo'], { type: 'image/webp' }) }));
    vi.stubGlobal('fetch', fetcher);
    await preserveOfflineLogos('tenant-a', [source], new AbortController().signal);
    expect(readOfflineLogos('tenant-a')[source]).toMatch(/^data:image\/webp;base64,/);
    expect(readOfflineLogos('tenant-b')).toEqual({});
    expect(fetcher).toHaveBeenCalledOnce();
    await preserveOfflineLogos('tenant-a', [source], new AbortController().signal);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('não copia imagens privadas, fontes externas ou arquivos excessivos', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(513 * 1024)], { type: 'image/webp' }) }));
    vi.stubGlobal('fetch', fetcher);
    expect(await preserveOfflineLogos('tenant-a', ['/api/files/tenant-a/profile/avatar.webp', 'https://example.test/logo.png', source], new AbortController().signal)).toEqual({});
    expect(fetcher).toHaveBeenCalledOnce();
    expect(readOfflineLogos('tenant-a')).toEqual({});
  });

  it('quota do storage não impede a renderização e cancelamento não escreve cache', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['logo'], { type: 'image/webp' }) })));
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    await expect(preserveOfflineLogos('tenant-a', [source], new AbortController().signal)).resolves.toHaveProperty(source);
    set.mockRestore();
    const controller = new AbortController(); controller.abort();
    await expect(preserveOfflineLogos('tenant-b', [source], controller.signal)).resolves.toEqual({});
    expect(readOfflineLogos('tenant-b')).toEqual({});
  });
});

describe('branding durante abertura offline', () => {
  it('usa tenant do usuário salvo e copia Base64 na topbar sem chamar a API', async () => {
    localStorage.setItem('church-app-settings:tenant-a', JSON.stringify({ appName: 'Igreja A', logoUrl: source }));
    localStorage.setItem('church-branding-logos:church-app-settings%3Atenant-a', JSON.stringify({ version: 1, images: [{ source, dataUrl: image }] }));
    render(<AppSettingsProvider><Consumer /></AppSettingsProvider>);
    await waitFor(() => expect(screen.getByText('Igreja A')).toBeDefined());
    expect(screen.getAllByAltText('Igreja A').every((logo) => logo.getAttribute('src') === image)).toBe(true);
    expect(getUserBranding).not.toHaveBeenCalled();
  });

  it('trocar tenant não grava branding anterior na configuração do próximo', async () => {
    localStorage.setItem('church-app-settings:tenant-a', JSON.stringify({ appName: 'Igreja A', logoUrl: source }));
    localStorage.setItem('church-app-settings:tenant-b', JSON.stringify({ appName: 'Igreja B', logoUrl: '/branding/b/logo.png' }));
    const view = render(<AppSettingsProvider><Consumer /></AppSettingsProvider>);
    expect(screen.getByText('Igreja A')).toBeDefined();
    runtime.user = { ...runtime.user, id: 'user-b', tenantId: 'tenant-b', tenantSlug: 'tenant-b' };
    await act(async () => view.rerender(<AppSettingsProvider><Consumer /></AppSettingsProvider>));
    expect(screen.getByText('Igreja B')).toBeDefined();
    expect(JSON.parse(localStorage.getItem('church-app-settings:tenant-b')!).appName).toBe('Igreja B');
  });
});
