import { saveTenantDataUrl } from '@/lib/server/tenant-file-storage';
import { BrandingRepository } from './branding.repository';

const COLOR_RE = /^(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|transparent)$/;

export class BrandingService {
  constructor(private readonly repository: BrandingRepository) {}

  normalize(row: Record<string, any>) {
    return { slug: row.slug, name: row.name, logoUrl: row.brandingLogoUrl ?? row.logoUrl ?? null, themeVariant: row.themeVariant ?? 'default', themeMode: row.themeMode ?? 'light', pwaName: row.pwaName ?? row.name, pwaShortName: row.pwaShortName ?? row.pwaName ?? row.name, icon192Url: row.icon192Url ?? null, icon512Url: row.icon512Url ?? null, primaryColor: row.primaryColor ?? null, secondaryColor: row.secondaryColor ?? null, themeColor: row.themeColor ?? row.primaryColor ?? null, backgroundColor: row.backgroundColor ?? row.secondaryColor ?? null, configJson: row.configJson ?? null, schemaVersion: row.schemaVersion ?? 1, brandingVersion: row.brandingVersion ?? 1 };
  }

  async update(current: Record<string, any>, tenantSlug: string, input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
    const color = (value: unknown, fallback: string | null) => {
      if (value === undefined) return fallback;
      if (value === null || value === '') return null;
      if (typeof value !== 'string' || !COLOR_RE.test(value.trim())) throw new Error('Cor inválida');
      return value.trim();
    };
    const upload = async (field: string, fallback: string | null) => {
      if (typeof body[field] === 'string' && body[field].startsWith('data:')) return saveTenantDataUrl(tenantSlug, 'branding', body[field]);
      return body[field] === null ? null : fallback;
    };
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name;
    const logoUrl = await upload('logoBase64', current.brandingLogoUrl ?? current.logoUrl ?? null);
    await this.repository.update(current.id, {
      name, logoUrl, themeVariant: typeof body.themeVariant === 'string' && body.themeVariant.trim() ? body.themeVariant.trim() : current.themeVariant ?? 'default',
      pwaName: typeof body.pwaName === 'string' && body.pwaName.trim() ? body.pwaName.trim() : current.pwaName ?? name,
      pwaShortName: typeof body.pwaShortName === 'string' && body.pwaShortName.trim() ? body.pwaShortName.trim() : current.pwaShortName ?? current.pwaName ?? name,
      icon192Url: await upload('icon192Base64', current.icon192Url ?? null), icon512Url: await upload('icon512Base64', current.icon512Url ?? null),
      primaryColor: color(body.primaryColor, current.primaryColor ?? null), secondaryColor: color(body.secondaryColor, current.secondaryColor ?? null), themeColor: color(body.themeColor, current.themeColor ?? null), backgroundColor: color(body.backgroundColor, current.backgroundColor ?? null),
      configJson: body.configJson === undefined ? current.configJson ?? null : JSON.stringify(body.configJson),
    });
    return this.repository.findByTenant(current.databaseKey ?? current.slug, current.slug);
  }
}

