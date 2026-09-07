import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/canteen/products/route';
import { NextRequest } from 'next/server';

// Mock do auth para simular usuário não autenticado
vi.mock('@/auth', () => ({
  auth: () => Promise.resolve(null),
}));

describe('API de Produtos - GET', () => {
  it('deve retornar 401 para usuário não autenticado', async () => {
    const req = new NextRequest('http://localhost:3000/api/canteen/products');
    const response = await GET(req);
    expect(response.status).toBe(401);
  });
});
