import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { PrismaClient as TenantPrismaClient } from '../../src/generated/prisma-tenant';

const tenants = ['igreja-teste', 'ig2', 'ig3'];

const users = [
  {
    email: 'admin.permissoes@tenant.test',
    password: 'admin-123456',
    role: 'ADMIN',
    permissions: 'members:view,members:create,members:update,members:delete,members:manage_access,canteen:view,canteen:manage,canteen:operate,canteen:sell,canteen:manage_products,materials:view,materials:manage,tasks:view,tasks:create,tasks:update,tasks:delete,groups:view,groups:create,groups:update,groups:delete,groups:manage_access,feed:view,feed:publish,feed:share,feed:comment,feed:moderate,settings:view,settings:update',
  },
  {
    email: 'pastor.permissoes@tenant.test',
    password: 'pastor-123456',
    role: 'PASTOR',
    permissions: 'members:view,members:approve,members:manage_access,pastoral:view,pastoral:update,groups:view,groups:manage_access,tasks:view,settings:view,feed:view,feed:moderate',
  },
  {
    email: 'lider.permissoes@tenant.test',
    password: 'lider-123456',
    role: 'LEADER',
    permissions: 'groups:view,groups:update,groups:request,tasks:view,tasks:create,tasks:update,materials:view,materials:update,canteen:view,canteen:operate,feed:view,feed:share',
  },
  {
    email: 'membro.permissoes@tenant.test',
    password: 'membro-123456',
    role: 'MEMBER',
    permissions: 'members:view,groups:view,groups:request,canteen:catalog,canteen:order,feed:view,feed:publish,feed:share,feed:comment,bible:view,games:view,notifications:view,notifications:update',
  },
] as const;

async function main() {
  const directory = path.resolve(
    process.env.CHURCH_DATABASE_DIR ?? path.join(process.cwd(), 'prisma/databases'),
  );
  const clients: TenantPrismaClient[] = [];

  try {
    for (const tenant of tenants) {
      const dbPath = path.join(directory, `church_${tenant}.db`);
      if (!fs.existsSync(dbPath)) throw new Error(`Banco do tenant ausente: ${dbPath}`);

      const client = new TenantPrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
      clients.push(client);

      for (const fixture of users) {
        const existingMember = await client.member.findFirst({
          where: { email: fixture.email, deletedAt: null },
        });
        const member = existingMember ?? await client.member.create({
          data: {
            name: `Fixture ${fixture.role}`,
            email: fixture.email,
            phone: '',
            active: true,
            approved: true,
          },
        });

        await client.user.upsert({
          where: { email: fixture.email },
          update: {
            passwordHash: await bcrypt.hash(fixture.password, 10),
            role: fixture.role,
            permissions: fixture.permissions,
            linkedMemberId: member.id,
            active: true,
            deletedAt: null,
            version: { increment: 1 },
          },
          create: {
            name: `Fixture ${fixture.role}`,
            email: fixture.email,
            passwordHash: await bcrypt.hash(fixture.password, 10),
            role: fixture.role,
            permissions: fixture.permissions,
            linkedMemberId: member.id,
            active: true,
          },
        });
      }
    }

    console.log(`Fixtures granulares criadas para ${users.length} perfis em ${tenants.length} tenants.`);
    console.log('Senha de cada perfil: definida no script seed-permission-fixtures.ts.');
  } finally {
    await Promise.all(clients.map((client) => client.$disconnect()));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
