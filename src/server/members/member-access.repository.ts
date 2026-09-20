import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class MemberAccessRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  findMember(id: string) {
    return this.prisma.member.findFirst({ where: { id, deletedAt: null } });
  }

  findUser(memberId: string, email: string) {
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ linkedMemberId: memberId }, { email }],
      },
    });
  }

  saveUser(data: {
    id?: string;
    name: string;
    email: string;
    role: string;
    permissions: string;
    linkedMemberId: string;
    passwordHash: string | null;
  }) {
    const userData = {
      name: data.name,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
      linkedMemberId: data.linkedMemberId,
      passwordHash: data.passwordHash,
      active: true,
      updatedAt: new Date(),
    };

    return data.id
      ? this.prisma.user.update({ where: { id: data.id }, data: userData })
      : this.prisma.user.create({ data: userData });
  }
}
