import type { MetadataRoute } from 'next';
import { cookies } from 'next/headers';
import { getGlobalClient } from '@/lib/prisma-factory';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { BrandingService } from '@/server/branding/branding.service';
import { getTenantPwaIconUrl } from '@/lib/branding/pwa-assets';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let branding: ReturnType<BrandingService['normalize']> | null = null;
  try {
    const slug = (await cookies()).get('church-tenant-slug')?.value;
    if (slug) {
      const row = await new BrandingRepository(getGlobalClient()).findPublic(slug);
      if (row) branding = new BrandingService(new BrandingRepository(getGlobalClient())).normalize(row);
    }
  } catch {
    branding = null;
  }
  const name = branding?.pwaName ?? 'Church App';
  const shortName = branding?.pwaShortName ?? name;
  const themeColor = branding?.themeColor ?? branding?.primaryColor ?? '#0f172a';
  const backgroundColor = branding?.backgroundColor ?? branding?.secondaryColor ?? '#0f172a';
  const tenantSlug = branding?.slug;
  const icon192 = tenantSlug ? getTenantPwaIconUrl(tenantSlug, 192, branding?.brandingVersion) : '/pwa-192x192.png';
  const icon512 = tenantSlug ? getTenantPwaIconUrl(tenantSlug, 512, branding?.brandingVersion) : '/pwa-512x512.png';
  return {
    id: '/',
    name,
    short_name: shortName,
    description: 'Gestão completa para igrejas, com uso offline e notificações.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: backgroundColor,
    theme_color: themeColor,
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
}
