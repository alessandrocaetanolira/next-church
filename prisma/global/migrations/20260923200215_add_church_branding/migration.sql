-- CreateTable
CREATE TABLE "ChurchBranding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "churchId" TEXT NOT NULL,
    "pwaName" TEXT,
    "pwaShortName" TEXT,
    "logoUrl" TEXT,
    "icon192Url" TEXT,
    "icon512Url" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "themeColor" TEXT,
    "backgroundColor" TEXT,
    "configJson" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "brandingVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChurchBranding_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ChurchBranding_churchId_key" ON "ChurchBranding"("churchId");

-- Backfill the new relation from the legacy logo field without overriding the
-- existing Church record. A NULL pwaName intentionally falls back to Church.name.
INSERT INTO "ChurchBranding" ("id", "churchId", "logoUrl", "updatedAt")
SELECT 'branding_' || "id", "id", "logoUrl", CURRENT_TIMESTAMP
FROM "Church"
WHERE NOT EXISTS (
    SELECT 1 FROM "ChurchBranding" AS "existing"
    WHERE "existing"."churchId" = "Church"."id"
);
