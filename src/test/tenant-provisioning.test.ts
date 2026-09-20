import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TenantService } from '../lib/tenant-service';
import { closeAllConnections, getGlobalClient, getTenantClient } from '../lib/prisma-factory';

describe('provisionamento resiliente de tenant', () => {
  let databaseDirectory: string;

  beforeAll(() => {
    databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-provision-'));
    const globalUrl = `file:${path.join(databaseDirectory, 'global.db')}`;
    execSync(`DATABASE_URL="${globalUrl}" npx prisma migrate deploy --schema=prisma/global/schema.prisma`, { stdio: 'pipe' });
  });

  afterAll(async () => {
    await closeAllConnections();
    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it('publica somente depois de migration, admin, seed e integridade', async () => {
    const church = await TenantService.createTenant(
      'Igreja Nova',
      'Igreja Nova',
      'Admin@Igreja.Test',
      '123456',
      { databaseDirectory }
    );

    expect(church.slug).toBe('igreja-nova');
    expect(church.databaseKey).toBe('igreja-nova');
    expect(church.status).toBe('ACTIVE');
    expect(church.active).toBe(true);

    const databasePath = path.join(databaseDirectory, 'church_igreja-nova.db');
    expect(fs.existsSync(databasePath)).toBe(true);
    expect(fs.readdirSync(databaseDirectory).some((file) => file.endsWith('.tmp.db'))).toBe(false);

    const tenant = getTenantClient('igreja-nova', databaseDirectory);
    const admin = await tenant.user.findUnique({ where: { email: 'admin@igreja.test' } });
    expect(admin?.role).toBe('ADMIN');
    expect(admin?.passwordHash).toBeTruthy();
    await tenant.$disconnect();

    const global = getGlobalClient(databaseDirectory);
    const storedChurch = await global.church.findUnique({ where: { slug: 'igreja-nova' } });
    expect(storedChurch?.status).toBe('ACTIVE');
  });

  it('retenta um tenant FAILED reutilizando o mesmo registro global', async () => {
    const global = getGlobalClient(databaseDirectory);
    const failedChurch = await global.church.create({
      data: {
        slug: 'igreja-retry',
        databaseKey: 'igreja-retry',
        name: 'Igreja Retry',
        active: false,
        status: 'FAILED',
      },
    });

    const retriedChurch = await TenantService.createTenant(
      'igreja-retry',
      'Igreja Retry Recuperada',
      'retry@igreja.test',
      '123456',
      { databaseDirectory }
    );

    expect(retriedChurch.id).toBe(failedChurch.id);
    expect(retriedChurch.status).toBe('ACTIVE');
  });

  it('arquiva o banco e remove o client do cache', async () => {
    const church = await TenantService.createTenant(
      'Igreja Arquivada',
      'Igreja Arquivada',
      'archive@igreja.test',
      '123456',
      { databaseDirectory }
    );
    const databasePath = path.join(databaseDirectory, 'church_igreja-arquivada.db');
    const tenant = getTenantClient('igreja-arquivada', databaseDirectory);
    await tenant.user.count();

    const archived = await TenantService.deleteTenant(church.id, { databaseDirectory });

    expect(archived.status).toBe('ARCHIVED');
    expect(archived.active).toBe(false);
    expect(fs.existsSync(databasePath)).toBe(false);
    expect(fs.readdirSync(path.join(databaseDirectory, 'archived'))).toHaveLength(1);
    expect(() => getTenantClient('igreja-arquivada', databaseDirectory)).toThrow(
      'Banco do tenant não encontrado'
    );
  });
});
