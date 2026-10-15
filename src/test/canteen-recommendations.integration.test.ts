import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@/generated/prisma-tenant';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';

describe('recomendação real isolada por tenant', () => {
  let directory: string;
  let a: PrismaClient;
  let b: PrismaClient;
  const recent = new Date(Date.now() - 60 * 60 * 1000);

  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-recommendations-'));
    const fileA = path.join(directory, 'tenant-a.db');
    const fileB = path.join(directory, 'tenant-b.db');
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema=prisma/tenant/schema.prisma'],
      { env: { ...process.env, DATABASE_URL: `file:${fileA}` }, stdio: 'pipe' });
    fs.copyFileSync(fileA, fileB);
    a = new PrismaClient({ datasources: { db: { url: `file:${fileA}` } } });
    b = new PrismaClient({ datasources: { db: { url: `file:${fileB}` } } });
    for (const client of [a, b]) {
      await client.product.createMany({ data: [
        { id: 'lanche', name: 'Lanche', category: 'Lanches', price: 10, cost: 5, stock: 100, minStock: 1 },
        { id: 'bebida', name: 'Bebida', category: 'Bebidas', price: 5, cost: 1, stock: 100, minStock: 1 },
      ] });
    }
  }, 60_000);
  afterAll(async () => {
    await a?.$disconnect(); await b?.$disconnect();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  it('não mistura tenants; ignora pendentes/canceladas/antigas e conta fiado/arquivadas', async () => {
    const add = (client: PrismaClient, productId: string, quantity: number, changes: Record<string, unknown> = {}) => client.sale.create({ data: {
      total: quantity * 5, paymentMethod: 'cash', createdBy: 'teste', createdAt: recent,
      items: JSON.stringify([{ productId, name: productId, quantity, price: 5 }]), ...changes,
    } });
    await add(a, 'bebida', 10);
    await add(a, 'lanche', 100, { paymentMethod: 'pending', orderStatus: 'pending' });
    await add(a, 'lanche', 100, { paymentMethod: 'cancelled' });
    await add(a, 'lanche', 100, { orderStatus: 'cancelled' });
    await add(a, 'lanche', 100, { createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) });
    await add(b, 'lanche', 20, { paymentMethod: 'fiado', orderStatus: 'ready', deletedAt: recent });
    await add(b, 'bebida', 1);

    const productsA = await new CanteenProductsService(new CanteenProductsRepository(a), 'tenant-a').list();
    const productsB = await new CanteenProductsService(new CanteenProductsRepository(b), 'tenant-b').list();
    expect(productsA.filter((item) => item.recommended).map((item) => item.id)).toEqual(['bebida']);
    expect(productsB.filter((item) => item.recommended).map((item) => item.id)).toEqual(['lanche']);
  });
});
