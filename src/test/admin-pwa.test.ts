// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const runtime = vi.hoisted(() => ({ resize: vi.fn(), png: vi.fn(), toBuffer: vi.fn() }));
vi.mock('sharp', () => ({ default: vi.fn(() => ({
  resize: runtime.resize.mockReturnThis(), png: runtime.png.mockReturnThis(), toBuffer: runtime.toBuffer.mockResolvedValue(Buffer.from('png')),
})) }));

import { GET as getManifest } from '@/app/api/public/admin-manifest/route';
import { GET as getIcon } from '@/app/api/public/admin-icon/route';
import { metadata } from '@/app/admin/layout';
import { getPlatformAdminIconUrl, PLATFORM_ADMIN_MANIFEST } from '@/lib/branding/defaults';

describe('ícone e identidade do PWA do admin', () => {
  it('usa manifesto próprio, mantendo o escopo de todas as rotas do admin', async () => {
    expect(metadata.manifest).toBe(PLATFORM_ADMIN_MANIFEST);
    const response = getManifest();
    const manifest = await response.json();
    expect(manifest).toMatchObject({ name: 'Admin', start_url: '/pwa-start?admin=1', scope: '/', display: 'standalone' });
    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([getPlatformAdminIconUrl(192), getPlatformAdminIconUrl(512)]);
  });

  it.each([192, 512])('encaixa o logo inteiro na versão de %i pixels', async (size) => {
    const response = await getIcon(new NextRequest(`https://church.test/api/public/admin-icon?size=${size}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(runtime.resize).toHaveBeenCalledWith(size, size, { fit: 'contain', background: '#111827' });
  });

  it('rejeita dimensões não previstas', async () => {
    const response = await getIcon(new NextRequest('https://church.test/api/public/admin-icon?size=123'));
    expect(response.status).toBe(400);
  });
});
