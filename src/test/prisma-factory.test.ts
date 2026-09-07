import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTenantClient, closeAllConnections } from '../lib/prisma-factory';
import fs from 'fs';
import path from 'path';

/**
 * Teste de Integração para a Prisma Factory.
 * Valida a criação dinâmica de bancos de dados por Tenant.
 */
describe('Prisma Factory Integration', () => {
  const testTenantId = 'test-church';
  const dbPath = path.join(process.cwd(), 'prisma/databases', `church_${testTenantId}.db`);

  beforeAll(() => {
    // Garante que o diretório exista
    const dir = path.join(process.cwd(), 'prisma/databases');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Cria um template vazio para o teste
    const templatePath = path.join(process.cwd(), 'prisma/databases', 'church_template.db');
    if (!fs.existsSync(templatePath)) fs.writeFileSync(templatePath, '');
  });

  afterAll(async () => {
    await closeAllConnections();
    // Limpa o banco de teste
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('deve instanciar um cliente Prisma para um novo tenant', () => {
    const client = getTenantClient(testTenantId);
    expect(client).toBeDefined();
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('deve retornar a mesma instância para o mesmo tenant (cache)', () => {
    const client1 = getTenantClient(testTenantId);
    const client2 = getTenantClient(testTenantId);
    expect(client1).toBe(client2);
  });
});
