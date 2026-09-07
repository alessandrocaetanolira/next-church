-- Extensões de schema usadas pelos módulos já migrados no Next.js.
-- Observação: como a aplicação usa um banco global e múltiplos bancos de tenant,
-- este arquivo serve como referência para provisionamento/ajuste dos tenants.

ALTER TABLE "Member" ADD COLUMN "parentPhone" TEXT;
ALTER TABLE "Member" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "Member" ADD COLUMN "conversionDate" DATETIME;
ALTER TABLE "Member" ADD COLUMN "baptismDate" DATETIME;
ALTER TABLE "Member" ADD COLUMN "previousChurch" TEXT;
ALTER TABLE "Member" ADD COLUMN "aboutMe" TEXT;
ALTER TABLE "Member" ADD COLUMN "maritalStatus" TEXT;
ALTER TABLE "Member" ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "Product" ADD COLUMN "availableToday" BOOLEAN DEFAULT 1;

ALTER TABLE "Team" ADD COLUMN "leaderIds" TEXT;
