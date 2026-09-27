import { saveTenantDataUrl, saveTenantImageDataUrl } from '@/lib/server/tenant-file-storage';
import { BrandingRepository } from './branding.repository';

const COLOR_RE = /^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/;

function luminance(value: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(value.slice(1 + offset, 3 + offset), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export class BrandingService {
  constructor(private readonly repository: BrandingRepository) {}

  normalize(row: Record<string, any>) {
    const legacyLogo = row.brandingLogoUrl ?? row.logoUrl ?? null;
    const brandingVersion = Number(row.brandingVersion ?? 1) || 1;
    const versioned = (value: unknown) => {
      if (typeof value !== 'string' || !value) return null;
      const separator = value.includes('?') ? '&' : '?';
      return `${value}${separator}v=${encodeURIComponent(String(brandingVersion))}`;
    };
    return {
      slug: row.slug,
      name: row.name,
      logoUrl: versioned(legacyLogo),
      logoLightUrl: versioned(row.logoLightUrl ?? legacyLogo),
      logoDarkUrl: versioned(row.logoDarkUrl ?? legacyLogo),
      mobileIconUrl: versioned(row.mobileIconUrl ?? row.icon192Url ?? null),
      sidebarLogoUrl: versioned(row.sidebarLogoUrl ?? legacyLogo),
      sidebarOpenLightUrl: versioned(row.sidebarOpenLightUrl ?? row.logoLightUrl ?? row.sidebarLogoUrl ?? legacyLogo),
      sidebarOpenDarkUrl: versioned(row.sidebarOpenDarkUrl ?? row.logoDarkUrl ?? row.sidebarLogoUrl ?? legacyLogo),
      sidebarCollapsedLightUrl: versioned(row.sidebarCollapsedLightUrl ?? row.logoLightUrl ?? row.sidebarLogoUrl ?? legacyLogo),
      sidebarCollapsedDarkUrl: versioned(row.sidebarCollapsedDarkUrl ?? row.logoDarkUrl ?? row.sidebarLogoUrl ?? legacyLogo),
      sidebarUseImage: row.sidebarUseImage ?? true,
      sidebarTitle: row.sidebarTitle === undefined ? row.name : row.sidebarTitle ?? null,
      sidebarSubtitle: row.sidebarSubtitle === undefined ? 'Gestão de Tarefas' : row.sidebarSubtitle ?? null,
      themeVariant: row.themeVariant ?? 'default',
      themeMode: row.themeMode ?? 'light',
      pwaName: row.pwaName ?? row.name,
      pwaShortName: row.pwaShortName ?? row.pwaName ?? row.name,
      icon192Url: versioned(row.icon192Url),
      icon512Url: versioned(row.icon512Url),
      primaryColor: row.primaryColor ?? null,
      secondaryColor: row.secondaryColor ?? null,
      themeColor: row.themeColor ?? row.primaryColor ?? null,
      backgroundColor: row.backgroundColor ?? row.secondaryColor ?? null,
      configJson: row.configJson ?? null,
      schemaVersion: row.schemaVersion ?? 1,
      brandingVersion,
    };
  }

  async update(current: Record<string, any>, tenantSlug: string, input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
    const color = (value: unknown, fallback: string | null) => {
      if (value === undefined) return fallback;
      if (value === null || value === '') return null;
      if (typeof value !== 'string' || !COLOR_RE.test(value.trim())) throw new Error('Cor inválida');
      return value.trim();
    };
    const upload = async (
      field: string,
      fallback: string | null,
      dimensions?: { width: number; height: number; format?: 'webp' | 'png' },
    ) => {
      if (typeof body[field] === 'string' && body[field].startsWith('data:')) {
        return dimensions
          ? saveTenantImageDataUrl(tenantSlug, 'branding', body[field], dimensions)
          : saveTenantDataUrl(tenantSlug, 'branding', body[field]);
      }
      return body[field] === null ? null : fallback;
    };
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name;
    const logoUrl = await upload('logoBase64', current.brandingLogoUrl ?? current.logoUrl ?? null);
    const logoLightUrl = await upload('logoLightBase64', current.logoLightUrl ?? current.brandingLogoUrl ?? current.logoUrl ?? null);
    const logoDarkUrl = await upload('logoDarkBase64', current.logoDarkUrl ?? current.brandingLogoUrl ?? current.logoUrl ?? null);
    const mobileIconUrl = await upload('mobileIconBase64', current.mobileIconUrl ?? current.icon192Url ?? null, { width: 192, height: 192, format: 'png' });
    const sidebarLogoUrl = await upload('sidebarLogoBase64', current.sidebarLogoUrl ?? current.brandingLogoUrl ?? current.logoUrl ?? null);
    const sidebarOpenLightUrl = await upload('sidebarOpenLightBase64', current.sidebarOpenLightUrl ?? current.logoLightUrl ?? current.sidebarLogoUrl ?? current.logoUrl ?? null);
    const sidebarOpenDarkUrl = await upload('sidebarOpenDarkBase64', current.sidebarOpenDarkUrl ?? current.logoDarkUrl ?? current.sidebarLogoUrl ?? current.logoUrl ?? null);
    const sidebarCollapsedLightUrl = await upload('sidebarCollapsedLightBase64', current.sidebarCollapsedLightUrl ?? current.logoLightUrl ?? current.sidebarLogoUrl ?? current.logoUrl ?? null);
    const sidebarCollapsedDarkUrl = await upload('sidebarCollapsedDarkBase64', current.sidebarCollapsedDarkUrl ?? current.logoDarkUrl ?? current.sidebarLogoUrl ?? current.logoUrl ?? null);
    const primaryColor = color(body.primaryColor, current.primaryColor ?? null);
    const secondaryColor = color(body.secondaryColor, current.secondaryColor ?? null);
    const primaryLum = primaryColor ? luminance(primaryColor) : null;
    const secondaryLum = secondaryColor ? luminance(secondaryColor) : null;
    if (primaryLum !== null && secondaryLum !== null) {
      const ratio = (Math.max(primaryLum, secondaryLum) + 0.05) / (Math.min(primaryLum, secondaryLum) + 0.05);
      if (ratio < 1.5) throw new Error('As cores primária e secundária precisam ter contraste mínimo.');
    }
    await this.repository.update(current.id, {
      name, logoUrl, logoLightUrl, logoDarkUrl, mobileIconUrl, sidebarLogoUrl,
      sidebarOpenLightUrl, sidebarOpenDarkUrl, sidebarCollapsedLightUrl, sidebarCollapsedDarkUrl,
      sidebarUseImage: typeof body.sidebarUseImage === 'boolean' ? body.sidebarUseImage : current.sidebarUseImage ?? true,
      sidebarTitle: body.sidebarTitle === null ? null : typeof body.sidebarTitle === 'string' ? body.sidebarTitle.trim() || null : current.sidebarTitle ?? name,
      sidebarSubtitle: body.sidebarSubtitle === null ? null : typeof body.sidebarSubtitle === 'string' ? body.sidebarSubtitle.trim() || null : current.sidebarSubtitle ?? null,
      themeVariant: typeof body.themeVariant === 'string' && body.themeVariant.trim() ? body.themeVariant.trim() : current.themeVariant ?? 'default',
      pwaName: typeof body.pwaName === 'string' && body.pwaName.trim() ? body.pwaName.trim() : current.pwaName ?? name,
      pwaShortName: typeof body.pwaShortName === 'string' && body.pwaShortName.trim() ? body.pwaShortName.trim() : current.pwaShortName ?? current.pwaName ?? name,
      icon192Url: await upload('icon192Base64', current.icon192Url ?? null, { width: 192, height: 192, format: 'png' }), icon512Url: await upload('icon512Base64', current.icon512Url ?? null, { width: 512, height: 512, format: 'png' }),
      primaryColor, secondaryColor, themeColor: color(body.themeColor, current.themeColor ?? null), backgroundColor: color(body.backgroundColor, current.backgroundColor ?? null),
      configJson: body.configJson === undefined ? current.configJson ?? null : JSON.stringify(body.configJson),
    });
    return this.repository.findByTenant(current.databaseKey ?? current.slug, current.slug);
  }
}
