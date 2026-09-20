import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission } from '@/lib/access-control';

export async function GET() {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();

  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'pastoral', 'view')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const members = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT
        id,
        name,
        email,
        phone,
        birthDate,
        conversionDate,
        baptismDate,
        previousChurch,
        aboutMe,
        maritalStatus,
        createdAt
      FROM "Member"
      WHERE approved = 0
        AND deletedAt IS NULL
      ORDER BY createdAt DESC
    `
  );

  return NextResponse.json({ members });
}
