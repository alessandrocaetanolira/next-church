/**
 * prisma-factory.ts
 * 
 * Factory para instanciamento dinâmico de clientes Prisma para múltiplos bancos SQLite.
 * Gerencia o isolamento de dados por Tenant (Igreja).
 */

import { PrismaClient as GlobalPrismaClient } from '../../src/generated/prisma-global';
import { PrismaClient as TenantPrismaClient } from '../../src/generated/prisma-tenant';
import { PrismaClient as BiblePrismaClient } from '../../src/generated/prisma-bible';
import path from 'path';
import fs from 'fs';

// Cache de clientes Prisma para evitar múltiplas instâncias por tenant
const globalClients: Record<string, GlobalPrismaClient> = {};
const tenantClients: Record<string, TenantPrismaClient> = {};
const bibleClients: Record<string, BiblePrismaClient> = {};

export class TenantDatabaseNotFoundError extends Error {
  constructor(public readonly tenantId: string, public readonly dbPath: string) {
    super(`Banco do tenant não encontrado: ${tenantId}`);
    this.name = 'TenantDatabaseNotFoundError';
  }
}

export class TenantDatabaseInvalidError extends Error {
  constructor(public readonly tenantId: string, public readonly dbPath: string) {
    super(`Banco do tenant inválido ou vazio: ${tenantId}`);
    this.name = 'TenantDatabaseInvalidError';
  }
}

const TENANT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const getDatabaseDirectory = (directory?: string) =>
  path.resolve(directory ?? process.env.CHURCH_DATABASE_DIR ?? path.join(process.cwd(), 'prisma/databases'));

const assertSafeTenantId = (tenantId: string) => {
  if (!TENANT_KEY_PATTERN.test(tenantId)) {
    throw new Error('Identificador de tenant inválido.');
  }
};

const assertSQLiteFile = (tenantId: string, dbPath: string) => {
  if (!fs.existsSync(dbPath)) {
    throw new TenantDatabaseNotFoundError(tenantId, dbPath);
  }

  const header = Buffer.alloc(16);
  const fd = fs.openSync(dbPath, 'r');
  try {
    if (fs.readSync(fd, header, 0, header.length, 0) !== header.length || header.toString() !== 'SQLite format 3\u0000') {
      throw new TenantDatabaseInvalidError(tenantId, dbPath);
    }
  } finally {
    fs.closeSync(fd);
  }
};

/**
 * Retorna uma instância do Prisma Client conectada ao banco de dados global.
 * @returns {PrismaClient} Instância do Prisma Client Global.
 */
export const getGlobalClient = (databaseDirectory?: string): GlobalPrismaClient => {
  const dbName = 'global.db';
  const dbPath = path.join(getDatabaseDirectory(databaseDirectory), dbName);

  assertSQLiteFile('global', dbPath);

  const cacheKey = `global:${dbPath}`;
  if (!globalClients[cacheKey]) {
    globalClients[cacheKey] = new GlobalPrismaClient({
      datasources: {
        db: { url: `file:${dbPath}` },
      },
    });
  }
  return globalClients[cacheKey];
};

/**
 * Retorna uma instância do Prisma Client conectada ao banco de dados específico de um tenant.
 * @param {string} databaseKey - O identificador físico estável do banco do tenant.
 * @returns {PrismaClient} Instância do Prisma Client para o Tenant.
 * @throws {Error} Se o banco de dados do tenant não existir.
 */
export const getTenantClient = (databaseKey: string, databaseDirectory?: string): TenantPrismaClient => {
  assertSafeTenantId(databaseKey);

  const dbName = `church_${databaseKey}.db`;
  const dbPath = path.join(getDatabaseDirectory(databaseDirectory), dbName);
  assertSQLiteFile(databaseKey, dbPath);

  const cacheKey = `tenant:${dbPath}`;
  if (!tenantClients[cacheKey]) {
    tenantClients[cacheKey] = new TenantPrismaClient({
      datasources: {
        db: { url: `file:${dbPath}` },
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  return tenantClients[cacheKey];
};

/** Retorna o client do conteúdo bíblico compartilhado entre todos os tenants. */
export const getBibleClient = (databaseDirectory?: string): BiblePrismaClient => {
  const dbPath = path.join(getDatabaseDirectory(databaseDirectory), 'bible.db');
  assertSQLiteFile('bible', dbPath);

  const cacheKey = `bible:${dbPath}`;
  if (!bibleClients[cacheKey]) {
    bibleClients[cacheKey] = new BiblePrismaClient({
      datasources: { db: { url: `file:${dbPath}` } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  return bibleClients[cacheKey];
};

export const disconnectTenant = async (tenantId: string, databaseDirectory?: string) => {
  assertSafeTenantId(tenantId);
  const dbPath = path.join(getDatabaseDirectory(databaseDirectory), `church_${tenantId}.db`);
  const cacheKey = `tenant:${dbPath}`;
  const client = tenantClients[cacheKey];
  if (client) {
    await client.$disconnect();
    delete tenantClients[cacheKey];
  }
};

export const disconnectBible = async (databaseDirectory?: string) => {
  const dbPath = path.join(getDatabaseDirectory(databaseDirectory), 'bible.db');
  const cacheKey = `bible:${dbPath}`;
  const client = bibleClients[cacheKey];
  if (client) {
    await client.$disconnect();
    delete bibleClients[cacheKey];
  }
};

/**
 * Fecha todas as conexões ativas.
 */
export const closeAllConnections = async () => {
  for (const [cacheKey, client] of Object.entries(globalClients)) {
    await client.$disconnect();
    delete globalClients[cacheKey];
  }
  for (const [cacheKey, client] of Object.entries(tenantClients)) {
    await client.$disconnect();
    delete tenantClients[cacheKey];
  }
  for (const [cacheKey, client] of Object.entries(bibleClients)) {
    await client.$disconnect();
    delete bibleClients[cacheKey];
  }
};
