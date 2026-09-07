import { getGlobalClient } from '@/lib/prisma-factory';

export async function ensureGlobalSchemaExtensions() {
  const prisma = getGlobalClient();
  const churchColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Church")`);
  const churchNames = new Set(churchColumns.map((column) => column.name));

  if (!churchNames.has('logoUrl')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Church" ADD COLUMN "logoUrl" TEXT`);
  }

  if (!churchNames.has('themeVariant')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Church" ADD COLUMN "themeVariant" TEXT DEFAULT 'default'`);
  }

  if (!churchNames.has('themeMode')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Church" ADD COLUMN "themeMode" TEXT DEFAULT 'light'`);
  }
}
