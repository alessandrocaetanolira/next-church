ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarOpenLightUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarOpenDarkUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarCollapsedLightUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarCollapsedDarkUrl" TEXT;

UPDATE "ChurchBranding"
SET
  "sidebarOpenLightUrl" = COALESCE("sidebarOpenLightUrl", "logoLightUrl", "sidebarLogoUrl", "logoUrl"),
  "sidebarOpenDarkUrl" = COALESCE("sidebarOpenDarkUrl", "logoDarkUrl", "sidebarLogoUrl", "logoUrl"),
  "sidebarCollapsedLightUrl" = COALESCE("sidebarCollapsedLightUrl", "logoLightUrl", "sidebarLogoUrl", "logoUrl"),
  "sidebarCollapsedDarkUrl" = COALESCE("sidebarCollapsedDarkUrl", "logoDarkUrl", "sidebarLogoUrl", "logoUrl");
