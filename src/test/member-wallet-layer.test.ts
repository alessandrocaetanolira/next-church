import { describe, expect, it, vi } from 'vitest';
import { MemberWalletPolicy } from '@/server/member-wallet/member-wallet.policy';
import { MemberWalletService } from '@/server/member-wallet/member-wallet.service';
import type { MemberWalletRepository } from '@/server/member-wallet/member-wallet.repository';

function repositoryMock(overrides: Partial<Record<keyof MemberWalletRepository, unknown>> = {}) {
  return {
    findMember: vi.fn().mockResolvedValue({
      id: 'member-1', name: 'Ana', email: 'ana@church.test', creditBalance: 12,
      createdAt: new Date('2026-10-01T12:00:00.000Z'), updatedAt: new Date('2026-10-01T12:00:00.000Z'), deletedAt: null,
    }),
    listSales: vi.fn().mockResolvedValue([{
      id: 'sale-1', total: 12, paymentMethod: 'fiado', consumerType: 'MEMBER', orderStatus: null,
      items: JSON.stringify([{ name: 'Café', quantity: 1, price: 12 }]), memberId: 'member-1', memberName: 'Ana', createdBy: 'Cantina',
      createdAt: new Date('2026-10-01T12:00:00.000Z'), updatedAt: new Date('2026-10-01T12:00:00.000Z'), deletedAt: null,
    }]),
    listLedger: vi.fn().mockResolvedValue([
      { id: 'debit-1', type: 'debit', amount: 20, saleId: 'sale-1', notes: 'Compra', createdBy: 'Cantina', createdAt: new Date('2026-10-01T12:00:00.000Z') },
      { id: 'payment-1', type: 'payment', amount: 8, saleId: null, notes: 'Pagamento', createdBy: 'Caixa', createdAt: new Date('2026-10-02T12:00:00.000Z') },
    ]),
    getLedgerTotals: vi.fn().mockResolvedValue({ debits: 20, payments: 8 }),
    ...overrides,
  } as unknown as MemberWalletRepository;
}

describe('carteira do membro', () => {
  it('permite MEMBER vinculado consultar somente a própria carteira', () => {
    expect(() => MemberWalletPolicy.assertViewOwn({ tenantId: 'church-a', linkedMemberId: 'member-1' })).not.toThrow();
    expect(() => MemberWalletPolicy.assertViewOwn({ tenantId: 'church-a' })).toThrow('vinculada');
  });

  it('retorna saldo, compras e extrato serializados', async () => {
    const repository = repositoryMock();
    const service = new MemberWalletService(repository);

    const wallet = await service.getOwnWallet({ linkedMemberId: 'member-1', email: 'ana@church.test' });

    expect(repository.findMember).toHaveBeenCalledWith({ linkedMemberId: 'member-1', email: 'ana@church.test' });
    expect(wallet.summary).toEqual({ debits: 20, payments: 8, balance: 12 });
    expect(wallet.sales[0].items).toEqual([{ name: 'Café', quantity: 1, price: 12 }]);
    expect(wallet.ledger[0].createdAt).toBe('2026-10-01T12:00:00.000Z');
  });

  it('não expõe extrato quando não há membro vinculado', async () => {
    const service = new MemberWalletService(repositoryMock({ findMember: vi.fn().mockResolvedValue(null) }));
    await expect(service.getOwnWallet({ email: 'ausente@church.test' })).resolves.toEqual({ member: null, summary: null, sales: [], ledger: [], ledgerNextCursor: null });
  });

  it('entrega o extrato em páginas por cursor', async () => {
    const ledger = Array.from({ length: 21 }, (_, index) => ({
      id: `entry-${index}`, type: 'debit', amount: 1, saleId: null, notes: null, createdBy: null,
      createdAt: new Date(`2026-10-${String(21 - index).padStart(2, '0')}T12:00:00.000Z`),
    }));
    const repository = repositoryMock({ listLedger: vi.fn().mockResolvedValue(ledger) });
    const service = new MemberWalletService(repository);

    const wallet = await service.getOwnWallet({ linkedMemberId: 'member-1' });

    expect(repository.listLedger).toHaveBeenCalledWith('member-1', { cursor: null, take: 21 });
    expect(wallet.ledger).toHaveLength(20);
    expect(wallet.ledgerNextCursor).toBe('2026-10-02T12:00:00.000Z|entry-19');
  });
});
