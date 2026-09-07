import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';

async function main() {
  const email = 'admin@teste.com';
  const password = '123456';
  const churchSlug = 'igreja-teste';
  
  console.log('🚀 Iniciando Seed Completa...');

  // Caminhos Absolutos
  const globalDbPath = `file:${path.resolve(process.cwd(), 'prisma/databases/global.db')}`;
  const tenantDbPath = `file:${path.resolve(process.cwd(), `prisma/databases/church_${churchSlug}.db`)}`;

  // --- 1. CONFIGURAR BANCO GLOBAL ---
  console.log(`- Conectando ao Banco Global: ${globalDbPath}`);
  const globalPrisma = new PrismaClient({
    datasources: { db: { url: globalDbPath } }
  });

  try {
    const church = await globalPrisma.church.upsert({
      where: { slug: churchSlug },
      update: {},
      create: {
        slug: churchSlug,
        name: 'Igreja Teste',
        plan: 'PREMIUM',
        active: true,
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    await globalPrisma.globalUser.upsert({
      where: { email },
      update: { password: hashedPassword },
      create: {
        email,
        password: hashedPassword,
        churchId: church.id,
      },
    });
    console.log('✅ Banco Global populado.');
  } finally {
    await globalPrisma.$disconnect();
  }

  // --- 2. CONFIGURAR BANCO DO TENANT ---
  console.log(`- Conectando ao Banco do Tenant: ${tenantDbPath}`);
  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: tenantDbPath } }
  });

  try {
    await tenantPrisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: 'Administrador',
        email,
        role: 'ADMIN',
        permissions: 'CANTEEN,TASKS,TEAMS,MATERIALS,PASTOR_AREA',
        active: true,
      },
    });

    // --- MEMBROS ---
    const memberCount = await tenantPrisma.member.count();
    if (memberCount === 0) {
      await tenantPrisma.member.createMany({
        data: [
          { name: 'João Silva', email: 'joao@igreja.com', phone: '11999999999', approved: true },
          { name: 'Maria Santos', email: 'maria@igreja.com', phone: '11988888888', approved: true },
          { name: 'Pedro Oliveira', email: 'pedro@igreja.com', phone: '11977777777', approved: true },
        ]
      });
      console.log('✅ Membros criados.');
    }

    // --- PRODUTOS ---
    const productCount = await tenantPrisma.product.count();
    if (productCount === 0) {
      await tenantPrisma.product.createMany({
        data: [
          { name: 'Água Mineral', price: 3.0, cost: 1.5, stock: 100, category: 'Bebidas' },
          { name: 'Suco de Uva', price: 8.0, cost: 4.0, stock: 50, category: 'Bebidas' },
          { name: 'Salgado Assado', price: 6.0, cost: 3.0, stock: 30, category: 'Comida' },
        ]
      });
      console.log('✅ Produtos criados.');
    }

    // --- TIMES ---
    const teamCount = await tenantPrisma.team.count();
    if (teamCount === 0) {
      await tenantPrisma.team.createMany({
        data: [
          { name: 'Recepção', description: 'Boas-vindas e acolhimento', color: '#3b82f6', icon: 'Users' },
          { name: 'Música', description: 'Louvor e adoração', color: '#ec4899', icon: 'Music' },
          { name: 'Mídia', description: 'Som e projeção', color: '#10b981', icon: 'Video' },
        ]
      });
      console.log('✅ Times criados.');
    }

    // --- QUIZ ---
    const quizCount = await tenantPrisma.quizQuestion.count();
    if (quizCount === 0) {
      await tenantPrisma.quizQuestion.createMany({
        data: [
          { question: 'Quem construiu a arca?', options: JSON.stringify(['Moisés', 'Noé', 'Abraão', 'Davi']), correctIndex: 1, category: 'Antigo Testamento', difficulty: 'easy', points: 10 },
          { question: 'Quantos discípulos Jesus teve?', options: JSON.stringify(['10', '11', '12', '13']), correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
          { question: 'Quem matou Golias?', options: JSON.stringify(['Saul', 'Davi', 'Josué', 'Sansão']), correctIndex: 1, category: 'Antigo Testamento', difficulty: 'easy', points: 10 },
          { question: 'Qual o primeiro livro da Bíblia?', options: JSON.stringify(['Êxodo', 'Gênesis', 'Salmos', 'Mateus']), correctIndex: 1, category: 'Geral', difficulty: 'easy', points: 10 },
          { question: 'Em que cidade Jesus nasceu?', options: JSON.stringify(['Nazaré', 'Jerusalém', 'Belém', 'Cafarnaum']), correctIndex: 2, category: 'Novo Testamento', difficulty: 'easy', points: 10 },
        ]
      });
      console.log('✅ Perguntas do Quiz criadas.');
    }

    // --- FEED ---
    const feedCount = await tenantPrisma.feedPost.count();
    if (feedCount === 0) {
      await tenantPrisma.feedPost.createMany({
        data: [
          { userId: 'system', userName: 'Igreja Teste', type: 'announcement', content: 'Bem-vindos ao nosso novo app!', likes: '[]', comments: '[]' },
          { userId: 'system', userName: 'Pastor Local', type: 'verse', content: 'O Senhor é o meu pastor; nada me faltará.', reference: 'Salmos 23:1', likes: '[]', comments: '[]' },
        ]
      });
      console.log('✅ Postagens iniciais criadas.');
    }

    console.log(`✅ Banco do Tenant (${churchSlug}) populado.`);
  } finally {
    await tenantPrisma.$disconnect();
  }

  console.log('✨ Seed finalizada com sucesso!');
}

main().catch((e) => {
  console.error('❌ Erro no Seed:', e);
  process.exit(1);
});
