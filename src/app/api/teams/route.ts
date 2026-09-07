import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';
import { ensureGroupTeamCompatibility, parseCapabilities, parseLeaderIds, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);
  const teams = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT g.id, g.name, g.description, g.color, g.icon, g.capabilities, t.leaderIds, g.createdAt, g.updatedAt, g.deletedAt
      FROM "Group" g
      LEFT JOIN "Team" t ON t.id = g.id AND t.deletedAt IS NULL
      WHERE g.deletedAt IS NULL AND g.type = 'team'
      ORDER BY name ASC
    `
  );

  const payload = teams.map((team) => ({
    ...team,
    leaderIds: parseLeaderIds(typeof team.leaderIds === 'string' ? team.leaderIds : null),
    capabilities: parseCapabilities(typeof team.capabilities === 'string' ? team.capabilities : null),
  }));
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR', 'LEADER'].includes(role ?? '')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { name, description, color, icon, memberIds, leaderIds } = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const teamId = generateId();
  await upsertCanonicalTeamGroup(prisma, {
    id: teamId,
    name,
    description,
    color,
    icon,
    memberIds: Array.isArray(memberIds) ? memberIds : [],
    leaderIds: Array.isArray(leaderIds) ? leaderIds : [],
  });

  return NextResponse.json({ success: true, id: teamId }, { status: 201 });
}
