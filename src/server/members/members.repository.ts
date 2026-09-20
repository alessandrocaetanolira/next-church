import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class MembersRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async list() {
    const [members, users] = await Promise.all([
      this.prisma.member.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { deletedAt: null } }),
    ]);

    return members.map((member) => {
      const linkedUser = users.find((user) => user.linkedMemberId === member.id) ?? users.find((user) => user.email === member.email);
      return {
        ...member,
        creditBalance: member.creditBalance ?? 0,
        teamIds: member.teamIds ? member.teamIds.split(',').map((id) => id.trim()).filter(Boolean) : [],
        userId: linkedUser?.id ?? null,
        role: linkedUser?.role ?? null,
        permissions: linkedUser?.permissions ? linkedUser.permissions.split(',').map((permission) => permission.trim()).filter(Boolean) : [],
        hasAccess: Boolean(linkedUser),
      };
    });
  }

  async findById(id: string) {
    const [member, users] = await Promise.all([
      this.prisma.member.findFirst({ where: { id, deletedAt: null } }),
      this.prisma.user.findMany({ where: { deletedAt: null } }),
    ]);
    if (!member) return null;

    const linkedUser = users.find((user) => user.linkedMemberId === member.id) ?? users.find((user) => user.email === member.email);
    return {
      ...member,
      teamIds: member.teamIds ? member.teamIds.split(',').map((teamId) => teamId.trim()).filter(Boolean) : [],
      userId: linkedUser?.id ?? null,
      role: linkedUser?.role ?? null,
      permissions: linkedUser?.permissions ? linkedUser.permissions.split(',').map((permission) => permission.trim()).filter(Boolean) : [],
      hasAccess: Boolean(linkedUser),
    };
  }

  findByEmail(email: string) {
    return this.prisma.member.findFirst({ where: { email, deletedAt: null } });
  }

  create(data: {
    id: string; name: string; email: string; phone: string; parentPhone?: string | null;
    birthDate?: Date | null; conversionDate?: Date | null; baptismDate?: Date | null;
    previousChurch?: string | null; aboutMe?: string | null; maritalStatus?: string | null; approved: boolean;
  }) {
    return this.prisma.member.create({
      data: {
        id: data.id, name: data.name, email: data.email, phone: data.phone,
        parentPhone: data.parentPhone ?? null, birthDate: data.birthDate ?? null,
        conversionDate: data.conversionDate ?? null, baptismDate: data.baptismDate ?? null,
        previousChurch: data.previousChurch ?? null, aboutMe: data.aboutMe ?? null,
        maritalStatus: data.maritalStatus ?? null, approved: data.approved, active: true,
      },
    });
  }

  update(id: string, data: {
    name: string; email: string; phone: string; parentPhone?: string | null;
    birthDate?: Date | null; conversionDate?: Date | null; baptismDate?: Date | null;
    previousChurch?: string | null; aboutMe?: string | null; maritalStatus?: string | null; approved: boolean;
  }) {
    return this.prisma.member.update({
      where: { id },
      data: {
        name: data.name, email: data.email, phone: data.phone,
        parentPhone: data.parentPhone ?? null, birthDate: data.birthDate ?? null,
        conversionDate: data.conversionDate ?? null, baptismDate: data.baptismDate ?? null,
        previousChurch: data.previousChurch ?? null, aboutMe: data.aboutMe ?? null,
        maritalStatus: data.maritalStatus ?? null, approved: data.approved,
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.member.update({ where: { id }, data: { deletedAt: new Date(), updatedAt: new Date() } });
  }
}
