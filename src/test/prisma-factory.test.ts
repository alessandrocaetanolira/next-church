import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTenantClient, closeAllConnections } from '../lib/prisma-factory';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Teste de Integração para a Prisma Factory.
 * Valida o roteamento para um banco de tenant já provisionado.
 */
describe('Prisma Factory Integration', () => {
  const testTenantId = 'test-church';
  let databaseDirectory: string;
  let dbPath: string;

  beforeAll(() => {
    databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-factory-'));
    dbPath = path.join(databaseDirectory, `church_${testTenantId}.db`);
  });

  afterAll(async () => {
    await closeAllConnections();
    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it('deve rejeitar um tenant sem banco provisionado', () => {
    expect(() => getTenantClient(testTenantId, databaseDirectory)).toThrow('Banco do tenant não encontrado');
    expect(fs.existsSync(dbPath)).toBe(false);
  });

  it('deve instanciar um cliente Prisma para um tenant provisionado', () => {
    fs.writeFileSync(dbPath, Buffer.from('SQLite format 3\u0000'));
    const client = getTenantClient(testTenantId, databaseDirectory);
    expect(client).toBeDefined();
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('deve retornar a mesma instância para o mesmo tenant (cache)', () => {
    const client1 = getTenantClient(testTenantId, databaseDirectory);
    const client2 = getTenantClient(testTenantId, databaseDirectory);
    expect(client1).toBe(client2);
  });
});
