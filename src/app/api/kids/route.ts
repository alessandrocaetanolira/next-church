import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';
import { normalizeStringArray, parseJsonField } from '@/lib/groups';

function canManage(role?: string | null) {
  return ['ADMIN', 'PASTOR', 'LEADER'].includes(role?.toUpperCase() ?? '');
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const children = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, name, birthDate, parentMemberIds, allergies, medications, healthHistory, dietaryRestrictions,
             canDoPhysicalActivities, notes, groupIds, createdAt, updatedAt
      FROM "ChildProfile"
      WHERE deletedAt IS NULL
      ORDER BY name ASC
    `
  );

  return NextResponse.json(
    children.map((child) => ({
      ...child,
      parentMemberIds: parseJsonField<string[]>(typeof child.parentMemberIds === 'string' ? child.parentMemberIds : null, []),
      groupIds: parseJsonField<string[]>(typeof child.groupIds === 'string' ? child.groupIds : null, []),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !canManage(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const now = new Date().toISOString();
  const id = generateId();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "ChildProfile" (
        id, name, birthDate, parentMemberIds, allergies, medications, healthHistory,
        dietaryRestrictions, canDoPhysicalActivities, notes, groupIds, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    String(body.name ?? '').trim(),
    body.birthDate ? new Date(body.birthDate).toISOString() : null,
    JSON.stringify(normalizeStringArray(body.parentMemberIds)),
    typeof body.allergies === 'string' ? body.allergies.trim() || null : null,
    typeof body.medications === 'string' ? body.medications.trim() || null : null,
    typeof body.healthHistory === 'string' ? body.healthHistory.trim() || null : null,
    typeof body.dietaryRestrictions === 'string' ? body.dietaryRestrictions.trim() || null : null,
    body.canDoPhysicalActivities === false ? 0 : 1,
    typeof body.notes === 'string' ? body.notes.trim() || null : null,
    JSON.stringify(normalizeStringArray(body.groupIds)),
    now,
    now,
    null
  );

  return NextResponse.json({ success: true, id }, { status: 201 });
}
