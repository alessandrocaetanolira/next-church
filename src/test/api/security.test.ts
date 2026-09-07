import { describe, it, expect, vi } from 'vitest';
import { GET as getProducts } from '@/app/api/canteen/products/route';
import { GET as getMembers } from '@/app/api/members/route';
import { GET as getTeams } from '@/app/api/teams/route';
import { GET as getTasks } from '@/app/schedules/tasks/route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: () => Promise.resolve(null),
}));

describe('API Gestão - Segurança', () => {
  it('deve retornar 401 para todas as rotas de gestão sem sessão', async () => {
    const req = new NextRequest('http://localhost:3000/');
    
    expect((await getProducts(req)).status).toBe(401);
    expect((await getMembers(req)).status).toBe(401);
    expect((await getTeams(req)).status).toBe(401);
    expect((await getTasks(req)).status).toBe(401);
  });
});
