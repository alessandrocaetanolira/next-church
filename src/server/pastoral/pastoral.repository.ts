import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export type PendingMember = {
  id: string; name: string; email: string; phone: string; birthDate: Date | null; conversionDate: Date | null;
  baptismDate: Date | null; previousChurch: string | null; aboutMe: string | null; maritalStatus: string | null; createdAt: Date;
};

export class PastoralRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  listPending() {
    return this.prisma.$queryRawUnsafe<PendingMember[]>(`
      SELECT id, name, email, phone, birthDate, conversionDate, baptismDate, previousChurch, aboutMe, maritalStatus, createdAt
      FROM "Member" WHERE approved = 0 AND deletedAt IS NULL ORDER BY createdAt DESC
    `);
  }

  findMemberForApproval(id: string) {
    return this.prisma.$queryRawUnsafe<Array<{ id: string; name: string; email: string; passwordHash: string | null }>>(`SELECT id, name, email, passwordHash FROM "Member" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id).then(([member]) => member ?? null);
  }

  async approve(memberId: string, member: { name: string; email: string; passwordHash: string }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: member.email } });
      if (!existing) {
        await tx.user.create({ data: { name: member.name, email: member.email, passwordHash: member.passwordHash, role: 'MEMBER', permissions: '', linkedMemberId: memberId, active: true } });
      }
      return tx.member.update({ where: { id: memberId }, data: { approved: true, updatedAt: new Date() } });
    });
  }

  reject(id: string) {
    return this.prisma.member.update({ where: { id }, data: { deletedAt: new Date(), updatedAt: new Date() } });
  }
}
