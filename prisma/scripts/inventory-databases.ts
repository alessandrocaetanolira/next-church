import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

type TableReport = {
  name: string;
  columns: string[];
  rowCount: number | null;
};

type DatabaseReport = {
  file: string;
  sizeBytes: number;
  sha256: string;
  sqliteHeader: boolean;
  integrity: string;
  hasPrismaMigrations: boolean;
  indexes: string[];
  tables: TableReport[];
  error?: string;
};

const SQLITE_HEADER = 'SQLite format 3\u0000';

function getOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getDatabaseDirectory() {
  return path.resolve(
    getOption('--dir') ??
      process.env.CHURCH_DATABASE_DIR ??
      path.join(process.cwd(), 'prisma/databases')
  );
}

function hasSQLiteHeader(filePath: string) {
  const handle = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(16);
  try {
    return fs.readSync(handle, header, 0, header.length, 0) === 16 && header.toString() === SQLITE_HEADER;
  } finally {
    fs.closeSync(handle);
  }
}

async function inspectDatabase(filePath: string): Promise<DatabaseReport> {
  const report: DatabaseReport = {
    file: path.basename(filePath),
    sizeBytes: fs.statSync(filePath).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
    sqliteHeader: hasSQLiteHeader(filePath),
    integrity: 'not-checked',
    hasPrismaMigrations: false,
    indexes: [],
    tables: [],
  };

  if (!report.sqliteHeader) {
    report.integrity = 'invalid-header';
    return report;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${filePath}` } },
  });

  try {
    const integrity = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>(
      'PRAGMA integrity_check'
    );
    report.integrity = integrity[0]?.integrity_check ?? 'unknown';

    const objects = await prisma.$queryRawUnsafe<Array<{ name: string; type: string }>>(
      `SELECT name, type FROM sqlite_master
       WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%'
       ORDER BY type, name`
    );
    const tableNames = objects.filter((object) => object.type === 'table').map((object) => object.name);
    report.indexes = objects.filter((object) => object.type === 'index').map((object) => object.name);
    report.hasPrismaMigrations = tableNames.includes('_prisma_migrations');

    for (const tableName of tableNames) {
      const identifier = quoteIdentifier(tableName);
      const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `PRAGMA table_info(${identifier})`
      );
      let rowCount: number | null = null;
      try {
        const count = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
          `SELECT COUNT(*) AS count FROM ${identifier}`
        );
        rowCount = Number(count[0]?.count ?? 0);
      } catch {
        rowCount = null;
      }
      report.tables.push({
        name: tableName,
        columns: columns.map((column) => column.name),
        rowCount,
      });
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await prisma.$disconnect();
  }

  return report;
}

async function main() {
  const directory = getDatabaseDirectory();
  if (!fs.existsSync(directory)) {
    throw new Error(`Diretorio de bancos nao encontrado: ${directory}`);
  }

  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.db'))
    .sort()
    .map((file) => path.join(directory, file));

  const reports = [];
  for (const filePath of files) {
    reports.push(await inspectDatabase(filePath));
  }

  const outputPath = getOption('--output');
  const payload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      directory,
      host: os.hostname(),
      databases: reports,
    },
    null,
    2
  );

  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), `${payload}\n`, 'utf8');
    console.log(`Inventario salvo em ${path.resolve(outputPath)}`);
  } else {
    console.log(payload);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
