ALTER TABLE "ChurchBranding" ADD COLUMN "logoLightUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "logoDarkUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "mobileIconUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarLogoUrl" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarUseImage" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarTitle" TEXT;
ALTER TABLE "ChurchBranding" ADD COLUMN "sidebarSubtitle" TEXT;

UPDATE "ChurchBranding"
SET
  "logoLightUrl" = COALESCE("logoUrl", "logoLightUrl"),
  "logoDarkUrl" = COALESCE("logoUrl", "logoDarkUrl"),
  "sidebarLogoUrl" = COALESCE("logoUrl", "sidebarLogoUrl"),
  "sidebarTitle" = COALESCE("sidebarTitle", (SELECT "name" FROM "Church" WHERE "Church"."id" = "ChurchBranding"."churchId")),
  "sidebarSubtitle" = COALESCE("sidebarSubtitle", 'Gestão de Tarefas');
