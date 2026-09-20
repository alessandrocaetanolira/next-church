import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
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
    execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`, { stdio: 'pipe' });
    prisma = new TenantPrismaClient({ datasources: { db: { url: databaseUrl } } });
    repository = new CanteenSalesRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('mantém estoque ao criar pedido pendente e baixa ao aprovar', async () => {
    const product = await prisma.product.create({ data: { name: 'Água', category: 'Cantina', price: 5, cost: 1, stock: 10, minStock: 1 } });
    const pending = await repository.create({
      total: 5, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: product.id, name: product.name, quantity: 2, price: 5 }],
      memberId: null, memberName: 'Membro Teste', createdBy: 'teste',
    });
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(10);

    await repository.approve(pending.id, 'pix', 'operador');
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(8);
  });

  it('registra venda fiada e atualiza o saldo do membro na mesma operação', async () => {
    const member = await prisma.member.create({ data: { name: 'Membro Fiado', email: 'fiado@test.local', phone: '000', approved: true } });
    const created = await repository.create({
      total: 20, paymentMethod: 'fiado', orderStatus: 'preparing', items: [{ name: 'Lanche', quantity: 1, price: 20 }],
      memberId: member.id, memberName: member.name, createdBy: 'operador',
    });
    const updatedMember = await prisma.member.findUnique({ where: { id: member.id } });
    const ledger = await prisma.creditTransaction.findFirst({ where: { saleId: created.id } });

    expect(updatedMember?.creditBalance).toBe(20);
    expect(ledger?.type).toBe('debit');
    expect(ledger?.amount).toBe(20);
  });

  it('faz rollback quando a baixa de estoque falha', async () => {
    const pending = await repository.create({
      total: 9, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: 'produto-inexistente', name: 'Item', quantity: 1, price: 9 }],
      memberId: null, memberName: null, createdBy: 'teste',
    });

    await expect(repository.approve(pending.id, 'pix', 'operador')).rejects.toThrow();
    const persisted = await prisma.sale.findUnique({ where: { id: pending.id } });
    expect(persisted?.paymentMethod).toBe('pending');
    expect(persisted?.orderStatus).toBe('pending');
  });
});
