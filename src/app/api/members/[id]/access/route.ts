import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import bcrypt from 'bcryptjs';

const allowedRoles = ['ADMIN', 'PASTOR', 'LEADER', 'MEMBER'] as const;
const allowedPermissions = ['canteen', 'settings', 'tasks', 'teams', 'materials', 'pastor'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const sessionRole = session?.user?.role?.toUpperCase();

  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(sessionRole ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { role, permissions, password } = await request.json();
  const { id } = await params;
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (!allowedRoles.includes(normalizedRole as (typeof allowedRoles)[number])) {
    return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });
  }

  const normalizedPermissions = Array.isArray(permissions)
    ? permissions
        .filter((permission): permission is string => typeof permission === 'string')
        .map((permission) => permission.toLowerCase())
        .filter((permission, index, list) => allowedPermissions.includes(permission as (typeof allowedPermissions)[number]) && list.indexOf(permission) === index)
    : [];

  const prisma = getTenantClient(session.user.tenantId);
  const member = await prisma.member.findUnique({ where: { id } });

  if (!member || member.deletedAt) {
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
  }

  const existingUser =
    (await prisma.user.findFirst({ where: { linkedMemberId: id, deletedAt: null } })) ??
    (await prisma.user.findUnique({ where: { email: member.email } }).catch(() => null));

  if (!existingUser && normalizedPassword.length < 6) {
    return NextResponse.json({ error: 'Defina uma senha com pelo menos 6 caracteres para liberar o acesso.' }, { status: 400 });
  }

  const hashedPassword = normalizedPassword.length > 0
    ? await bcrypt.hash(normalizedPassword, 10)
    : existingUser?.passwordHash ?? null;

  const userData = {
    name: member.name,
    email: member.email,
    role: normalizedRole,
    permissions: normalizedPermissions.join(','),
    linkedMemberId: member.id,
    passwordHash: hashedPassword,
    active: true,
    updatedAt: new Date(),
  };

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: userData,
      })
    : await prisma.user.create({
        data: userData,
      });

  if (normalizedPassword.length > 0) {
    if (normalizedPassword.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }
  }

  return NextResponse.json({
    success: true,
    userId: user.id,
    role: user.role,
    permissions: normalizedPermissions,
    hasPassword: Boolean(hashedPassword),
  });
}
