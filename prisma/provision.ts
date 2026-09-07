import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { seedBasicTenantData } from '../src/lib/tenant-seed';

const globalClient = new PrismaClient({
  datasources: { db: { url: 'file:' + path.join(process.cwd(), 'prisma/databases/global.db') } }
});

export async function createTenant(slug: string, adminEmail: string, adminPassword: string) {
  // 1. Criar Igreja e Usuário Global
  const church = await globalClient.church.create({
    data: { slug, name: slug.toUpperCase(), plan: 'PREMIUM' }
  });

  const password = await bcrypt.hash(adminPassword, 10);
  await globalClient.globalUser.create({
    data: { email: adminEmail, password, churchId: church.id }
  });

  // 2. Provisionar banco do tenant
  const dbPath = path.join(process.cwd(), 'prisma/databases', `church_${slug}.db`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, ''); // Cria arquivo vazio

  // Rodar schema no novo banco
  console.log(`🚀 Provisionando banco para tenant: ${slug}`);
  execSync(`npx prisma db push --skip-generate`, { 
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: 'inherit'
  });

  // 3. Criar Admin no Tenant
  const tenantClient = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  });

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

  await seedBasicTenantData(tenantClient);

  await tenantClient.$disconnect();
  return church;
}

// Executar criação
createTenant('igreja-teste', 'admin@teste.com', '123456')
  .then(() => console.log('✅ Tudo pronto!'))
  .catch(console.error)
  .finally(async () => await globalClient.$disconnect());
