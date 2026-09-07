import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getGlobalClient, getTenantClient, closeAllConnections } from '../lib/prisma-factory';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';

/**
 * Teste de Integração para a Autenticação Multi-Tenant.
 * Valida o fluxo de verificação em múltiplos bancos.
 */
describe('Multi-Tenant Authentication', () => {
  const tenantSlug = 'test-auth-church';
  const tenantDatabaseKey = 'test-auth-database';
  const email = 'admin@test.com';
  let databaseDirectory: string;

  beforeAll(async () => {
    databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-auth-'));

    // Aplicar apenas o schema global separado no banco temporario
    const globalDbUrl = `file:${path.join(databaseDirectory, 'global.db')}`;
    execSync(`DATABASE_URL="${globalDbUrl}" npx prisma migrate deploy --schema=prisma/global/schema.prisma`, { stdio: 'inherit' });

    // Aplicar apenas o schema tenant separado no banco temporario
    const tenantDbUrl = `file:${path.join(databaseDirectory, `church_${tenantDatabaseKey}.db`)}`;
    execSync(`DATABASE_URL="${tenantDbUrl}" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`, { stdio: 'inherit' });

    // 1. Popular Global DB
    const globalClient = getGlobalClient(databaseDirectory);
    const church = await globalClient.church.create({
      data: {
        slug: tenantSlug,
        name: 'Test Church',
        databaseKey: tenantDatabaseKey,
      }
    });

    // 2. Criar e popular o usuario no Tenant DB
    const tenantClient = getTenantClient(tenantDatabaseKey, databaseDirectory);
    await tenantClient.user.create({
      data: {
        name: 'Admin User',
        email,
        passwordHash: await bcrypt.hash('123456', 10),
        role: 'ADMIN',
        permissions: 'canteen,settings',
      }
    });
  });

  afterAll(async () => {
    await closeAllConnections();
    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it('deve permitir acesso de um usuário válido com o tenant correto', async () => {
    const globalClient = getGlobalClient(databaseDirectory);
    const church = await globalClient.church.findUnique({ where: { slug: tenantSlug } });
    expect(church?.databaseKey).toBe(tenantDatabaseKey);

    const tenantClient = getTenantClient(tenantDatabaseKey, databaseDirectory);
    const user = await tenantClient.user.findUnique({
      where: { email }
    });

    expect(user).toBeDefined();
    expect(await bcrypt.compare('123456', user!.passwordHash!)).toBe(true);
    expect(user?.role).toBe('ADMIN');
    expect(user?.permissions?.split(',')).toContain('canteen');
  });
});
