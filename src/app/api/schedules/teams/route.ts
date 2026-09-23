import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { generateId } from '@/lib/id';
import { ensureGroupTeamCompatibility, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';
import { hasActionPermission } from '@/lib/access-control';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'groups', 'view')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureGroupTeamCompatibility(prisma);

  try {
    const teams = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `
        SELECT g.id, g.name, g.description, g.color, g.icon, g.createdAt, g.updatedAt, g.deletedAt
        FROM "Group" g
        WHERE g.type = 'team' AND g.deletedAt IS NULL
        ORDER BY g.name ASC
      `
    );
    return NextResponse.json(teams);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar equipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'groups', 'create')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const data = await request.json();
  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureGroupTeamCompatibility(prisma);

  try {
    const id = generateId();
    await upsertCanonicalTeamGroup(prisma, {
      id,
      name: String(data.name ?? '').trim(),
      description: typeof data.description === 'string' ? data.description : '',
      color: typeof data.color === 'string' ? data.color : 'primary',
      icon: typeof data.icon === 'string' ? data.icon : 'users',
      memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
      leaderIds: Array.isArray(data.leaderIds) ? data.leaderIds : [],
    });
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar equipe' }, { status: 500 });
  }
}
