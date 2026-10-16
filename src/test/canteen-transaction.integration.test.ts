import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { CanteenSalesRepository } from '@/server/canteen/sales.repository';

describe('transações reais da cantina', () => {
  let directory: string;
  let prisma: TenantPrismaClient;
  let repository: CanteenSalesRepository;

  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-canteen-'));
    const databaseUrl = `file:${path.join(directory, 'church_test.db')}`;
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema=prisma/tenant/schema.prisma'],
      { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' });
    prisma = new TenantPrismaClient({ datasources: { db: { url: databaseUrl } } });
    repository = new CanteenSalesRepository(prisma);
  }, 60_000);

  beforeEach(async () => {
    await prisma.canteenSettings.upsert({ where: { id: 'default' }, create: { id: 'default', isOpen: true }, update: { isOpen: true } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('mantém estoque ao criar pedido pendente e baixa ao aprovar', async () => {
    const product = await prisma.product.create({ data: { name: 'Água', category: 'Cantina', price: 5, cost: 1, stock: 10, minStock: 1 } });
    const pending = await repository.create({
      total: 10, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: product.id, name: product.name, quantity: 2, price: 5 }],
      memberId: null, memberName: 'Membro Teste', createdBy: 'teste',
    });
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(10);

    await repository.approve(pending.id, 'pix', 'operador');
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(8);
  });

  it('registra venda fiada e atualiza o saldo do membro na mesma operação', async () => {
    const member = await prisma.member.create({ data: { name: 'Membro Fiado', email: 'fiado@test.local', phone: '000', approved: true } });
    const product = await prisma.product.create({ data: { name: 'Lanche', category: 'Lanches', price: 20, cost: 5, stock: 5 } });
    const created = await repository.create({
      total: 20, paymentMethod: 'fiado', orderStatus: 'preparing', items: [{ productId: product.id, name: 'Lanche', quantity: 1, price: 20 }],
      memberId: member.id, memberName: member.name, createdBy: 'operador',
    });
    const updatedMember = await prisma.member.findUnique({ where: { id: member.id } });
    const ledger = await prisma.creditTransaction.findFirst({ where: { saleId: created.id } });

    expect(updatedMember?.creditBalance).toBe(20);
    expect(ledger?.type).toBe('debit');
    expect(ledger?.amount).toBe(20);
  });

  it('faz rollback quando a baixa de estoque falha', async () => {
    const product = await prisma.product.create({ data: { name: 'Item', category: 'Lanches', price: 9, cost: 1, stock: 1 } });
    const pending = await repository.create({
      total: 9, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: product.id, name: 'Item', quantity: 1, price: 9 }],
      memberId: null, memberName: null, createdBy: 'teste',
    });
    await prisma.product.update({ where: { id: product.id }, data: { stock: 0 } });

    await expect(repository.approve(pending.id, 'pix', 'operador')).rejects.toThrow();
    const persisted = await prisma.sale.findUnique({ where: { id: pending.id } });
    expect(persisted?.paymentMethod).toBe('pending');
    expect(persisted?.orderStatus).toBe('pending');
  });

  it.each([
    { active: false }, { availableToday: false }, { deletedAt: new Date() }, { stock: 0 },
  ])('não grava sequer pedido pendente para produto indisponível: %j', async (changes) => {
    const product = await prisma.product.create({ data: { name: 'Indisponível', category: 'Lanches', price: 5, cost: 1, stock: 5, ...changes } });
    const count = await prisma.sale.count();
    await expect(repository.create({
      total: 5, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: product.id, name: product.name, quantity: 1, price: 5 }],
      memberId: null, memberName: null, createdBy: 'teste',
    })).rejects.toThrow();
    expect(await prisma.sale.count()).toBe(count);
  });

  it('revalida indisponibilidade, preço e abertura ao aprovar, sem alterar o pedido', async () => {
    const product = await prisma.product.create({ data: { name: 'Revalidar', category: 'Lanches', price: 5, cost: 1, stock: 2 } });
    const pending = await repository.create({ total: 5, paymentMethod: 'pending', orderStatus: 'pending',
      items: [{ productId: product.id, name: product.name, quantity: 1, price: 5 }], memberId: null, memberName: null, createdBy: 'teste' });
    await prisma.product.update({ where: { id: product.id }, data: { availableToday: false } });
    await expect(repository.approve(pending.id, 'pix', 'teste')).rejects.toThrow('não está disponível');
    await prisma.product.update({ where: { id: product.id }, data: { availableToday: true, price: 6 } });
    await expect(repository.approve(pending.id, 'pix', 'teste')).rejects.toThrow('preço');
    await prisma.product.update({ where: { id: product.id }, data: { price: 5 } });
    await prisma.canteenSettings.update({ where: { id: 'default' }, data: { isOpen: false } });
    await expect(repository.approve(pending.id, 'pix', 'teste')).rejects.toThrow('fechada');
    expect((await prisma.sale.findUniqueOrThrow({ where: { id: pending.id } })).paymentMethod).toBe('pending');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(2);
  });

  it('soma itens repetidos e impede estoque negativo ou total adulterado', async () => {
    const product = await prisma.product.create({ data: { name: 'Último', category: 'Lanches', price: 5, cost: 1, stock: 1 } });
    const data = { total: 5, paymentMethod: 'pix', orderStatus: null,
      items: [{ productId: product.id, name: product.name, quantity: 1, price: 5 }], memberId: null, memberName: null, createdBy: 'teste' };
    await expect(repository.create({ ...data, total: 10, items: [...data.items, ...data.items] })).rejects.toThrow('Estoque insuficiente');
    await expect(repository.create({ ...data, total: 1 })).rejects.toThrow('total');
    await repository.create(data);
    await expect(repository.create(data)).rejects.toThrow('Estoque insuficiente');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(0);
  });

  it('vínculo para compra precisa estar ativo e aprovado no banco, não no cache do cliente', async () => {
    const member = await prisma.member.create({ data: { name: 'Sem aprovação', email: 'pending@test.local', phone: '000' } });
    expect(await repository.findPurchaser(member.id)).toBeNull();
    await prisma.member.update({ where: { id: member.id }, data: { approved: true } });
    expect(await repository.findPurchaser(member.id)).toEqual({ id: member.id, name: member.name });
    await prisma.member.update({ where: { id: member.id }, data: { active: false } });
    expect(await repository.findPurchaser(member.id)).toBeNull();
  });
});
