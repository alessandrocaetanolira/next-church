import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getGlobalClient, getTenantClient, closeAllConnections } from '../lib/prisma-factory';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Teste de Integração para a Autenticação Multi-Tenant.
 * Valida o fluxo de verificação em múltiplos bancos.
 */
describe('Multi-Tenant Authentication', () => {
  const tenantSlug = 'test-auth-church';
  const email = 'admin@test.com';

  beforeAll(async () => {
    const dbDir = path.join(process.cwd(), 'prisma/databases');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    // Injetar schema no Global DB
    const globalDbUrl = `file:${path.join(dbDir, 'global.db')}`;
    execSync(`DATABASE_URL="${globalDbUrl}" npx prisma db push --skip-generate`, { stdio: 'inherit' });

    // Injetar schema no Tenant DB
    const tenantDbUrl = `file:${path.join(dbDir, `church_${tenantSlug}.db`)}`;
    execSync(`DATABASE_URL="${tenantDbUrl}" npx prisma db push --skip-generate`, { stdio: 'inherit' });

    // 1. Popular Global DB
    const globalClient = getGlobalClient();
    const church = await globalClient.church.create({
      data: {
        slug: tenantSlug,
        name: 'Test Church',
      }
    });
    await globalClient.globalUser.create({
      data: {
        email,
        password: '123456',
        churchId: church.id,
      }
    });

    // 2. Criar e Popular Tenant DB
    const tenantClient = getTenantClient(tenantSlug);
    // Nota: Como o schema é o mesmo, o Prisma Client gerado tem todos os modelos.
    // Mas no banco físico, as tabelas precisam existir.
    // Em um cenário real, o script de sync-tenants cuidaria disso.
    // Para o teste, usamos o banco já "migrado" ou injetamos o schema.
    
    // Simplificando o teste para validar a lógica de roteamento entre bancos:
    await tenantClient.user.create({
      data: {
        name: 'Admin User',
        email,
        role: 'ADMIN',
        permissions: 'canteen,settings',
      }
    });
  });

  afterAll(async () => {
    await closeAllConnections();
    // Limpar arquivos .db de teste
    const dir = path.join(process.cwd(), 'prisma/databases');
    if (fs.existsSync(path.join(dir, 'global.db'))) fs.unlinkSync(path.join(dir, 'global.db'));
    if (fs.existsSync(path.join(dir, `church_${tenantSlug}.db`))) fs.unlinkSync(path.join(dir, `church_${tenantSlug}.db`));
  });

  it('deve permitir acesso de um usuário válido com o tenant correto', async () => {
    const globalClient = getGlobalClient();
    const globalUser = await globalClient.globalUser.findUnique({
      where: { email },
      include: { church: true }
    });

    expect(globalUser).toBeDefined();
    expect(globalUser?.church.slug).toBe(tenantSlug);

    const tenantClient = getTenantClient(globalUser!.church.slug);
    const user = await tenantClient.user.findUnique({
      where: { email }
    });

    expect(user).toBeDefined();
    expect(user?.role).toBe('ADMIN');
    expect(user?.permissions?.split(',')).toContain('canteen');
  });
});
