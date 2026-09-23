import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PrismaClient } from '../../src/generated/prisma-global';

type ChurchRecord = {
  slug: string;
  databaseKey: string | null;
  status: string | null;
  active: boolean;
};

type TenantResult = {
  slug: string;
  databaseKey: string;
  file: string;
  status: 'dry-run' | 'migrated' | 'failed' | 'skipped';
  durationMs: number;
  backup?: string;
  error?: string;
};

export type TenantSelectionOptions = {
  includeArchived?: boolean;
  requestedTenants?: Set<string> | null;
};

const SQLITE_HEADER = 'SQLite format 3\u0000';
const TENANT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function getDatabaseDirectory() {
  return path.resolve(
    getOption('--dir') ??
      process.env.CHURCH_DATABASE_DIR ??
      path.join(process.cwd(), 'prisma/databases')
  );
}

function getRequestedTenants() {
  const value = getOption('--tenant') ?? getOption('--tenants');
  return value ? new Set(value.split(',').map((item) => item.trim()).filter(Boolean)) : null;
}

export function resolveDatabaseKey(church: Pick<ChurchRecord, 'slug' | 'databaseKey'>) {
  const databaseKey = church.databaseKey ?? church.slug;
  if (!TENANT_KEY_PATTERN.test(databaseKey)) {
    throw new Error(`Identificador de tenant inválido: ${databaseKey}`);
  }
  return databaseKey;
}

export function selectChurches(churches: ChurchRecord[], options: TenantSelectionOptions = {}) {
  const { includeArchived = false, requestedTenants = null } = options;
  return churches.filter((church) => {
    const eligibleStatus = ['ACTIVE', 'PROVISIONING', 'FAILED'].includes(church.status ?? '') ||
      (church.status === null && church.active);
    if (!includeArchived && !eligibleStatus) return false;
    return !requestedTenants || requestedTenants.has(church.slug) || requestedTenants.has(resolveDatabaseKey(church));
  });
}

function hasSQLiteHeader(filePath: string) {
  const handle = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(16);
  try {
    return fs.readSync(handle, header, 0, 16, 0) === 16 && header.toString() === SQLITE_HEADER;
  } finally {
    fs.closeSync(handle);
  }
}

function acquireLock(directory: string) {
  const lockPath = path.join(directory, '.tenant-migrations.lock');
  try {
    const handle = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(handle, `${JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: new Date().toISOString() })}\n`);
    fs.closeSync(handle);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Migration de tenants ja em execucao: ${lockPath}`);
    }
    throw error;
  }

  return () => {
    try {
      fs.unlinkSync(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  };
}

function backupDatabase(sourcePath: string, backupDirectory: string, databaseKey: string) {
  fs.mkdirSync(backupDirectory, { recursive: true });
  const destinationPath = path.join(backupDirectory, `church_${databaseKey}.db`);
  execFileSync('sqlite3', [sourcePath, `.backup '${destinationPath.replace(/'/g, "''")}'`], {
    stdio: 'pipe',
  });
  return destinationPath;
}

function getBackupDirectory(databaseDirectory: string) {
  const configured = getOption('--backup-dir');
  if (configured) return path.resolve(configured);
  return fs.mkdtempSync(path.join(databaseDirectory, '.tenant-migration-backup-'));
}

async function checkIntegrity(filePath: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${filePath}` } } });
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check');
    return rows[0]?.integrity_check === 'ok';
  } finally {
    await prisma.$disconnect();
  }
}

function runMigration(databasePath: string) {
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema=prisma/tenant/schema.prisma'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
    stdio: 'pipe',
  });
}

export async function migrateTenants(options: { setExitCode?: boolean } = {}) {
  const directory = getDatabaseDirectory();
  if (!fs.existsSync(directory)) throw new Error(`Diretorio de bancos nao encontrado: ${directory}`);

  const globalPath = path.join(directory, 'global.db');
  if (!fs.existsSync(globalPath) || !hasSQLiteHeader(globalPath)) {
    throw new Error(`Banco global ausente ou invalido: ${globalPath}`);
  }

  const releaseLock = acquireLock(directory);
  const dryRun = hasFlag('--dry-run');
  const includeArchived = hasFlag('--include-archived');
  const requestedTenants = getRequestedTenants();
  const backupDirectory = dryRun ? null : getBackupDirectory(directory);
  const results: TenantResult[] = [];
  const globalClient = new PrismaClient({ datasources: { db: { url: `file:${globalPath}` } } });

  try {
    const churches = await globalClient.$queryRawUnsafe<ChurchRecord[]>(
      `SELECT slug, databaseKey, status, active FROM "Church"
       WHERE deletedAt IS NULL
       ORDER BY slug ASC`
    );

    const selected = selectChurches(churches, { includeArchived, requestedTenants });

    for (const church of selected) {
      const startedAt = Date.now();
      try {
        const databaseKey = resolveDatabaseKey(church);
        const databasePath = path.join(directory, `church_${databaseKey}.db`);
        const baseResult = { slug: church.slug, databaseKey, file: databasePath };
        if (!hasSQLiteHeader(databasePath)) {
          throw new Error(`Banco ausente ou invalido: ${databasePath}`);
        }
        if (!(await checkIntegrity(databasePath))) {
          throw new Error(`Falha no integrity_check: ${databasePath}`);
        }

        if (dryRun) {
          results.push({ ...baseResult, status: 'dry-run', durationMs: Date.now() - startedAt });
          continue;
        }

        const backupPath = backupDatabase(databasePath, backupDirectory!, databaseKey);
        if (!(await checkIntegrity(backupPath))) {
          throw new Error(`Backup inconsistente: ${backupPath}`);
        }
        runMigration(databasePath);
        if (!(await checkIntegrity(databasePath))) {
          throw new Error(`Banco ficou inconsistente apos migration: ${databasePath}`);
        }
        results.push({ ...baseResult, status: 'migrated', backup: backupPath, durationMs: Date.now() - startedAt });
      } catch (error) {
        results.push({
          slug: church.slug,
          databaseKey: church.databaseKey ?? church.slug,
          file: path.join(directory, `church_${church.databaseKey ?? church.slug}.db`),
          status: 'failed',
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await globalClient.$disconnect();
    releaseLock();
  }

  const failed = results.filter((result) => result.status === 'failed');
  const report = {
    generatedAt: new Date().toISOString(),
    directory,
    dryRun,
    backupDirectory,
    results,
    summary: {
      selected: results.length,
      migrated: results.filter((result) => result.status === 'migrated').length,
      dryRun: results.filter((result) => result.status === 'dry-run').length,
      failed: failed.length,
    },
    sha256: crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex'),
  };

  const outputPath = getOption('--output');
  const serialized = JSON.stringify(report, null, 2);
  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), `${serialized}\n`, 'utf8');
  }
  console.log(serialized);
  if (failed.length > 0 && options.setExitCode !== false) process.exitCode = 1;
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  migrateTenants().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
