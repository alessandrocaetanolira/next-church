import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanteenSalesService } from '@/server/canteen/sales.service';
import { CanteenSalesDetailService } from '@/server/canteen/sales-detail.service';
import { CanteenLedgerService } from '@/server/canteen/ledger.service';
import { CanteenOperationService } from '@/server/canteen/operation.service';
import { CanteenOperationPolicy } from '@/server/canteen/operation.policy';
import type { CanteenSalesRepository, SaleRecord } from '@/server/canteen/sales.repository';
import type { CanteenLedgerRepository } from '@/server/canteen/ledger.repository';
import type { CanteenOperationRepository } from '@/server/canteen/operation.repository';

const { getStatusMock, notifyOrderMock, notifyMemberMock, notifyOpenedMock, publishArchivedMock } = vi.hoisted(() => ({
  getStatusMock: vi.fn(),
  notifyOrderMock: vi.fn(),
  notifyMemberMock: vi.fn(),
  notifyOpenedMock: vi.fn(),
  publishArchivedMock: vi.fn(),
}));

vi.mock('@/lib/server/canteen-operation', () => ({ getCanteenStatus: getStatusMock }));
vi.mock('@/lib/server/notification-service', () => ({
  notifyCanteenNewOrder: notifyOrderMock,
  notifyMemberOrderUpdate: notifyMemberMock,
  notifyCanteenOpened: notifyOpenedMock,
  publishCanteenOrderArchived: publishArchivedMock,
}));

const member = { role: 'MEMBER', permissions: ['canteen:order'], planFeatures: ['canteen'], linkedMemberId: 'member-1' };
const operator = { role: 'ADMIN', permissions: ['canteen:view', 'canteen:sell', 'canteen:operate'], planFeatures: ['canteen'] };

const sale: SaleRecord = {
  id: 'sale-1', total: 12, paymentMethod: 'pending', consumerType: 'MEMBER', orderStatus: 'pending', items: JSON.stringify([{ productId: 'product-1', name: 'Água', quantity: 1, price: 12 }]),
  memberId: 'member-1', memberName: 'João', createdBy: 'admin', createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};

function salesRepository(overrides: Partial<Record<keyof CanteenSalesRepository, unknown>> = {}) {
  return {
    list: vi.fn(), findById: vi.fn().mockResolvedValue(sale), create: vi.fn().mockResolvedValue({ ...sale, items: [{ productId: 'product-1', name: 'Água', quantity: 1, price: 12 }], createdAt: sale.createdAt.toISOString(), updatedAt: sale.updatedAt.toISOString(), deletedAt: null }),
    reject: vi.fn().mockResolvedValue({ ...sale, paymentMethod: 'cancelled', orderStatus: 'cancelled' }),
    updateStatus: vi.fn().mockResolvedValue({ ...sale, orderStatus: 'ready' }),
    approve: vi.fn().mockResolvedValue({ ...sale, paymentMethod: 'pix', orderStatus: 'preparing' }),
    ...overrides,
  } as unknown as CanteenSalesRepository;
}

function ledgerRepository(overrides: Partial<Record<keyof CanteenLedgerRepository, unknown>> = {}) {
  return {
    findMemberLedger: vi.fn().mockResolvedValue({ member: { id: 'member-1', name: 'João', creditBalance: 30, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }, entries: [] }),
    registerPayment: vi.fn().mockResolvedValue({ id: 'member-1', name: 'João', creditBalance: 20, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }),
    ...overrides,
  } as unknown as CanteenLedgerRepository;
}

