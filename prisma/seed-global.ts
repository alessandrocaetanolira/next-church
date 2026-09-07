import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./databases/global.db',
    },
  },
});

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Criar Igreja
  const church = await prisma.church.upsert({
    where: { slug: 'igreja-teste' },
    update: {},
    create: {
      name: 'Igreja Teste',
      slug: 'igreja-teste',
      active: true,
    },
  });

  // Criar Usuário Global
  await prisma.globalUser.upsert({
    where: { email: 'admin@teste.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@teste.com',
      password: hashedPassword,
      churchId: church.id,
    },
  });

  console.log('Seed realizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
