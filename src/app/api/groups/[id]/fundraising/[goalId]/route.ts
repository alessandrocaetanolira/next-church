import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { canManageGroup } from '@/lib/groups';
import { hasActionPermission } from '@/lib/access-control';

async function authorize(groupId: string, action: 'update' | 'delete') {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  if (!hasActionPermission(session.user, 'groups', action)) return null;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const allowed = await canManageGroup(prisma, session.user.role, session.user.linkedMemberId, groupId);
  if (!allowed) return null;
  return { session, prisma };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id, goalId } = await params;
  const authorized = await authorize(id, 'update');
  if (!authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await authorized.prisma.$executeRawUnsafe(
    `
      UPDATE "FundraisingGoal"
      SET title = ?, description = ?, targetAmount = ?, currentAmount = ?, items = ?, deadline = ?, active = ?, updatedAt = ?
      WHERE id = ? AND groupId = ? AND deletedAt IS NULL
    `,
    String(body.title ?? '').trim(),
    typeof body.description === 'string' ? body.description.trim() || null : null,
    Number(body.targetAmount) || 0,
    Number(body.currentAmount) || 0,
    JSON.stringify(Array.isArray(body.items) ? body.items : []),
    body.deadline ? new Date(body.deadline).toISOString() : null,
    body.active === false ? 0 : 1,
    now,
    goalId,
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id, goalId } = await params;
  const authorized = await authorize(id, 'delete');
  if (!authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date().toISOString();
  await authorized.prisma.$executeRawUnsafe(
    `UPDATE "FundraisingGoal" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND groupId = ? AND deletedAt IS NULL`,
    now,
    now,
    goalId,
    id
  );

  return NextResponse.json({ success: true });
}
