import type { Metadata } from 'next';
import { getGlobalClient } from '@/lib/prisma-factory';
import { getTenantPwaIconUrl } from '@/lib/branding/pwa-assets';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { BrandingService } from '@/server/branding/branding.service';

/** Resolve metadata pública sempre a partir do slug presente no link. */
export async function getPublicTenantMetadata(slug: string): Promise<Metadata | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  try {
    const repository = new BrandingRepository(getGlobalClient());
    const row = await repository.findPublic(normalizedSlug);
    if (!row || !row.active) return null;

    const branding = new BrandingService(repository).normalize(row);
    const title = branding.pwaName || branding.name || 'Church App';
    const icon192 = getTenantPwaIconUrl(branding.slug, 192, branding.brandingVersion);
    const icon512 = getTenantPwaIconUrl(branding.slug, 512, branding.brandingVersion);
    return {
      title,
      manifest: `/api/public/manifest?igreja=${encodeURIComponent(branding.slug)}`,
      icons: {
        icon: [
          { url: icon192, sizes: '192x192', type: 'image/png' },
          { url: icon512, sizes: '512x512', type: 'image/png' },
        ],
        apple: [{ url: icon192, sizes: '192x192', type: 'image/png' }],
      },
      appleWebApp: { capable: true, statusBarStyle: 'default', title },
    };
  } catch {
    return null;
  }
}
