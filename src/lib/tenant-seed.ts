import { PrismaClient } from '../../src/generated/prisma-tenant';

/**
 * Reserva o ponto de extensão para dados estruturais de um novo tenant.
 *
 * Dados de demonstração — equipes, perguntas de quiz, posts e conteúdo bíblico —
 * não devem ser criados durante o provisionamento. Eles pertencem a fixtures ou
 * aos respectivos bancos compartilhados.
 * @param prisma Instância do PrismaClient conectada ao banco do tenant.
 */
export async function seedTenantStructure(_prisma: PrismaClient) {
  console.log('[TenantSeed] Estrutura inicial validada; nenhum dado de demonstração foi criado.');
}
