import { PrismaClient as TenantPrismaClient } from '../../src/generated/prisma-tenant';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { disconnectTenant, getDatabaseDirectory, getGlobalClient } from './prisma-factory';
import { seedTenantStructure } from './tenant-seed';
import { publishGlobalProvisioningEvent } from '@/infra/sse/sse-broker';
import { notifyPlatformAdmin } from '@/server/notifications/platform-push.controller';

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
   * 4. Validação de dados estruturais do tenant
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

    // A migration faz backfill de igrejas existentes; tenants novos recebem
    // sua identidade visual padrão durante o provisionamento.
    await globalClient.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "ChurchBranding" (id, churchId, pwaName, pwaShortName, logoUrl, schemaVersion, brandingVersion, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      `branding_${church.id}`,
      church.id,
      name.trim(),
      name.trim(),
      null,
      new Date().toISOString(),
      new Date().toISOString(),
    );

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
      await seedTenantStructure(tenantClient);
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

  /** Enfileira o provisionamento e libera a requisição HTTP imediatamente. */
  static async enqueueTenantProvisioning(
    slug: string,
    name: string,
    adminEmail: string,
    adminPassword: string,
    options: { databaseDirectory?: string; platformAdminId?: string } = {},
  ) {
    const normalizedSlug = TenantService.normalizeSlug(slug);
    if (!normalizedSlug || !name.trim() || !adminEmail.trim() || adminPassword.length < 6) {
      throw new Error('Dados invalidos para provisionamento da igreja.');
    }
    const globalClient = getGlobalClient(options.databaseDirectory);
    const existing = await globalClient.church.findUnique({ where: { slug: normalizedSlug } });
    if (existing && existing.status !== 'FAILED') throw new Error(`Igreja ja cadastrada: ${normalizedSlug}`);
    const activeJob = await globalClient.provisioningJob.findFirst({
      where: { slug: normalizedSlug, status: { in: ['QUEUED', 'RUNNING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (activeJob) return activeJob;

    const job = await globalClient.provisioningJob.create({
      data: { runId: randomUUID(), slug: normalizedSlug, adminEmail: adminEmail.trim().toLowerCase(), status: 'QUEUED', step: 'queued', churchId: existing?.id },
    });
    if (options.platformAdminId) await globalClient.$executeRawUnsafe('UPDATE "ProvisioningJob" SET platformAdminId = ? WHERE id = ?', options.platformAdminId, job.id);
    publishGlobalProvisioningEvent({ type: 'provisioning.updated', runId: job.runId, tenantId: job.churchId, status: 'QUEUED', step: 'queued' });
    void TenantService.runProvisioningJob(job.runId, { slug, name, adminEmail, adminPassword, ...options });
    return job;
  }

  static async runProvisioningJob(
    runId: string,
    input: { slug: string; name: string; adminEmail: string; adminPassword: string; databaseDirectory?: string; platformAdminId?: string },
  ) {
    const globalClient = getGlobalClient(input.databaseDirectory);
    const job = await globalClient.provisioningJob.findUnique({ where: { runId } });
    if (!job) return;
    await globalClient.provisioningJob.update({ where: { runId }, data: { status: 'RUNNING', step: 'provisioning', startedAt: new Date(), attempts: { increment: 1 }, error: null } });
    const [{ platformAdminId } = { platformAdminId: null }] = await globalClient.$queryRawUnsafe<Array<{ platformAdminId: string | null }>>('SELECT platformAdminId FROM "ProvisioningJob" WHERE runId = ? LIMIT 1', runId);
    const effectivePlatformAdminId = input.platformAdminId ?? platformAdminId ?? undefined;
    const startedListeners = publishGlobalProvisioningEvent({ type: 'provisioning.updated', runId, tenantId: job.churchId, status: 'RUNNING', step: 'provisioning' });
    if (!startedListeners && effectivePlatformAdminId) void notifyPlatformAdmin(effectivePlatformAdminId, { type: 'provisioning.updated', title: 'Provisionamento iniciado', message: `A igreja ${input.name} está sendo preparada.`, href: '/admin/tenants' });
    try {
      const church = await TenantService.createTenant(input.slug, input.name, input.adminEmail, input.adminPassword, input);
      await globalClient.provisioningJob.update({ where: { runId }, data: { churchId: church.id, status: 'ACTIVE', step: 'completed', finishedAt: new Date() } });
      const activeListeners = publishGlobalProvisioningEvent({ type: 'provisioning.updated', runId, tenantId: church.id, status: 'ACTIVE', step: 'completed', finishedAt: new Date().toISOString() });
      if (!activeListeners && effectivePlatformAdminId) void notifyPlatformAdmin(effectivePlatformAdminId, { type: 'provisioning.updated', title: 'Tenant disponível', message: `${input.name} está disponível no painel.`, href: '/admin/tenants' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const church = await globalClient.church.findUnique({ where: { slug: TenantService.normalizeSlug(input.slug) } });
      await globalClient.provisioningJob.update({ where: { runId }, data: { churchId: church?.id, status: 'FAILED', step: 'failed', finishedAt: new Date(), error: message.slice(0, 1000) } });
      const failedListeners = publishGlobalProvisioningEvent({ type: 'provisioning.updated', runId, tenantId: church?.id, status: 'FAILED', step: 'failed', message: message.slice(0, 200), finishedAt: new Date().toISOString() });
      if (!failedListeners && effectivePlatformAdminId) void notifyPlatformAdmin(effectivePlatformAdminId, { type: 'provisioning.updated', title: 'Falha no provisionamento', message: `Não foi possível preparar ${input.name}.`, href: '/admin/tenants' });
    }
  }

  static async retryTenantProvisioning(tenantId: string, adminPassword: string, platformAdminId: string) {
    const globalClient = getGlobalClient();
    const church = await globalClient.church.findUnique({ where: { id: tenantId } });
    if (!church) throw new Error('Tenant não encontrado.');
    if (church.status !== 'FAILED') throw new Error('Somente tenants com falha podem ser retentados.');
    const failedJob = await globalClient.provisioningJob.findFirst({ where: { churchId: tenantId, status: 'FAILED' }, orderBy: { createdAt: 'desc' } });
    if (!failedJob) throw new Error('Nenhuma execução falha encontrada para este tenant.');
    return TenantService.enqueueTenantProvisioning(church.slug, church.name, failedJob.adminEmail, adminPassword, { platformAdminId });
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
    data: { name?: string, slug?: string, active?: boolean, plan?: string },
    options: { databaseDirectory?: string } = {}
  ) {
    const globalClient = getGlobalClient(options.databaseDirectory);
    const current = await globalClient.church.findUnique({ where: { id } });
    if (!current) throw new Error('Igreja não encontrada.');

    const updateData: { name?: string; slug?: string; active?: boolean; plan?: string; authVersion?: { increment: number } } = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error('O nome da igreja é obrigatório.');
      updateData.name = name;
    }
    if (data.slug !== undefined) {
      const slug = TenantService.normalizeSlug(data.slug);
      if (!slug) throw new Error('Slug inválido. Use letras, números e hífens.');
      if (slug !== current.slug) {
        const conflict = await globalClient.church.findUnique({ where: { slug } });
        if (conflict && conflict.id !== id) throw new Error(`O slug "${slug}" já está em uso.`);
      }
      updateData.slug = slug;
    }
    if (data.active !== undefined) {
      updateData.active = data.active;
      if (data.active !== current.active) updateData.authVersion = { increment: 1 };
    }
    if (data.plan !== undefined) updateData.plan = data.plan;

    return globalClient.church.update({
      where: { id },
      data: updateData,
    });
  }

  static async getTenant(id: string, options: { databaseDirectory?: string } = {}) {
    const globalClient = getGlobalClient(options.databaseDirectory);
    return globalClient.church.findUnique({ where: { id } });
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
      data: { active: false, status: 'ARCHIVED', deletedAt: new Date(), authVersion: { increment: 1 } }
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
