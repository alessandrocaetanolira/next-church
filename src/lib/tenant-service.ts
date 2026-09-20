import { PrismaClient as TenantPrismaClient } from '../../src/generated/prisma-tenant';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'child_process';
import { disconnectTenant, getDatabaseDirectory, getGlobalClient } from './prisma-factory';
import { seedBasicTenantData } from './tenant-seed';

/**
 * Serviço para gerenciamento de Tenants (Igrejas).
 * Responsável pelo ciclo de vida: criação, provisionamento de banco e exclusão.
 */
export class TenantService {
  static normalizeSlug(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Cria um novo tenant completo:
   * 1. Registro no banco Global
   * 2. Criação do arquivo SQLite físico
   * 3. Aplicação do Schema Prisma
   * 4. População de dados básicos (Seed)
   * 5. Criação do usuário administrador inicial no tenant
   */
  static async createTenant(
    slug: string,
    name: string,
    adminEmail: string,
    adminPassword: string,
    options: { databaseDirectory?: string } = {}
  ) {
    const normalizedSlug = TenantService.normalizeSlug(slug);
    if (!normalizedSlug || !name.trim() || !adminEmail.trim() || adminPassword.length < 6) {
      throw new Error('Dados invalidos para provisionamento da igreja.');
    }

    const globalClient = getGlobalClient(options.databaseDirectory);
    const databaseDirectory = getDatabaseDirectory(options.databaseDirectory);
    const databaseKey = normalizedSlug;
    const provisioningStartedAt = new Date();
    const dbPath = path.join(databaseDirectory, `church_${databaseKey}.db`);
    const temporaryDbPath = path.join(
      databaseDirectory,
      `.church_${databaseKey}.${process.pid}.${Date.now()}.tmp.db`
    );

    if (fs.existsSync(dbPath)) throw new Error(`Banco do tenant ja existe: ${dbPath}`);

    const existingChurch = await globalClient.church.findUnique({ where: { slug: normalizedSlug } });
    let church;
    if (existingChurch?.status === 'FAILED' && !fs.existsSync(dbPath)) {
      church = await globalClient.church.update({
        where: { id: existingChurch.id },
        data: {
          name: name.trim(),
          active: false,
          status: 'PROVISIONING',
          deletedAt: null,
          provisioningStartedAt,
          provisioningError: null,
        },
      });
    } else if (existingChurch) {
      throw new Error(`Igreja ja cadastrada: ${normalizedSlug}`);
    } else {
      church = await globalClient.church.create({
        data: {
          slug: normalizedSlug,
          databaseKey,
          name: name.trim(),
          plan: 'FREE',
          active: false,
          status: 'PROVISIONING',
          provisioningStartedAt,
        }
      });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    let tenantClient: TenantPrismaClient | null = null;
    try {
      fs.mkdirSync(databaseDirectory, { recursive: true });
      console.log(`[TenantService] Provisionando schema para: ${databaseKey}`);
      execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema=prisma/tenant/schema.prisma'], {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: `file:${temporaryDbPath}` },
        stdio: 'pipe',
      });

      tenantClient = new TenantPrismaClient({
        datasources: { db: { url: `file:${temporaryDbPath}` } }
      });

      await tenantClient.user.upsert({
        where: { email: adminEmail.trim().toLowerCase() },
        update: {
          name: 'Administrador',
          passwordHash: hashedPassword,
          role: 'ADMIN',
          active: true,
          permissions: 'CANTEEN,TASKS,TEAMS,MATERIALS,PASTOR_AREA',
          version: { increment: 1 },
        },
        create: {
          name: 'Administrador',
          email: adminEmail.trim().toLowerCase(),
          passwordHash: hashedPassword,
          role: 'ADMIN',
          active: true,
          permissions: 'CANTEEN,TASKS,TEAMS,MATERIALS,PASTOR_AREA',
          version: 1,
        },
      });
      await seedBasicTenantData(tenantClient);
      await tenantClient.$disconnect();
      tenantClient = null;

      fs.renameSync(temporaryDbPath, dbPath);
      return await globalClient.church.update({
        where: { id: church.id },
        data: {
          active: true,
          status: 'ACTIVE',
          provisionedAt: new Date(),
          provisioningError: null,
        },
      });
    } catch (error) {
      if (tenantClient) await tenantClient.$disconnect();
      if (fs.existsSync(temporaryDbPath)) fs.rmSync(temporaryDbPath, { force: true });
      await globalClient.church.update({
        where: { id: church.id },
        data: {
          active: false,
          status: 'FAILED',
          provisioningError: error instanceof Error ? error.message : String(error),
        },
      });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao provisionar tenant ${normalizedSlug}: ${message}`);
    }
  }

  /**
   * Lista todos os tenants cadastrados.
   */
  static async listTenants(options: { databaseDirectory?: string } = {}) {
    const globalClient = getGlobalClient(options.databaseDirectory);
    return globalClient.church.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Atualiza dados de um tenant (ex: nome, plano, status).
   */
  static async updateTenant(
    id: string,
    data: { name?: string, active?: boolean, plan?: string },
    options: { databaseDirectory?: string } = {}
  ) {
    const globalClient = getGlobalClient(options.databaseDirectory);
    return globalClient.church.update({
      where: { id },
      data
    });
  }

  /**
   * Fluxo de Deleção:
   * 1. Soft Delete (Inativa o acesso via Global DB)
   * 2. Backup do Banco SQLite (Mover para pasta de arquivos)
   * 3. Manutenção do registro no Global DB para auditoria
   */
  static async deleteTenant(id: string, options: { databaseDirectory?: string } = {}) {
    const globalClient = getGlobalClient(options.databaseDirectory);
    
    // Buscar o slug antes de deletar
    const church = await globalClient.church.findUnique({ where: { id } });
    if (!church) throw new Error("Igreja não encontrada.");

    // 1. Inativar acesso
    await globalClient.church.update({
      where: { id },
      data: { active: false, status: 'ARCHIVED', deletedAt: new Date() }
    });

    // 2. Mover banco para pasta de backup (Arquivamento)
    const databaseKey = church.databaseKey ?? church.slug;
    const databaseDirectory = getDatabaseDirectory(options.databaseDirectory);
    const dbPath = path.join(databaseDirectory, `church_${databaseKey}.db`);
    const backupDir = path.join(databaseDirectory, 'archived');
    const backupPath = path.join(backupDir, `church_${databaseKey}_${Date.now()}.db.bak`);

    if (fs.existsSync(dbPath)) {
      await disconnectTenant(databaseKey, options.databaseDirectory);
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      fs.renameSync(dbPath, backupPath);
      console.log(`[TenantService] Banco arquivado em: ${backupPath}`);
    }

    return globalClient.church.findUniqueOrThrow({ where: { id } });
  }
}
