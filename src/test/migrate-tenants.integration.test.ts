import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getGlobalClient, getTenantClient, closeAllConnections } from '../lib/prisma-factory';
import { migrateTenants } from '../../prisma/scripts/migrate-tenants';

describe('orquestrador de migrations tenant', () => {
  let databaseDirectory: string;
  const originalArgv = process.argv;

  beforeAll(async () => {
    databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-migrate-'));
    const globalUrl = `file:${path.join(databaseDirectory, 'global.db')}`;
    execSync(`DATABASE_URL="${globalUrl}" npx prisma migrate deploy --schema=prisma/global/schema.prisma`, { stdio: 'pipe' });

    const goodKey = 'tenant-good';
    const goodUrl = `file:${path.join(databaseDirectory, `church_${goodKey}.db`)}`;
    execSync(`DATABASE_URL="${goodUrl}" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`, { stdio: 'pipe' });

    const global = getGlobalClient(databaseDirectory);
    await global.church.createMany({
      data: [
        { slug: 'igreja-boa', databaseKey: goodKey, name: 'Igreja boa' },
        { slug: 'igreja-quebrada', databaseKey: 'tenant-broken', name: 'Igreja quebrada' },
      ],
    });
    fs.writeFileSync(path.join(databaseDirectory, 'church_tenant-broken.db'), 'arquivo invalido');
  });

  afterAll(async () => {
    process.argv = originalArgv;
    await closeAllConnections();
    fs.rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it('continua apos falha isolada e permite retry do tenant corrigido', async () => {
    process.argv = ['node', 'migrate-tenants.ts', '--dir', databaseDirectory, '--backup-dir', path.join(databaseDirectory, 'backup')];
    const firstRun = await migrateTenants({ setExitCode: false });

    expect(firstRun.summary.migrated).toBe(1);
    expect(firstRun.summary.failed).toBe(1);
    expect(firstRun.results.find((result) => result.slug === 'igreja-quebrada')?.status).toBe('failed');

    fs.rmSync(path.join(databaseDirectory, 'church_tenant-broken.db'));
    const brokenUrl = `file:${path.join(databaseDirectory, 'church_tenant-broken.db')}`;
    execSync(`DATABASE_URL="${brokenUrl}" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`, { stdio: 'pipe' });

    process.argv = ['node', 'migrate-tenants.ts', '--dir', databaseDirectory, '--tenant', 'tenant-broken', '--backup-dir', path.join(databaseDirectory, 'backup-retry')];
    const retry = await migrateTenants({ setExitCode: false });
    expect(retry.summary.migrated).toBe(1);
    expect(retry.summary.failed).toBe(0);
  });

  it('dry-run nao altera os arquivos dos tenants selecionados', async () => {
    const tenantPath = path.join(databaseDirectory, 'church_tenant-good.db');
    const before = crypto.createHash('sha256').update(fs.readFileSync(tenantPath)).digest('hex');
    process.argv = ['node', 'migrate-tenants.ts', '--dry-run', '--dir', databaseDirectory];
    const report = await migrateTenants({ setExitCode: false });
    const after = crypto.createHash('sha256').update(fs.readFileSync(tenantPath)).digest('hex');

    expect(report.summary.dryRun).toBe(2);
    expect(report.summary.failed).toBe(0);
    expect(after).toBe(before);
  });
});
