import type { PrismaClient } from '@/generated/prisma-tenant';

const memberFields = {
  id: true, name: true, email: true, phone: true, teamIds: true,
  active: true, approved: true, createdAt: true, updatedAt: true, deletedAt: true,
} as const;
const productFields = {
  id: true, name: true, description: true, imageUrl: true, price: true, stock: true,
  category: true, active: true, availableToday: true, createdAt: true, updatedAt: true, deletedAt: true,
} as const;

/** Rotinas legadas gravam ISO no SQLite em vez de epoch em milissegundos.
 * A checagem final mantém a janela para ambos os formatos, inclusive tombstones. */
function inWindow<T extends { updatedAt: Date }>(rows: T[], since: Date, until: Date) {
  return rows.filter((row) => {
    const time = new Date(row.updatedAt).getTime();
    return time > since.getTime() && time <= until.getTime();
  });
}

/** Seleções explícitas impedem incluir campos novos/sensíveis no sync por acidente. */
export class SyncPullRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async products(since: Date, until: Date, withCosts: boolean) {
    const rows = await this.prisma.product.findMany({
      where: { updatedAt: { gt: since } },
      select: { ...productFields, ...(withCosts ? { cost: true, minStock: true } : {}) },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return inWindow(rows, since, until);
  }

  async members(since: Date, until: Date, memberId: string | null, withBalance: boolean) {
    const rows = await this.prisma.member.findMany({
      where: { updatedAt: { gt: since }, ...(memberId ? { id: memberId } : {}) },
      select: { ...memberFields, ...(withBalance ? { creditBalance: true } : {}) },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return inWindow(rows, since, until);
  }

  async memberTeamIds(memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, active: true, approved: true, deletedAt: null }, select: { teamIds: true },
    });
    return (member?.teamIds ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  }

  async tasks(since: Date, until: Date, teamIds?: string[]) {
    const rows = await this.prisma.task.findMany({
      where: { updatedAt: { gt: since }, ...(teamIds ? { teamId: { in: teamIds } } : {}) },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return inWindow(rows, since, until);
  }

  async sales(since: Date, until: Date, memberId?: string) {
    const rows = await this.prisma.sale.findMany({
      where: { updatedAt: { gt: since }, ...(memberId ? { memberId } : {}) },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return inWindow(rows, since, until);
  }
}
