import type { PrismaClient as GlobalPrismaClient } from '@/generated/prisma-global';

export type BrandingRow = Record<string, any>;

export class BrandingRepository {
  constructor(private readonly prisma: GlobalPrismaClient) {}

  async findByTenant(tenantId: string, tenantSlug?: string | null) {
    const [row] = await this.prisma.$queryRawUnsafe<BrandingRow[]>(
      `SELECT c.id, c.slug, c.name, c.logoUrl, c.themeVariant, c.themeMode,
              b.logoUrl AS brandingLogoUrl, b.logoLightUrl, b.logoDarkUrl, b.mobileIconUrl, b.sidebarLogoUrl,
              b.sidebarUseImage, b.sidebarTitle, b.sidebarSubtitle, b.sidebarOpenLightUrl, b.sidebarOpenDarkUrl,
              b.sidebarCollapsedLightUrl, b.sidebarCollapsedDarkUrl, b.pwaName, b.pwaShortName, b.icon192Url, b.icon512Url,
              b.primaryColor, b.secondaryColor, b.themeColor, b.backgroundColor, b.configJson,
              b.schemaVersion, b.brandingVersion
         FROM "Church" c LEFT JOIN "ChurchBranding" b ON b.churchId = c.id
        WHERE (c.databaseKey = ? OR c.slug = ?) AND c.deletedAt IS NULL LIMIT 1`,
      tenantId, tenantSlug ?? tenantId,
    );
    return row ?? null;
  }

  async findByChurchId(churchId: string) {
    const [row] = await this.prisma.$queryRawUnsafe<BrandingRow[]>(
      `SELECT c.id, c.slug, c.name, c.logoUrl, c.themeVariant, c.themeMode,
              b.logoUrl AS brandingLogoUrl, b.logoLightUrl, b.logoDarkUrl, b.mobileIconUrl, b.sidebarLogoUrl,
              b.sidebarUseImage, b.sidebarTitle, b.sidebarSubtitle, b.sidebarOpenLightUrl, b.sidebarOpenDarkUrl,
              b.sidebarCollapsedLightUrl, b.sidebarCollapsedDarkUrl, b.pwaName, b.pwaShortName, b.icon192Url, b.icon512Url,
              b.primaryColor, b.secondaryColor, b.themeColor, b.backgroundColor, b.configJson,
              b.schemaVersion, b.brandingVersion
         FROM "Church" c LEFT JOIN "ChurchBranding" b ON b.churchId = c.id
        WHERE c.id = ? AND c.deletedAt IS NULL LIMIT 1`, churchId,
    );
    return row ?? null;
  }

  async findPublic(slug: string) {
    const [row] = await this.prisma.$queryRawUnsafe<BrandingRow[]>(
      `SELECT c.id, c.slug, c.name, c.logoUrl, c.themeVariant, c.themeMode, c.active,
              b.logoUrl AS brandingLogoUrl, b.logoLightUrl, b.logoDarkUrl, b.mobileIconUrl, b.sidebarLogoUrl,
              b.sidebarUseImage, b.sidebarTitle, b.sidebarSubtitle, b.sidebarOpenLightUrl, b.sidebarOpenDarkUrl,
              b.sidebarCollapsedLightUrl, b.sidebarCollapsedDarkUrl, b.pwaName, b.pwaShortName, b.icon192Url, b.icon512Url,
              b.primaryColor, b.secondaryColor, b.themeColor, b.backgroundColor, b.brandingVersion
         FROM "Church" c LEFT JOIN "ChurchBranding" b ON b.churchId = c.id
        WHERE c.slug = ? AND c.deletedAt IS NULL LIMIT 1`, slug,
    );
    return row ?? null;
  }

  async update(churchId: string, data: Record<string, unknown>) {
    const now = new Date().toISOString();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`UPDATE "Church" SET name = ?, logoUrl = ?, themeVariant = ?, updatedAt = ? WHERE id = ?`, data.name, data.logoUrl, data.themeVariant, now, churchId);
      await tx.$executeRawUnsafe(
        `INSERT INTO "ChurchBranding" (id, churchId, pwaName, pwaShortName, logoUrl, logoLightUrl, logoDarkUrl, mobileIconUrl, sidebarLogoUrl, sidebarOpenLightUrl, sidebarOpenDarkUrl, sidebarCollapsedLightUrl, sidebarCollapsedDarkUrl, sidebarUseImage, sidebarTitle, sidebarSubtitle, icon192Url, icon512Url, primaryColor, secondaryColor, themeColor, backgroundColor, configJson, schemaVersion, brandingVersion, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
         ON CONFLICT(churchId) DO UPDATE SET pwaName=excluded.pwaName, pwaShortName=excluded.pwaShortName, logoUrl=excluded.logoUrl, logoLightUrl=excluded.logoLightUrl, logoDarkUrl=excluded.logoDarkUrl, mobileIconUrl=excluded.mobileIconUrl, sidebarLogoUrl=excluded.sidebarLogoUrl, sidebarOpenLightUrl=excluded.sidebarOpenLightUrl, sidebarOpenDarkUrl=excluded.sidebarOpenDarkUrl, sidebarCollapsedLightUrl=excluded.sidebarCollapsedLightUrl, sidebarCollapsedDarkUrl=excluded.sidebarCollapsedDarkUrl, sidebarUseImage=excluded.sidebarUseImage, sidebarTitle=excluded.sidebarTitle, sidebarSubtitle=excluded.sidebarSubtitle, icon192Url=excluded.icon192Url, icon512Url=excluded.icon512Url, primaryColor=excluded.primaryColor, secondaryColor=excluded.secondaryColor, themeColor=excluded.themeColor, backgroundColor=excluded.backgroundColor, configJson=excluded.configJson, brandingVersion="ChurchBranding".brandingVersion + 1, updatedAt=excluded.updatedAt`,
        `branding_${churchId}`, churchId, data.pwaName, data.pwaShortName, data.logoUrl, data.logoLightUrl, data.logoDarkUrl, data.mobileIconUrl, data.sidebarLogoUrl, data.sidebarOpenLightUrl, data.sidebarOpenDarkUrl, data.sidebarCollapsedLightUrl, data.sidebarCollapsedDarkUrl, data.sidebarUseImage, data.sidebarTitle, data.sidebarSubtitle, data.icon192Url, data.icon512Url, data.primaryColor, data.secondaryColor, data.themeColor, data.backgroundColor, data.configJson, now, now,
      );
    });
  }
}
