import { PrismaClient } from '../src/generated/prisma-global';
import bcrypt from 'bcryptjs';
import path from 'path';

const email = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@teste.com';
const password = process.env.PLATFORM_ADMIN_PASSWORD ?? '123456';
const databaseUrl = process.env.DATABASE_URL ?? `file:${path.resolve(process.cwd(), 'prisma/databases/global.db')}`;

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.platformAdmin.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { passwordHash, active: true },
    create: {
      email: email.trim().toLowerCase(),
      name: 'Administrador da Plataforma',
      passwordHash,
      role: 'SUPER_ADMIN',
      permissions: 'tenant:create,tenant:read,tenant:update,tenant:archive',
      active: true,
    },
  });

  console.log(`Administrador global provisionado: ${email.trim().toLowerCase()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
