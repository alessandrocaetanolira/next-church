import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import bcrypt from 'bcryptjs';
import { hasActionPermission } from '@/lib/access-control';

const allowedRoles = ['ADMIN', 'PASTOR', 'LEADER', 'MEMBER'] as const;
const allowedPermissions = [
  'canteen', 'settings', 'tasks', 'teams', 'materials', 'pastor',
  'members:view', 'members:create', 'members:update', 'members:delete',
  'members:approve', 'members:manage_access', 'members:export',
  'groups:view', 'groups:create', 'groups:update', 'groups:delete', 'groups:manage_access',
  'tasks:view', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:export',
  'materials:view', 'materials:create', 'materials:update', 'materials:delete', 'materials:manage', 'materials:request', 'materials:export',
  'canteen:view', 'canteen:catalog', 'canteen:order', 'canteen:create', 'canteen:update', 'canteen:delete', 'canteen:manage', 'canteen:operate', 'canteen:sell', 'canteen:manage_products', 'canteen:export',
  'pastoral:view', 'pastoral:create', 'pastoral:update', 'pastoral:delete', 'pastoral:export',
  'kids:view', 'kids:create', 'kids:update', 'kids:delete',
  'parking:view', 'parking:create', 'parking:update', 'parking:delete',
  'feed:view', 'feed:create', 'feed:publish', 'feed:share', 'feed:comment', 'feed:moderate', 'feed:update', 'feed:delete',
  'settings:view', 'settings:update',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'members', 'manage_access')) {
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
