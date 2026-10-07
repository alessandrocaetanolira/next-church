import { MemberWalletRepository } from './member-wallet.repository';

function serializeSale(sale: Awaited<ReturnType<MemberWalletRepository['listSales']>>[number]) {
  return {
    ...sale,
    items: JSON.parse(sale.items || '[]'),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    deletedAt: sale.deletedAt?.toISOString() ?? null,
  };
}

export class MemberWalletService {
  constructor(private readonly repository: MemberWalletRepository) {}

  async getOwnWallet(identity: { linkedMemberId?: string | null; email?: string | null }, ledgerCursor?: string | null) {
    const member = await this.repository.findMember(identity);
    if (!member) return { member: null, summary: null, sales: [], ledger: [], ledgerNextCursor: null };

    const cursorParts = ledgerCursor?.split('|') ?? [];
    const parsedCursor = cursorParts.length === 2 && !Number.isNaN(new Date(cursorParts[0]).getTime())
      ? { createdAt: new Date(cursorParts[0]), id: cursorParts[1] }
      : null;
    const pageSize = 20;

    const [sales, ledgerRows, totals] = await Promise.all([
      this.repository.listSales(member.id),
      this.repository.listLedger(member.id, { cursor: parsedCursor, take: pageSize + 1 }),
      this.repository.getLedgerTotals(member.id),
    ]);
    const hasMore = ledgerRows.length > pageSize;
    const ledger = ledgerRows.slice(0, pageSize);
    const lastEntry = ledger.at(-1);
    const summary = { ...totals, balance: member.creditBalance ?? 0 };

    return {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
        deletedAt: member.deletedAt?.toISOString() ?? null,
      },
      summary,
      sales: sales.map(serializeSale),
      ledger: ledger.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
      ledgerNextCursor: hasMore && lastEntry ? `${lastEntry.createdAt.toISOString()}|${lastEntry.id}` : null,
    };
  }
}
