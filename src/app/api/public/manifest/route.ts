import { NextRequest, NextResponse } from 'next/server';
import type { MetadataRoute } from 'next';
import { getGlobalClient } from '@/lib/prisma-factory';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { BrandingService } from '@/server/branding/branding.service';
import { getTenantPwaIconUrl } from '@/lib/branding/pwa-assets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('igreja')?.trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: 'Igreja não informada.' }, { status: 400 });

  const repository = new BrandingRepository(getGlobalClient());
  const row = await repository.findPublic(slug);
  if (!row || !row.active) return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });

  const branding = new BrandingService(repository).normalize(row);
  const name = branding.pwaName ?? branding.name;
  const icon192 = getTenantPwaIconUrl(branding.slug, 192, branding.brandingVersion);
  const icon512 = getTenantPwaIconUrl(branding.slug, 512, branding.brandingVersion);
  const manifest: MetadataRoute.Manifest = {
    id: '/pwa-start',
    name,
    short_name: branding.pwaShortName ?? name,
    description: 'Gestão completa para igrejas, com uso offline e notificações.',
    start_url: '/pwa-start',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: branding.backgroundColor ?? branding.secondaryColor ?? '#0f172a',
    theme_color: branding.themeColor ?? branding.primaryColor ?? '#0f172a',
    orientation: 'portrait',
    lang: 'pt-BR',
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icon512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/manifest+json',
    },
  });
}
