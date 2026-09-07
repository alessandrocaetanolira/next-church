import { PrismaClient } from '@prisma/client';
import { initialQuizQuestions } from './db-seeds';

/**
 * Popula um novo banco de dados de tenant com dados básicos essenciais.
 * @param prisma Instância do PrismaClient conectada ao banco do tenant.
 */
export async function seedBasicTenantData(prisma: PrismaClient) {
  // 1. Criar Equipes Padrão
  await prisma.team.createMany({
    data: [
      { name: 'Recepção', description: 'Boas-vindas e acolhimento', color: '#3b82f6', icon: 'Users' },
      { name: 'Louvor', description: 'Equipe de música e adoração', color: '#ec4899', icon: 'Music' },
      { name: 'Limpeza', description: 'Manutenção e organização', color: '#10b981', icon: 'Sparkles' },
    ]
  });

  // 2. Criar Perguntas do Quiz
  const quizData = initialQuizQuestions.map(q => ({
    question: q.question,
    options: JSON.stringify(q.options),
    correctIndex: q.correctIndex,
    category: q.category,
    difficulty: q.difficulty,
    points: q.points
  }));

  await prisma.quizQuestion.createMany({
    data: quizData
  });

  // 3. Postagem Inicial no Feed
  await prisma.feedPost.create({
    data: {
      userId: 'system',
      userName: 'Sistema',
      type: 'announcement',
      content: 'Bem-vindos ao aplicativo da nossa igreja! Aqui você encontrará escalas, bíblia, quiz e muito mais.',
      likes: '[]',
      comments: '[]'
    }
  });

  console.log('[TenantSeed] Dados básicos populados com sucesso.');
}
