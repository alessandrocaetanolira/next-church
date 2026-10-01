import { PrismaClient } from '../../src/generated/prisma-tenant';
import { initialQuizQuestions } from './db-seeds';

/**
 * Reserva o ponto de extensão para dados estruturais de um novo tenant.
 *
 * Perguntas são conteúdo estrutural: o desafio online roda no servidor e não
 * consegue acessar as perguntas que ficam no Dexie do navegador. O seed é
 * idempotente e não cria usuários, equipes ou publicações de demonstração.
 * @param prisma Instância do PrismaClient conectada ao banco do tenant.
 */
export async function seedTenantStructure(prisma: PrismaClient) {
  const existing = await prisma.quizQuestion.findMany({ select: { question: true } });
  const known = new Set(existing.map((item) => item.question));
  const missing = initialQuizQuestions.filter((item) => !known.has(item.question));
  if (missing.length) {
    await prisma.quizQuestion.createMany({
      data: missing.map((item) => ({
        question: item.question,
        options: JSON.stringify(item.options),
        correctIndex: item.correctIndex,
        category: item.category,
        difficulty: item.difficulty,
        points: item.points,
      })),
    });
  }
  console.log(`[TenantSeed] Estrutura inicial validada; ${missing.length} perguntas de quiz adicionadas.`);
}
