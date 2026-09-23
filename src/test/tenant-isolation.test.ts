import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getGlobalClient, getTenantClient, closeAllConnections } from '../lib/prisma-factory';
import { TenantService } from '../lib/tenant-service';

describe('Tenant isolation with three churches', () => {
  const tenants = [
    { slug: 'igreja-teste', password: 'igreja-123456', role: 'ADMIN' },
    { slug: 'ig2', password: 'ig2-123456', role: 'PASTOR' },
    { slug: 'ig3', password: 'ig3-123456', role: 'LEADER' },
  ] as const;
  const email = 'shared@tenant.test';
  let databaseDirectory: string;

  beforeAll(async () => {
    databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-isolation-'));
    execSync(
      `DATABASE_URL="file:${path.join(databaseDirectory, 'global.db')}" npx prisma migrate deploy --schema=prisma/global/schema.prisma`,
      { stdio: 'ignore' }
    );

    const global = getGlobalClient(databaseDirectory);
    for (const tenant of tenants) {
      await global.church.create({
        data: {
          slug: tenant.slug,
          databaseKey: tenant.slug,
          name: tenant.slug,
          status: 'ACTIVE',
        },
      });
      execSync(
        `DATABASE_URL="file:${path.join(databaseDirectory, `church_${tenant.slug}.db`)}" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`,
        { stdio: 'ignore' }
      );
      const client = getTenantClient(tenant.slug, databaseDirectory);
      await client.user.create({
        data: {
          name: tenant.slug,
          email,
          passwordHash: await bcrypt.hash(tenant.password, 10),
          role: tenant.role,
          permissions: tenant.role.toLowerCase(),
        },
      });
    }
  }, 30_000);

  afterAll(async () => {
    await closeAllConnections();
    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it('autentica o mesmo email com credenciais independentes por tenant', async () => {
    for (const tenant of tenants) {
      const client = getTenantClient(tenant.slug, databaseDirectory);
      const user = await client.user.findUnique({ where: { email } });
      expect(user?.role).toBe(tenant.role);
      expect(await bcrypt.compare(tenant.password, user?.passwordHash ?? '')).toBe(true);
      expect(await bcrypt.compare('wrong-password', user?.passwordHash ?? '')).toBe(false);
    }
  });

  it('mantem dados operacionais isolados entre os tres tenants', async () => {
    const source = getTenantClient('igreja-teste', databaseDirectory);
    await source.member.create({
      data: { name: 'Somente Teste', email: 'only@test.test', phone: '11999999999' },
    });
    await source.product.create({
      data: { name: 'Produto somente teste', price: 10, cost: 5, category: 'fixture' },
    });

    for (const tenant of tenants.slice(1)) {
      const client = getTenantClient(tenant.slug, databaseDirectory);
      expect(await client.member.count()).toBe(0);
      expect(await client.product.count()).toBe(0);
    }
  });

  it('nao cria banco para tenant ausente e rejeita arquivo vazio', async () => {
    const missingPath = path.join(databaseDirectory, 'church-ausente.db');
    expect(() => getTenantClient('ausente', databaseDirectory)).toThrow('Banco do tenant não encontrado');
    expect(fs.existsSync(missingPath)).toBe(false);

    const emptyPath = path.join(databaseDirectory, 'church_vazio.db');
    fs.writeFileSync(emptyPath, '');
    expect(() => getTenantClient('vazio', databaseDirectory)).toThrow('Banco do tenant inválido ou vazio');
  });

  it('bloqueia tenant inativo sem afetar os demais', async () => {
    const global = getGlobalClient(databaseDirectory);
    const church = await global.church.findUniqueOrThrow({ where: { slug: 'ig2' } });

    await TenantService.updateTenant(
      church.id,
      { active: false },
      { databaseDirectory }
    );

    const inactive = await global.church.findUniqueOrThrow({ where: { slug: 'ig2' } });
    expect(inactive.active).toBe(false);
    expect((await getTenantClient('igreja-teste', databaseDirectory).member.count())).toBe(1);

    await TenantService.updateTenant(
      church.id,
      { active: true },
      { databaseDirectory }
    );
  });

  it('arquiva um tenant sem deixar o banco acessível', async () => {
    const global = getGlobalClient(databaseDirectory);
    const church = await global.church.findUniqueOrThrow({ where: { slug: 'ig3' } });
    const databasePath = path.join(databaseDirectory, 'church_ig3.db');

    const archived = await TenantService.deleteTenant(church.id, { databaseDirectory });

    expect(archived.status).toBe('ARCHIVED');
    expect(archived.active).toBe(false);
    expect(fs.existsSync(databasePath)).toBe(false);
    expect(fs.readdirSync(path.join(databaseDirectory, 'archived'))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^church_ig3_\d+\.db\.bak$/)])
    );
    expect(() => getTenantClient('ig3', databaseDirectory)).toThrow('Banco do tenant não encontrado');
  });
});
