import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../../src/generated/prisma-tenant';
import { seedTenantStructure } from '../../src/lib/tenant-seed';

const slug = process.argv[2];
if (!slug) throw new Error('Informe o slug do tenant. Ex.: npx tsx prisma/scripts/seed-tenant-quiz.ts igreja-teste');

const directory = path.resolve(process.env.CHURCH_DATABASE_DIR ?? path.join(process.cwd(), 'prisma/databases'));
const file = path.join(directory, `church_${slug}.db`);
if (!fs.existsSync(file)) throw new Error(`Banco do tenant ausente: ${file}`);

const prisma = new PrismaClient({ datasources: { db: { url: `file:${file}` } } });
seedTenantStructure(prisma).finally(() => prisma.$disconnect()).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
