import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function dateValue(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ValidationError('Data de nascimento inválida.');
  return date;
}

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  const user = await prisma.user.findFirst({ where: { id: session.user.id, deletedAt: null, active: true } });
  if (!user) throw new UnauthenticatedError();
  const [userProfile] = await prisma.$queryRawUnsafe<Array<{ avatarUrl: string | null }>>(
    `SELECT avatarUrl FROM "User" WHERE id = ? LIMIT 1`,
    user.id,
  );
  const member = user.linkedMemberId
    ? await prisma.member.findFirst({ where: { id: user.linkedMemberId, deletedAt: null } })
    : null;
  return { session, prisma, user, member, avatarUrl: userProfile?.avatarUrl ?? null };
}

function serialize(user: Awaited<ReturnType<typeof getContext>>['user'], member: Awaited<ReturnType<typeof getContext>>['member'], avatarUrl: string | null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl,
    role: user.role,
    linkedMemberId: user.linkedMemberId,
    phone: member?.phone ?? '',
    birthDate: member?.birthDate?.toISOString() ?? null,
    aboutMe: member?.aboutMe ?? '',
    maritalStatus: member?.maritalStatus ?? 'single',
  };
}

export async function GET() {
  try {
    const context = await getContext();
    return jsonOk(serialize(context.user, context.member, context.avatarUrl));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getContext();
    const body = await request.json() as Record<string, unknown>;
    const name = text(body.name);
    if (!name) throw new ValidationError('Nome é obrigatório.');

    const avatarUrl = body.avatarUrl === null ? null : text(body.avatarUrl);
    if (avatarUrl && !avatarUrl.startsWith(`/api/files/${context.session.user.tenantSlug}/profile/`)) {
      throw new ValidationError('Avatar inválido.');
    }

    const memberData = context.member ? {
      name,
      phone: text(body.phone),
      birthDate: dateValue(body.birthDate),
      aboutMe: text(body.aboutMe) || null,
      maritalStatus: text(body.maritalStatus) || 'single',
    } : null;

    const updatedAt = new Date().toISOString();
    await context.prisma.$executeRawUnsafe(
      `UPDATE "User" SET name = ?, avatarUrl = ?, version = version + 1, updatedAt = ? WHERE id = ?`,
      name,
      avatarUrl || null,
      updatedAt,
      context.user.id,
    );
    const updatedUser = await context.prisma.user.findFirst({ where: { id: context.user.id, deletedAt: null, active: true } });
    const updatedMember = context.member && memberData
      ? await context.prisma.member.update({ where: { id: context.member.id }, data: memberData })
      : context.member;

    return jsonOk(serialize(updatedUser ?? context.user, updatedMember, avatarUrl || null));
  } catch (error) {
    return jsonError(error);
  }
}
