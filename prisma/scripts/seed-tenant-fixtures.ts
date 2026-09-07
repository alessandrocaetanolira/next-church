import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { PrismaClient as TenantPrismaClient } from '../../src/generated/prisma-tenant';

const fixtures = [
  { slug: 'igreja-teste', password: 'igreja-teste-123', role: 'ADMIN', permissions: 'settings,canteen' },
  { slug: 'ig2', password: 'ig2-123456', role: 'PASTOR', permissions: 'pastor,teams' },
  { slug: 'ig3', password: 'ig3-123456', role: 'LEADER', permissions: 'teams,materials' },
] as const;

const email = 'shared@tenant.test';

async function main() {
  const directory = path.resolve(
    process.env.CHURCH_DATABASE_DIR ?? path.join(process.cwd(), 'prisma/databases')
  );
  const clients: TenantPrismaClient[] = [];

  try {
    for (const fixture of fixtures) {
      const dbPath = path.join(directory, `church_${fixture.slug}.db`);
      if (!fs.existsSync(dbPath)) throw new Error(`Banco do tenant ausente: ${dbPath}`);

      const client = new TenantPrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      clients.push(client);
      await client.user.upsert({
        where: { email },
        update: {
          passwordHash: await bcrypt.hash(fixture.password, 10),
          role: fixture.role,
          permissions: fixture.permissions,
          active: true,
          version: { increment: 1 },
        },
        create: {
          name: `Fixture ${fixture.slug}`,
          email,
          passwordHash: await bcrypt.hash(fixture.password, 10),
          role: fixture.role,
          permissions: fixture.permissions,
          active: true,
        },
      });
    }
    console.log(`Fixtures de autenticacao criadas para ${fixtures.length} tenants: ${email}`);
  } finally {
    await Promise.all(clients.map((client) => client.$disconnect()));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
