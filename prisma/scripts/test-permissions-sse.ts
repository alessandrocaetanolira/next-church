import path from 'node:path';
import { PrismaClient } from '../../src/generated/prisma-tenant';
import { updateMemberAccess } from '../../src/server/members/member-access.controller';
import { MemberAccessRepository } from '../../src/server/members/member-access.repository';
import { MemberAccessService } from '../../src/server/members/member-access.service';

const tenantId = process.env.TEST_TENANT ?? 'igreja-teste';
const email = process.env.TEST_EMAIL ?? 'admin@igreja-teste.com';
const targetRole = (process.env.TEST_ROLE ?? 'MEMBER').toUpperCase();
const directory = path.resolve(process.env.CHURCH_DATABASE_DIR ?? 'prisma/databases');
const databaseUrl = `file:${path.join(directory, `church_${tenantId}.db`)}`;

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  const member = await prisma.member.upsert({
    where: { id: user.linkedMemberId ?? '__missing_member__' },
    update: { email, name: user.name, active: true, approved: true, deletedAt: null },
    create: {
      name: user.name,
      email,
      phone: '00000000000',
      active: true,
      approved: true,
    },
  });

  const service = new MemberAccessService(new MemberAccessRepository(prisma));
  const result = await updateMemberAccess(
    { role: 'ADMIN', permissions: [], planFeatures: undefined, tenantId },
    service,
    member.id,
    { role: targetRole, permissions: [], password: '' },
    tenantId,
  );

  const response = await fetch(process.env.TEST_APP_URL ?? 'http://localhost:3000/enviar-sse', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify({
      tenantId,
      userEmail: result.email,
      type: 'permissions.updated',
      role: result.role,
      permissions: result.permissions,
      title: 'Atualização de acesso',
      message: 'Suas permissões foram atualizadas.',
    }),
  });
  const delivery = await response.text();
  if (!response.ok) throw new Error(`Falha ao publicar SSE no Next: HTTP ${response.status} ${delivery}`);

  console.log(JSON.stringify({ tenantId, email: result.email, role: result.role, permissions: result.permissions }, null, 2));
  console.log(`Evento permissions.updated publicado via SSE: ${delivery}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
