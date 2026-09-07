import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { canManageGroup, parseJsonField } from '@/lib/groups';
import { generateId } from '@/lib/id';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const goals = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, groupId, title, description, targetAmount, currentAmount, items, deadline, active, createdAt, updatedAt
      FROM "FundraisingGoal"
      WHERE groupId = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC
    `,
    id
  );

  return NextResponse.json(
    goals.map((goal) => ({
      ...goal,
      items: parseJsonField<Array<Record<string, unknown>>>(typeof goal.items === 'string' ? goal.items : null, []),
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const allowed = await canManageGroup(prisma, session.user.role, session.user.linkedMemberId, id);
  if (!allowed) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const goalId = generateId();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "FundraisingGoal" (id, groupId, title, description, targetAmount, currentAmount, items, deadline, active, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    goalId,
    id,
    String(body.title ?? '').trim(),
    typeof body.description === 'string' ? body.description.trim() || null : null,
    Number(body.targetAmount) || 0,
    Number(body.currentAmount) || 0,
    JSON.stringify(Array.isArray(body.items) ? body.items : []),
    body.deadline ? new Date(body.deadline).toISOString() : null,
    body.active === false ? 0 : 1,
    now,
    now,
    null
  );

  return NextResponse.json({ success: true, id: goalId }, { status: 201 });
}
