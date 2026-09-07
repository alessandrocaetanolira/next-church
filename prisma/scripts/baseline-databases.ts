import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { PrismaClient as LegacyPrismaClient } from '@prisma/client';
import { PrismaClient as GlobalPrismaClient } from '../../src/generated/prisma-global';
import { PrismaClient as TenantPrismaClient } from '../../src/generated/prisma-tenant';

const TENANT_TABLE_ORDER = [
  'User', 'Member', 'Product', 'Sale', 'CreditTransaction', 'Notification',
  'Task', 'Team', 'TeamJoinRequest', 'Material', 'Group', 'GroupMember',
  'FundraisingGoal', 'ChildProfile', 'ParkingSpot', 'FeedPost',
  'QuizQuestion', 'QuizAttempt', 'EngagementProfile', 'Book', 'Chapter', 'Verse',
];

type RawRow = Record<string, unknown>;

function getOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function databaseUrl(filePath: string) {
  return `file:${filePath}`;
}

function deployMigration(schema: string, filePath: string) {
  execFileSync('npx', ['prisma', 'migrate', 'deploy', `--schema=${schema}`], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl(filePath) },
    stdio: 'pipe',
  });
}

async function getTableNames(prisma: LegacyPrismaClient | TenantPrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  return rows.map((row) => row.name);
}

