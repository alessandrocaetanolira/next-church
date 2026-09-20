import { describe, it, expect, vi, beforeAll } from 'vitest';
import path from 'path';
import { GET as getProducts, POST as postProduct } from '@/app/api/canteen/products/route';
import { GET as getMembers, POST as postMember } from '@/app/api/members/route';
import { NextRequest } from 'next/server';

// Mock de sessões com diferentes permissões
const mockSession = (role: string) => ({
  user: { role, tenantId: 'test-tenant' },
});

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

describe('API Gestão - Membros e Produtos', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'file:' + path.resolve(__dirname, '../../prisma/databases/church_test-tenant.db');
  });

  it('deve bloquear GET de produtos sem canteen:view', async () => {
    (auth as any).mockResolvedValue(mockSession('MEMBER'));
    const req = new NextRequest('http://localhost:3000/api/canteen/products');
    const response = await getProducts(req);
    expect(response.status).toBe(403);
  });

  it('deve bloquear POST de produto para usuários MEMBER', async () => {
    (auth as any).mockResolvedValue(mockSession('MEMBER'));
    const req = new NextRequest('http://localhost:3000/api/canteen/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Produto Teste', price: 10, stock: 1, category: 'Geral' })
    });
    const response = await postProduct(req);
    expect(response.status).toBe(403);
  });

  it('deve bloquear POST de membro para usuários MEMBER', async () => {
    (auth as any).mockResolvedValue(mockSession('MEMBER'));
    const req = new NextRequest('http://localhost:3000/api/members', {
      method: 'POST',
      body: JSON.stringify({ name: 'Membro Teste', email: 'test@test.com', phone: '123' })
    });
    const response = await postMember(req);
    expect(response.status).toBe(403);
  });
});
