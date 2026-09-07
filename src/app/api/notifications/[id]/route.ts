import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const tenantId = session?.user?.tenantId;

  if (!tenantId || !email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const { action } = await request.json();
  if (action !== 'markRead') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Notification"
      SET readAt = ?, updatedAt = ?
      WHERE id = ? AND userEmail = ? AND deletedAt IS NULL
    `,
    new Date().toISOString(),
    new Date().toISOString(),
    id,
    email
  );

  return NextResponse.json({ success: true });
}
