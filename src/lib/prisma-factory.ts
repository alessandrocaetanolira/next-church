/**
 * prisma-factory.ts
 * 
 * Factory para instanciamento dinâmico de clientes Prisma para múltiplos bancos SQLite.
 * Gerencia o isolamento de dados por Tenant (Igreja).
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Cache de clientes Prisma para evitar múltiplas instâncias por tenant
const clients: Record<string, PrismaClient> = {};

/**
 * Retorna uma instância do Prisma Client conectada ao banco de dados global.
 * @returns {PrismaClient} Instância do Prisma Client Global.
 */
export const getGlobalClient = () => {
  const dbName = 'global.db';
  const dbPath = path.join(process.cwd(), 'prisma/databases', dbName);

  if (!clients[dbName]) {
    clients[dbName] = new PrismaClient({
      datasources: {
        db: { url: `file:${dbPath}` },
      },
    });
  }
  return clients[dbName];
};

/**
 * Retorna uma instância do Prisma Client conectada ao banco de dados específico de um tenant.
 * @param {string} tenantId - O identificador único da igreja (slug ou id).
 * @returns {PrismaClient} Instância do Prisma Client para o Tenant.
 * @throws {Error} Se o banco de dados do tenant não existir.
 */
export const getTenantClient = (tenantId: string): PrismaClient => {
  const dbName = `church_${tenantId}.db`;
  const dbPath = path.join(process.cwd(), 'prisma/databases', dbName);

  // Verificação de segurança: O banco deve existir fisicamente antes de conectar
  if (!fs.existsSync(dbPath)) {
    const templatePath = path.join(process.cwd(), 'prisma/databases', 'church_template.db');
    
    // Garantir que o diretório de destino existe
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath);
    } else {
      // Se não houver template, criamos um banco vazio (o Prisma criará as tabelas no primeiro acesso se usarmos db push, 
      // mas aqui apenas garantimos o arquivo para o Prisma Client não falhar na conexão inicial)
      fs.writeFileSync(dbPath, '');
    }
  }

  if (!clients[tenantId]) {
    clients[tenantId] = new PrismaClient({
      datasources: {
        db: { url: `file:${dbPath}` },
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  return clients[tenantId];
};

/**
 * Fecha todas as conexões ativas.
 */
export const closeAllConnections = async () => {
  for (const client of Object.values(clients)) {
    await client.$disconnect();
  }
};
