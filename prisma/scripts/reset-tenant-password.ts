import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../../src/generated/prisma-tenant';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const tenant = argument('tenant');
const email = argument('email')?.trim().toLowerCase();
const password = argument('password');

if (!tenant || !email || !password || password.length < 6 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenant)) {
  throw new Error('Uso: npx tsx prisma/scripts/reset-tenant-password.ts --tenant igreja-teste --email admin@teste.com --password 123456');
}

const validatedTenant = tenant;
const validatedEmail = email;
const validatedPassword = password;

const directory = path.resolve(process.env.CHURCH_DATABASE_DIR ?? path.join(process.cwd(), 'prisma/databases'));
const dbPath = path.join(directory, `church_${validatedTenant}.db`);

async function main() {
  if (!fs.existsSync(dbPath)) throw new Error(`Banco do tenant não encontrado: ${dbPath}`);

  const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
  try {
    const user = await prisma.user.findUnique({ where: { email: validatedEmail }, select: { id: true } });
    if (!user) throw new Error(`Usuário não encontrado no tenant ${validatedTenant}: ${validatedEmail}`);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(validatedPassword, 10), active: true, version: { increment: 1 } },
    });
    console.log(`Senha atualizada para ${validatedEmail} no tenant ${validatedTenant}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