describe('regras transacionais da cantina', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatusMock.mockResolvedValue({ isOpen: true });
  });

  it('permite consultar o status para quem pode vender ou fazer pedidos', () => {
    expect(() => CanteenOperationPolicy.assertView(member)).not.toThrow();
    expect(() => CanteenOperationPolicy.assertView({ role: 'MEMBER', permissions: ['canteen:sell'], planFeatures: ['canteen'] })).not.toThrow();
    expect(() => CanteenOperationPolicy.assertView({ role: 'MEMBER', permissions: [], planFeatures: ['canteen'] })).toThrow('estado da cantina');
  });

  it('aceita pedido pendente de membro e notifica a cantina', async () => {
    const repository = salesRepository();
    const service = new CanteenSalesService(repository, {} as never, 'tenant-1');

    await service.create({ total: 12, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: 'product-1', name: 'Água', quantity: 1, price: 12 }], memberId: 'member-1' }, member);

    expect(repository.create).toHaveBeenCalled();
    expect(notifyOrderMock).toHaveBeenCalledWith(expect.anything(), 'tenant-1', expect.objectContaining({ id: 'sale-1' }));
  });

  it('bloqueia venda não pendente quando o usuário só pode pedir', async () => {
    const service = new CanteenSalesService(salesRepository(), {} as never, 'tenant-1');

    await expect(service.create({ total: 12, paymentMethod: 'pix', items: [{ name: 'Água', quantity: 1, price: 12 }] }, member)).rejects.toThrow('Membros devem enviar');
  });

  it('aceita venda direta para visitante sem criar vínculo de membro', async () => {
    const repository = salesRepository();
    const service = new CanteenSalesService(repository, {} as never, 'tenant-1');

    await service.create({
      total: 12,
      consumerType: 'VISITOR',
      paymentMethod: 'pix',
      orderStatus: 'pending',
      items: [{ name: 'Água', quantity: 1, price: 12 }],
    }, operator);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ consumerType: 'VISITOR', memberId: null, memberName: null }));
  });

  it('bloqueia fiado para visitante ou consumidor não identificado', async () => {
    const service = new CanteenSalesService(salesRepository(), {} as never, 'tenant-1');

    await expect(service.create({
      total: 12,
      consumerType: 'VISITOR',
      paymentMethod: 'fiado',
      items: [{ name: 'Água', quantity: 1, price: 12 }],
    }, operator)).rejects.toThrow('somente para membros');
  });

  it('bloqueia pedidos quando a cantina está fechada', async () => {
    getStatusMock.mockResolvedValue({ isOpen: false });
    const repository = salesRepository();
    const service = new CanteenSalesService(repository, {} as never, 'tenant-1');

    await expect(service.create({ total: 12, paymentMethod: 'pending', orderStatus: 'pending', items: [{ name: 'Água', quantity: 1, price: 12 }] }, member)).rejects.toThrow('fechada');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('aprova uma venda, baixa estoque via repository e notifica o membro', async () => {
    const repository = salesRepository();
    const service = new CanteenSalesDetailService(repository, {} as never, 'tenant-1');

    await service.execute('sale-1', { action: 'approve', paymentMethod: 'pix' }, 'Admin');

    expect(repository.approve).toHaveBeenCalledWith('sale-1', 'pix', 'Admin');
    expect(notifyMemberMock).toHaveBeenCalledWith(expect.anything(), 'tenant-1', expect.objectContaining({ type: 'canteen-order-approved' }));
  });

  it('altera status e envia a notificação correspondente', async () => {
    const repository = salesRepository();
    const service = new CanteenSalesDetailService(repository, {} as never, 'tenant-1');

    await service.execute('sale-1', { action: 'status', orderStatus: 'ready' }, 'Admin');

    expect(repository.updateStatus).toHaveBeenCalledWith('sale-1', 'ready');
    expect(notifyMemberMock).toHaveBeenCalledWith(expect.anything(), 'tenant-1', expect.objectContaining({ type: 'canteen-order-ready' }));
  });

  it('remove da fila somente pedido que já está pronto', async () => {
    const repository = salesRepository({
      findById: vi.fn().mockResolvedValue({ ...sale, orderStatus: 'ready' }),
      archive: vi.fn().mockResolvedValue({ ...sale, orderStatus: 'ready', deletedAt: new Date() }),
    });
    const service = new CanteenSalesDetailService(repository, {} as never, 'tenant-1');

    await service.execute('sale-1', { action: 'archive' }, 'Admin');

    expect(repository.archive).toHaveBeenCalledWith('sale-1');
    expect(publishArchivedMock).toHaveBeenCalledWith(expect.anything(), 'tenant-1', { id: 'sale-1' });
  });

  it('recusa remoção de pedido ainda em preparo', async () => {
    const repository = salesRepository({ findById: vi.fn().mockResolvedValue({ ...sale, orderStatus: 'preparing' }) });
    const service = new CanteenSalesDetailService(repository, {} as never, 'tenant-1');

    await expect(service.execute('sale-1', { action: 'archive' }, 'Admin')).rejects.toThrow('Somente pedidos prontos');
  });

  it('registra pagamento e impede valor maior que o saldo', async () => {
    const repository = ledgerRepository();
    const service = new CanteenLedgerService(repository);

    await service.payment('member-1', { amount: 10 }, 'Admin');
    expect(repository.registerPayment).toHaveBeenCalledWith('member-1', 10, 'Admin');

    await expect(service.payment('member-1', { amount: 40 }, 'Admin')).rejects.toThrow('maior que a dívida');
  });

  it('notifica todos ao abrir a cantina, mas não repete ao manter aberta', async () => {
    const repository = {
      getStatus: vi.fn()
        .mockResolvedValueOnce({ isOpen: false })
        .mockResolvedValueOnce({ isOpen: true }),
      setStatus: vi.fn().mockResolvedValue({ isOpen: true, openedAt: new Date(), closedAt: null, updatedBy: 'admin@test.local' }),
    } as unknown as CanteenOperationRepository;
    const service = new CanteenOperationService(repository, {} as never, 'tenant-1');

    await service.setStatus({ isOpen: true }, 'admin@test.local');
    await service.setStatus({ isOpen: true }, 'admin@test.local');

    expect(notifyOpenedMock).toHaveBeenCalledTimes(1);
    expect(notifyOpenedMock).toHaveBeenCalledWith(expect.anything(), 'tenant-1', { email: 'admin@test.local' });
  });
});
