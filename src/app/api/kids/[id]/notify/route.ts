import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { notifyChildResponsibles } from '@/lib/server/notification-service';
import { parseJsonField } from '@/lib/groups';

function canManage(role?: string | null) {
  return ['ADMIN', 'PASTOR', 'LEADER'].includes(role?.toUpperCase() ?? '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !canManage(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const title = String(body.title ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!title || !message) {
    return NextResponse.json({ error: 'Título e mensagem são obrigatórios.' }, { status: 400 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const [child] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    parentMemberIds: string | null;
  }>>(
    `
      SELECT id, name, parentMemberIds
      FROM "ChildProfile"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    id
  );

  if (!child) {
    return NextResponse.json({ error: 'Criança não encontrada.' }, { status: 404 });
  }

  const parentMemberIds = parseJsonField<string[]>(child.parentMemberIds, []);
  if (!parentMemberIds.length) {
    return NextResponse.json({ error: 'Esta criança não possui responsável vinculado.' }, { status: 409 });
  }

  await notifyChildResponsibles(prisma, session.user.tenantId, {
    childId: child.id,
    childName: child.name,
    parentMemberIds,
    actorName: session.user.name || 'Equipe',
    title,
    message,
  });

  return NextResponse.json({ success: true });
}