async function getColumns(prisma: LegacyPrismaClient | TenantPrismaClient, tableName: string) {
  const identifier = quoteIdentifier(tableName);
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info(${identifier})`);
  return rows.map((row) => row.name);
}

async function copyTable(source: LegacyPrismaClient, target: TenantPrismaClient, tableName: string) {
  const sourceTables = await getTableNames(source);
  const targetTables = await getTableNames(target);
  if (!sourceTables.includes(tableName) || !targetTables.includes(tableName)) return 0;

  const sourceColumns = await getColumns(source, tableName);
  const targetColumns = await getColumns(target, tableName);
  const columns = sourceColumns.filter((column) => targetColumns.includes(column));
  if (columns.length === 0) return 0;

  const sourceIdentifier = quoteIdentifier(tableName);
  const columnSql = columns.map(quoteIdentifier).join(', ');
  const rows = await source.$queryRawUnsafe<RawRow[]>(`SELECT ${columnSql} FROM ${sourceIdentifier}`);
  if (rows.length === 0) return 0;

  await target.$transaction(async (transaction) => {
    for (const row of rows) {
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((column) => row[column] ?? null);
      await transaction.$executeRawUnsafe(
        `INSERT INTO ${sourceIdentifier} (${columnSql}) VALUES (${placeholders})`,
        ...values
      );
    }
  });
  return rows.length;
}

async function main() {
  const sourceDirectory = path.resolve(getOption('--source') ?? '');
  const destinationDirectory = path.resolve(getOption('--destination') ?? '');
  const requestedTenants = (getOption('--tenants') ?? '')
    .split(',')
    .map((tenant) => tenant.trim())
    .filter(Boolean);
  const includeOrphans = process.argv.includes('--include-orphans');

  if (!sourceDirectory || !destinationDirectory || sourceDirectory === destinationDirectory) {
    throw new Error('Informe --source e --destination diferentes.');
  }
  if (!fs.existsSync(sourceDirectory)) throw new Error(`Origem nao encontrada: ${sourceDirectory}`);
  if (fs.existsSync(destinationDirectory)) throw new Error(`Destino ja existe: ${destinationDirectory}`);

  const sourceGlobalPath = path.join(sourceDirectory, 'global.db');
  if (!fs.existsSync(sourceGlobalPath)) throw new Error('global.db nao encontrado na origem.');
  fs.mkdirSync(destinationDirectory, { recursive: true });

  const sourceGlobal = new LegacyPrismaClient({ datasources: { db: { url: databaseUrl(sourceGlobalPath) } } });
  const globalPath = path.join(destinationDirectory, 'global.db');
  deployMigration('prisma/global/schema.prisma', globalPath);
  const targetGlobal = new GlobalPrismaClient({ datasources: { db: { url: databaseUrl(globalPath) } } });

  try {
    const sourceChurches = await sourceGlobal.$queryRawUnsafe<RawRow[]>('SELECT * FROM "Church" ORDER BY slug');
    const churchBySlug = new Map(sourceChurches.map((church) => [String(church.slug), church]));
    const sourceTenantFiles = fs.readdirSync(sourceDirectory)
      .filter((file) => file.startsWith('church_') && file.endsWith('.db') && file !== 'church_template.db')
      .map((file) => file.slice('church_'.length, -'.db'.length))
      .filter((tenant) => requestedTenants.length === 0 || requestedTenants.includes(tenant))
      .sort();

    const missing = sourceTenantFiles.filter((tenant) => !churchBySlug.has(tenant));
    if (missing.length > 0 && !includeOrphans) {
      throw new Error(`Tenants sem registro global: ${missing.join(', ')}. Use --include-orphans somente para fixtures confirmadas.`);
    }

    const selectedChurches = [...new Set([...sourceChurches.map((church) => String(church.slug)), ...sourceTenantFiles])]
      .filter((slug) => requestedTenants.length === 0 || requestedTenants.includes(slug))
      .sort();
    const churchIds = new Map<string, string>();

    for (const slug of selectedChurches) {
      const sourceChurch = churchBySlug.get(slug);
      const churchId = String(sourceChurch?.id ?? crypto.randomUUID());
      churchIds.set(slug, churchId);
      await targetGlobal.$executeRawUnsafe(
        `INSERT INTO "Church" ("id", "slug", "databaseKey", "name", "logoUrl", "themeVariant", "themeMode", "plan", "status", "active", "createdAt", "updatedAt", "deletedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        churchId,
        slug,
        slug,
        String(sourceChurch?.name ?? slug.toUpperCase()),
        sourceChurch?.logoUrl ?? null,
        sourceChurch?.themeVariant ?? 'default',
        sourceChurch?.themeMode ?? 'light',
        sourceChurch?.plan ?? 'FREE',
        sourceChurch?.status ?? (sourceChurch?.active === false ? 'ARCHIVED' : 'ACTIVE'),
        sourceChurch?.active ?? true,
        sourceChurch?.createdAt ?? new Date(),
        sourceChurch?.updatedAt ?? new Date(),
        sourceChurch?.deletedAt ?? null
      );
    }

    const globalUsers = await sourceGlobal.$queryRawUnsafe<RawRow[]>('SELECT * FROM "GlobalUser"');
    const usersByChurchAndEmail = new Map(
      globalUsers.map((user) => [`${String(user.churchId)}:${String(user.email).trim().toLowerCase()}`, String(user.password)])
    );

    for (const slug of sourceTenantFiles) {
      const sourcePath = path.join(sourceDirectory, `church_${slug}.db`);
      const targetPath = path.join(destinationDirectory, `church_${slug}.db`);
      deployMigration('prisma/tenant/schema.prisma', targetPath);
      const sourceTenant = new LegacyPrismaClient({ datasources: { db: { url: databaseUrl(sourcePath) } } });
      const targetTenant = new TenantPrismaClient({ datasources: { db: { url: databaseUrl(targetPath) } } });
      try {
        const copied: Record<string, number> = {};
        for (const table of TENANT_TABLE_ORDER) copied[table] = await copyTable(sourceTenant, targetTenant, table);

        const churchId = churchIds.get(slug);
        if (churchId) {
          const users = await targetTenant.$queryRawUnsafe<Array<{ email: string }>>('SELECT email FROM "User"');
          for (const user of users) {
            const passwordHash = usersByChurchAndEmail.get(`${churchId}:${user.email.trim().toLowerCase()}`);
            if (passwordHash) {
              await targetTenant.$executeRawUnsafe('UPDATE "User" SET "passwordHash" = ? WHERE "email" = ?', passwordHash, user.email);
            }
          }
        }
        console.log(`${slug}: ${JSON.stringify(copied)}`);
      } finally {
        await targetTenant.$disconnect();
        await sourceTenant.$disconnect();
      }
    }
  } finally {
    await targetGlobal.$disconnect();
    await sourceGlobal.$disconnect();
  }

  console.log(`Baseline concluida: ${destinationDirectory}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
