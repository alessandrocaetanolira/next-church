import bcrypt from 'bcryptjs';
import { PERMISSION_MODULES, PERMISSION_CATALOG } from '@/lib/permission-catalog';
import { ValidationError, NotFoundError } from '@/lib/http/errors';
import { MemberAccessRepository } from './member-access.repository';

const ALLOWED_ROLES = new Set(['ADMIN', 'PASTOR', 'LEADER', 'MEMBER']);
const ALLOWED_PERMISSIONS = new Set([
  ...PERMISSION_MODULES,
  ...PERMISSION_MODULES.flatMap((module) => PERMISSION_CATALOG[module].map((action) => `${module}:${action}`)),
  'pastor',
]);

export class MemberAccessService {
  constructor(private readonly repository: MemberAccessRepository) {}

  async update(memberId: string, input: unknown) {
    const member = await this.repository.findMember(memberId);
    if (!member) throw new NotFoundError('Membro não encontrado.');

    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const role = typeof body.role === 'string' ? body.role.toUpperCase() : '';
    if (!ALLOWED_ROLES.has(role)) throw new ValidationError('Perfil inválido.');

    const permissions = Array.isArray(body.permissions)
      ? body.permissions
        .filter((permission): permission is string => typeof permission === 'string')
        .map((permission) => permission.toLowerCase())
        .filter((permission, index, list) => ALLOWED_PERMISSIONS.has(permission) && list.indexOf(permission) === index)
      : [];

    const password = typeof body.password === 'string' ? body.password.trim() : '';
    if (password.length > 0 && password.length < 6) {
      throw new ValidationError('A senha deve ter pelo menos 6 caracteres.');
    }

    const existingUser = await this.repository.findUser(memberId, member.email);
    if (!existingUser && password.length === 0) {
      throw new ValidationError('Defina uma senha com pelo menos 6 caracteres para liberar o acesso.');
    }

    const passwordHash = password.length > 0
      ? await bcrypt.hash(password, 10)
      : existingUser?.passwordHash ?? null;

    const user = await this.repository.saveUser({
      id: existingUser?.id,
      name: member.name,
      email: member.email,
      role,
      permissions: permissions.join(','),
      linkedMemberId: member.id,
      passwordHash,
    });

    return {
      success: true,
      userId: user.id,
      role: user.role,
      permissions,
      hasPassword: Boolean(passwordHash),
    };
  }
}
