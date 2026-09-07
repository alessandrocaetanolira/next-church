import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { getGlobalClient } from './prisma-factory';
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
  static async createTenant(slug: string, name: string, adminEmail: string, adminPassword: string) {
    const normalizedSlug = TenantService.normalizeSlug(slug);
    const globalClient = getGlobalClient();

    // 1. Criar Igreja no Global
    const church = await globalClient.church.create({
      data: { 
        slug: normalizedSlug,
        name, 
        plan: 'FREE',
        active: true
      }
    });

    // 2. Criar Usuário Global (para autenticação)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await globalClient.globalUser.create({
      data: { 
        email: adminEmail, 
        password: hashedPassword, 
        churchId: church.id 
      }
    });

    // 3. Provisionar arquivo físico do banco
    const dbPath = path.join(process.cwd(), 'prisma/databases', `church_${normalizedSlug}.db`);
    
    // Garantir diretório
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    // Criar arquivo vazio se não existir
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
    }

    // 4. Aplicar o Schema Prisma (push)
    try {
      console.log(`[TenantService] Provisionando schema para: ${normalizedSlug}`);
      execSync(`npx prisma db push --skip-generate`, { 
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
        stdio: 'pipe' 
      });
    } catch (error) {
      console.error(`[TenantService] Erro ao rodar db push para ${normalizedSlug}:`, error);
      throw new Error("Falha ao provisionar estrutura do banco de dados.");
    }

    // 5. Conectar e popular banco do Tenant
    const tenantClient = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } }
    });

    try {
      // 5.1 Criar Perfil de Admin
      await tenantClient.user.create({
        data: {
          name: 'Administrador',
          email: adminEmail,
          role: 'ADMIN',
          active: true,
          permissions: 'CANTEEN,TASKS,TEAMS,MATERIALS,PASTOR_AREA',
          version: 1
        }
      });

      // 5.2 Popular Dados Básicos (Seed)
      await seedBasicTenantData(tenantClient);

    } finally {
      await tenantClient.$disconnect();
    }

    return church;
  }

  /**
   * Lista todos os tenants cadastrados.
   */
  static async listTenants() {
    const globalClient = getGlobalClient();
    return globalClient.church.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Atualiza dados de um tenant (ex: nome, plano, status).
   */
  static async updateTenant(id: string, data: { name?: string, active?: boolean, plan?: string }) {
    const globalClient = getGlobalClient();
    return globalClient.church.update({
      where: { id },
      data
    });
  }

  /**
   * Fluxo de Deleção:
   * 1. Soft Delete (Inativa o acesso via Global DB)
   * 2. Backup do Banco SQLite (Mover para pasta de arquivos)
   * 3. Remoção do registro no Global DB
   */
  static async deleteTenant(id: string) {
    const globalClient = getGlobalClient();
    
    // Buscar o slug antes de deletar
    const church = await globalClient.church.findUnique({ where: { id } });
    if (!church) throw new Error("Igreja não encontrada.");

    // 1. Inativar acesso
    await globalClient.church.update({
      where: { id },
      data: { active: false, deletedAt: new Date() }
    });

    // 2. Mover banco para pasta de backup (Arquivamento)
    const dbPath = path.join(process.cwd(), 'prisma/databases', `church_${church.slug}.db`);
    const backupDir = path.join(process.cwd(), 'prisma/databases/archived');
    const backupPath = path.join(backupDir, `church_${church.slug}_${Date.now()}.db.bak`);

    if (fs.existsSync(dbPath)) {
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      fs.renameSync(dbPath, backupPath);
      console.log(`[TenantService] Banco arquivado em: ${backupPath}`);
    }

    // 3. Remover registros globais (Cascata se houver usuários)
    await globalClient.globalUser.deleteMany({ where: { churchId: id } });
    return globalClient.church.delete({ where: { id } });
  }
}
