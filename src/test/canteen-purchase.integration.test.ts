import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@/generated/prisma-tenant';
import { POST as createSale } from '@/app/api/canteen/sales/route';
import { POST as syncPush } from '@/app/api/sync/push/route';
import { GET as syncPull } from '@/app/api/sync/pull/route';
import { CanteenSalesService } from '@/server/canteen/sales.service';
import { CanteenSalesRepository } from '@/server/canteen/sales.repository';
import { SyncPushRepository } from '@/server/sync/sync-push.repository';
import { parseSyncChange, syncPayloadHash } from '@/server/sync/sync-push.contract';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), notify: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: mocks.client }));
vi.mock('@/lib/server/notification-service', () => ({
  notifyCanteenNewOrder: mocks.notify, notifyMemberCreditUpdate: vi.fn(),
  notifyMemberOrderUpdate: vi.fn(), publishCanteenOrderArchived: vi.fn(),
}));

describe('compra pessoal real por API e sincronização, isolada por tenant', () => {
  let directory: string;
  let a: PrismaClient;
  let b: PrismaClient;
  const buyer = { id: 'user-a', tenantId: 'tenant-a', role: 'MEMBER', email: 'buyer@test.local', name: 'Comprador', linkedMemberId: 'self',
    permissions: ['canteen:catalog', 'canteen:order'], planFeatures: ['canteen', 'offline_sync'] };
  const input = () => ({ intent: 'purchase', total: 5, paymentMethod: 'pending', orderStatus: 'pending',
    memberId: 'other', memberName: 'Outra pessoa', items: [{ productId: 'water', name: 'Água', price: 5, quantity: 1 }] });
  const request = (body: unknown) => new Request('http://localhost/api/canteen/sales', { method: 'POST', body: JSON.stringify(body) });

  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-purchase-'));
    const fileA = path.join(directory, 'tenant-a.db');
    const fileB = path.join(directory, 'tenant-b.db');
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema=prisma/tenant/schema.prisma'],
      { env: { ...process.env, DATABASE_URL: `file:${fileA}` }, stdio: 'pipe' });
    fs.copyFileSync(fileA, fileB);
    a = new PrismaClient({ datasources: { db: { url: `file:${fileA}` } } });
    b = new PrismaClient({ datasources: { db: { url: `file:${fileB}` } } });
    for (const client of [a, b]) {
      await client.canteenSettings.upsert({ where: { id: 'default' }, create: { id: 'default', isOpen: true }, update: { isOpen: true } });
      await client.member.createMany({ data: [
        { id: 'self', name: client === a ? 'Membro A' : 'Membro B', email: 'buyer@test.local', phone: '000', approved: true },
        { id: 'other', name: 'Outro membro', email: 'other@test.local', phone: '000', approved: true },
      ] });
      await client.product.create({ data: { id: 'water', name: 'Água', category: 'Bebidas', price: client === a ? 5 : 7, cost: 1, stock: 10 } });
    }
    await b.product.create({ data: { id: 'only-b', name: 'Produto B', category: 'Lanches', price: 5, cost: 1, stock: 10 } });
  }, 60_000);
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.auth.mockResolvedValue({ user: buyer });
    mocks.client.mockImplementation((tenantId: string) => tenantId === 'tenant-a' ? a : b);
    await a.canteenSettings.update({ where: { id: 'default' }, data: { isOpen: true } });
    await a.product.update({ where: { id: 'water' }, data: { availableToday: true } });
    await a.syncOperation.deleteMany();
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await a?.$disconnect(); await b?.$disconnect();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('membro pede sem sell/operate e a API fixa o vínculo do próprio comprador', async () => {
    const response = await createSale(request(input()));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.memberId).toBe('self');
    expect(data.memberName).toBe('Membro A');
    expect(data.total).toBe(5);
    expect(data.paymentMethod).toBe('pending');
    expect((await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock).toBe(10);
    expect(await a.creditTransaction.count()).toBe(0);
    expect(await b.sale.count()).toBe(0);
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it('o mesmo ID no outro tenant usa o preço e membro daquele tenant, sem cruzar bancos', async () => {
    mocks.auth.mockResolvedValue({ user: { ...buyer, tenantId: 'tenant-b' } });
    expect((await createSale(request(input()))).status).toBe(409);
    const body = input(); body.total = 7; body.items[0].price = 7;
    const response = await createSale(request(body));
    expect(response.status).toBe(200);
    expect((await response.json()).memberName).toBe('Membro B');
    expect(mocks.client).toHaveBeenCalledWith('tenant-b');
  });

  it('API rejeita produto de outro tenant e venda paga enviada por comprador', async () => {
    const count = await a.sale.count();
    const body = input(); body.items[0].productId = 'only-b';
    expect((await createSale(request(body))).status).toBe(409);
    expect((await createSale(request({ ...input(), paymentMethod: 'pix' }))).status).toBe(403);
    expect(await a.sale.count()).toBe(count);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'closed'])('replay pelo sync também rejeita pedido %s e não emite notificação', async (reason) => {
    if (reason === 'unavailable') await a.product.update({ where: { id: 'water' }, data: { availableToday: false } });
    else await a.canteenSettings.update({ where: { id: 'default' }, data: { isOpen: false } });
    const count = await a.sale.count();
    const response = await syncPush(new Request('http://localhost/api/sync/push', { method: 'POST',
      body: JSON.stringify({ changes: [{ id: 1, idempotencyKey: `reject-${reason}`, module: 'sales', action: 'create', data: input() }] }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).results[0]).toMatchObject({ id: 1, status: 'error' });
    expect(await a.sale.count()).toBe(count);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('pull de vendas do comprador entrega só suas compras, nunca as de outro membro', async () => {
    const other = await a.sale.create({ data: { total: 99, paymentMethod: 'pix', memberId: 'other', createdBy: 'operador', items: '[]' } });
    const repository = new CanteenSalesRepository(a);
    const service = new CanteenSalesService(repository, a, 'tenant-a');
    const own = await service.changes(new Date(0), buyer);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((sale) => sale.memberId === 'self')).toBe(true);
    expect(own.some((sale) => sale.id === other.id)).toBe(false);
    expect(await service.changes(new Date(0), { ...buyer, linkedMemberId: null })).toEqual([]);
    expect(await service.changes(new Date(0), { ...buyer, permissions: [] })).toEqual([]);
  });

  it('pull real não expõe hash, custos ou compras/membros de terceiros ao comprador', async () => {
    await a.member.update({ where: { id: 'self' }, data: { passwordHash: 'hash-nao-sincronizar', teamIds: 'team-a' } });
    expect((await createSale(request(input()))).status).toBe(200);
    const response = await syncPull(new Request('http://localhost/api/sync/pull'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.members.map((member: { id: string }) => member.id)).toEqual(['self']);
    expect(data.members[0]).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(data)).not.toContain('hash-nao-sincronizar');
    expect(data.products).toHaveLength(1);
    expect(data.products[0]).not.toHaveProperty('cost');
    expect(data.products[0]).not.toHaveProperty('minStock');
    expect(data.sales.length).toBeGreaterThan(0);
    expect(data.sales.every((sale: { memberId: string }) => sale.memberId === 'self')).toBe(true);
    expect(data.tasks).toEqual([]);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('pull real limita líder à equipe atual, inclui tombstone e exclui alteração após o cursor', async () => {
    await a.member.update({ where: { id: 'self' }, data: { teamIds: 'team-a' } });
    const now = new Date();
    await a.task.createMany({ data: [
      { id: 'task-a', title: 'Equipe A', teamId: 'team-a', type: 'general', date: now },
      { id: 'task-deleted', title: 'Removida', teamId: 'team-a', type: 'general', date: now, deletedAt: now },
      { id: 'task-b', title: 'Equipe B', teamId: 'team-b', type: 'general', date: now },
      { id: 'task-future', title: 'Depois do cursor', teamId: 'team-a', type: 'general', date: now, updatedAt: new Date(Date.now() + 60_000) },
    ] });
    mocks.auth.mockResolvedValue({ user: { ...buyer, role: 'LEADER', permissions: ['tasks:view'], planFeatures: ['tasks', 'offline_sync'], teamIds: ['team-b'] } });
    const response = await syncPull(new Request('http://localhost/api/sync/pull'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.tasks.map((task: { id: string }) => task.id).sort()).toEqual(['task-a', 'task-deleted']);
    expect(data.tasks.find((task: { id: string }) => task.id === 'task-deleted').deletedAt).toBeTruthy();
    expect(data.members).toEqual([]); expect(data.products).toEqual([]); expect(data.sales).toEqual([]);
  });

  it('admin sincroniza dados operacionais, mas nunca credenciais de membros', async () => {
    mocks.auth.mockResolvedValue({ user: { ...buyer, role: 'ADMIN' } });
    const response = await syncPull(new Request('http://localhost/api/sync/pull'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.members).toHaveLength(2);
    expect(data.products[0]).toHaveProperty('cost');
    expect(data.members.every((member: object) => !('passwordHash' in member))).toBe(true);
    expect(JSON.stringify(data)).not.toContain('hash-nao-sincronizar');
  });

  const sync = async (data: unknown, key: string) => {
    const response = await syncPush(new Request('http://localhost/api/sync/push', { method: 'POST', body: JSON.stringify({ changes: [
      { id: 1, idempotencyKey: key, module: 'sales', action: 'create', data },
    ] }) }));
    expect(response.status).toBe(200);
    return (await response.json()).results[0];
  };

  it('pedido repetido tem um único registro/aviso e rejeita mesma chave com outro ator ou conteúdo', async () => {
    const body = { ...input(), id: 'idempotent-order' };
    const baseline = await a.sale.count();
    expect(await sync(body, 'order-once')).toMatchObject({ status: 'success' });
    expect(await sync(body, 'order-once')).toMatchObject({ status: 'success', replayed: true });
    expect(await a.sale.count()).toBe(baseline + 1);
    expect(await a.syncOperation.count()).toBe(1);
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(await sync({ ...body, total: 10 }, 'order-once')).toMatchObject({ status: 'conflict', reason: 'idempotency' });
    mocks.auth.mockResolvedValue({ user: { ...buyer, id: 'another-user' } });
    expect(await sync(body, 'order-once')).toMatchObject({ status: 'conflict' });
    expect(await a.sale.count()).toBe(baseline + 1);
  });

  it('venda fiado em replay baixa estoque e gera débito exatamente uma vez', async () => {
    mocks.auth.mockResolvedValue({ user: { ...buyer, role: 'CANTEEN', permissions: ['canteen:sell'] } });
    const body = { ...input(), id: 'idempotent-fiado', intent: 'sale', paymentMethod: 'fiado', orderStatus: 'preparing', memberId: 'self' };
    const stock = (await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock;
    const balance = (await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance;
    const ledger = await a.creditTransaction.count();
    expect(await sync(body, 'fiado-once')).toMatchObject({ status: 'success' });
    await a.canteenSettings.update({ where: { id: 'default' }, data: { isOpen: false } });
    expect(await sync(body, 'fiado-once')).toMatchObject({ status: 'success', replayed: true });
    expect((await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock).toBe(stock - 1);
    expect((await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance).toBe(balance + 5);
    expect(await a.creditTransaction.count()).toBe(ledger + 1);
  });

  it('falha na gravação final do recibo desfaz venda, estoque e débito na mesma transação', async () => {
    const body = { ...input(), id: 'rollback-sale', intent: 'sale', paymentMethod: 'fiado', orderStatus: 'preparing', memberId: 'self' };
    const change = parseSyncChange({ id: 1, idempotencyKey: 'rollback-receipt', module: 'sales', action: 'create', data: body });
    const stock = (await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock;
    const balance = (await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance;
    const ledger = await a.creditTransaction.count();
    await expect(new SyncPushRepository(a).run(change, { tenantId: 'tenant-a', actor: 'user-a', memberId: 'self', module: 'sales', action: 'create', hash: syncPayloadHash(body) }, async () => {}, async (tx) => {
      await new CanteenSalesService(new CanteenSalesRepository(tx), a, 'tenant-a', () => {}, tx).create(body, { ...buyer, permissions: ['canteen:sell'] });
      // Força erro no último passo, depois de todas as mutações financeiras.
      await tx.syncOperation.delete({ where: { idempotencyKey: change.idempotencyKey } });
    })).rejects.toThrow();
    expect(await a.sale.findUnique({ where: { id: 'rollback-sale' } })).toBeNull();
    expect(await a.syncOperation.count()).toBe(0);
    expect((await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock).toBe(stock);
    expect((await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance).toBe(balance);
    expect(await a.creditTransaction.count()).toBe(ledger);
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('comprador não sincroniza créditos e líder não toma tarefa de outra equipe por payload', async () => {
    const balance = (await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance;
    const response = await syncPush(new Request('http://localhost/api/sync/push', { method: 'POST', body: JSON.stringify({ changes: [
      { id: 1, idempotencyKey: 'credit-forbidden', module: 'memberCredits', action: 'update', data: { id: 'self', creditBalance: 0 } },
    ] }) }));
    expect((await response.json()).results[0].status).toBe('forbidden');
    expect((await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance).toBe(balance);
    await a.member.update({ where: { id: 'self' }, data: { teamIds: 'team-a' } });
    await a.task.upsert({ where: { id: 'other-team-task' }, create: { id: 'other-team-task', title: 'Privada', teamId: 'team-b', type: 'meeting', date: new Date() }, update: {} });
    mocks.auth.mockResolvedValue({ user: { ...buyer, role: 'LEADER', permissions: ['tasks:update'], planFeatures: ['offline_sync', 'tasks'] } });
    const denied = await syncPush(new Request('http://localhost/api/sync/push', { method: 'POST', body: JSON.stringify({ changes: [
      { id: 2, idempotencyKey: 'steal-task', module: 'tasks', action: 'update', data: { id: 'other-team-task', teamId: 'team-a', title: 'Tomada', type: 'meeting', date: new Date().toISOString() } },
    ] }) }));
    expect((await denied.json()).results[0].status).toBe('forbidden');
    expect((await a.task.findUniqueOrThrow({ where: { id: 'other-team-task' } })).teamId).toBe('team-b');
    expect(await a.syncOperation.count()).toBe(0);
  });

  it('pagamento sincronizado repetido não quita duas vezes nem permite ultrapassar o saldo', async () => {
    await a.member.update({ where: { id: 'self' }, data: { creditBalance: 10 } });
    mocks.auth.mockResolvedValue({ user: { ...buyer, permissions: ['canteen:operate'] } });
    const payment = async (key: string, amount: number) => {
      const response = await syncPush(new Request('http://localhost/api/sync/push', { method: 'POST', body: JSON.stringify({ changes: [
        { id: 1, idempotencyKey: key, module: 'memberCredits', action: 'update', data: { id: 'self', amount } },
      ] }) }));
      return (await response.json()).results[0];
    };
    const ledger = await a.creditTransaction.count();
    expect(await payment('payment-once', 2)).toMatchObject({ status: 'success' });
    expect(await payment('payment-once', 2)).toMatchObject({ status: 'success', replayed: true });
    expect(await payment('overpayment', 50)).toMatchObject({ status: 'error' });
    expect((await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance).toBe(8);
    expect(await a.creditTransaction.count()).toBe(ledger + 1);
    expect(await a.syncOperation.count()).toBe(1);
  });

  it('requisições concorrentes com a mesma chave não duplicam venda/estoque/débito', async () => {
    mocks.auth.mockResolvedValue({ user: { ...buyer, permissions: ['canteen:sell'] } });
    const body = { ...input(), id: 'concurrent-sale', intent: 'sale', paymentMethod: 'fiado', orderStatus: 'preparing', memberId: 'self' };
    const stock = (await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock;
    const balance = (await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance;
    const outcomes = await Promise.all([sync(body, 'concurrent-once'), sync(body, 'concurrent-once')]);
    expect(outcomes.some((result) => result.status === 'success')).toBe(true);
    expect(await sync(body, 'concurrent-once')).toMatchObject({ status: 'success', replayed: true });
    expect(await a.sale.count({ where: { id: 'concurrent-sale' } })).toBe(1);
    expect((await a.product.findUniqueOrThrow({ where: { id: 'water' } })).stock).toBe(stock - 1);
    expect((await a.member.findUniqueOrThrow({ where: { id: 'self' } })).creditBalance).toBe(balance + 5);
  }, 30_000);
});
