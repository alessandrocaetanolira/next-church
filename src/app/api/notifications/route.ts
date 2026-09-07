import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const tenantId = session?.user?.tenantId;

  if (!tenantId || !email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const notifications = await prisma.$queryRawUnsafe<Array<{
    id: string;
    userEmail: string;
    type: string;
    title: string;
    message: string;
    href: string | null;
    sourceType: string | null;
    sourceId: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>>(
    `
      SELECT id, userEmail, type, title, message, href, sourceType, sourceId, readAt, createdAt
      FROM "Notification"
      WHERE userEmail = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC
      LIMIT 100
    `,
    email
  );

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      ...notification,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const tenantId = session?.user?.tenantId;

  if (!tenantId || !email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { action } = await request.json();
  if (action !== 'markAllRead') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Notification"
      SET readAt = ?, updatedAt = ?
      WHERE userEmail = ? AND readAt IS NULL AND deletedAt IS NULL
    `,
    new Date().toISOString(),
    new Date().toISOString(),
    email
  );

  return NextResponse.json({ success: true });
}
