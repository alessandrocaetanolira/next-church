import { PrismaClient } from '../src/generated/prisma-global';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? `file:${process.cwd()}/prisma/databases/global.db` } },
});

const plans = [
  {
    code: 'FREE',
    name: 'Gratuito',
    description: 'Recursos essenciais para começar.',
    priceCents: 0,
    maxUsers: 50,
    maxStorageMb: 500,
    features: JSON.stringify(['dashboard', 'members', 'groups', 'bible', 'feed', 'notifications']),
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    description: 'Recursos completos para igrejas em crescimento.',
    priceCents: 9900,
    maxUsers: 1000,
    maxStorageMb: 10000,
    features: JSON.stringify([
      'dashboard', 'members', 'groups', 'canteen', 'pastoral', 'materials', 'tasks', 'games',
      'kids', 'parking', 'social_projects', 'feed', 'bible', 'notifications', 'offline_sync',
      'engagement', 'settings',
    ]),
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }
  console.log('Planos padrão provisionados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
