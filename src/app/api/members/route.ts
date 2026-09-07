import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { normalizeMemberInput, validateMemberInput } from '@/features/members/lib/member-registration';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const [members, users] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      creditBalance: number | null;
      teamIds: string | null;
      parentPhone: string | null;
      birthDate: Date | null;
      conversionDate: Date | null;
      baptismDate: Date | null;
      previousChurch: string | null;
      aboutMe: string | null;
      maritalStatus: string | null;
      approved: boolean;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>>(
      `
        SELECT id, name, email, phone, creditBalance, teamIds, parentPhone, birthDate, conversionDate, baptismDate, previousChurch, aboutMe, maritalStatus, approved, createdAt, updatedAt, deletedAt
        FROM "Member"
        WHERE deletedAt IS NULL
        ORDER BY name ASC
      `
    ),
    prisma.user.findMany({ where: { deletedAt: null } }),
  ]);

  const payload = members.map((member) => {
    const linkedUser =
      users.find((user) => user.linkedMemberId === member.id) ??
      users.find((user) => user.email === member.email);

    return {
      ...member,
      creditBalance: member.creditBalance ?? 0,
      teamIds: member.teamIds
        ? member.teamIds.split(',').map((teamId: string) => teamId.trim()).filter(Boolean)
        : [],
      userId: linkedUser?.id ?? null,
      role: linkedUser?.role ?? null,
      permissions: linkedUser?.permissions
        ? linkedUser.permissions.split(',').map((permission) => permission.trim()).filter(Boolean)
        : [],
      hasAccess: Boolean(linkedUser),
    };
  });

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !['ADMIN', 'PASTOR'].includes((session.user as any).role)) 
    return new NextResponse("Forbidden", { status: 403 });

  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const data = normalizeMemberInput(await req.json());
  const validationError = validateMemberInput(data);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existingMember = await prisma.member.findFirst({
    where: {
      email: data.email,
      deletedAt: null,
    },
  });

  if (existingMember) {
    return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 });
  }

  const memberId = generateId();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Member" (
        id, name, email, phone, parentPhone, creditBalance, active, approved,
        birthDate, conversionDate, baptismDate, previousChurch, aboutMe, teamIds,
        maritalStatus, passwordHash, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    memberId,
    data.name,
    data.email,
    data.phone,
    data.parentPhone ?? null,
    0,
    true,
    data.approved ?? true,
    data.birthDate?.toISOString() ?? null,
    data.conversionDate?.toISOString() ?? null,
    data.baptismDate?.toISOString() ?? null,
    data.previousChurch ?? null,
    data.aboutMe ?? null,
    null,
    data.maritalStatus ?? null,
    null,
    now,
    now,
    null
  );

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  return NextResponse.json(member, { status: 201 });
}
