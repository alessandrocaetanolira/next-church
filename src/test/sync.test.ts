import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as pullGET } from '../app/api/sync/pull/route';
import { POST as pushPOST } from '../app/api/sync/push/route';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { NextRequest } from 'next/server';
import { Mock } from 'vitest';

// Mock das dependências
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma-factory', () => ({
  getTenantClient: vi.fn(),
}));

describe('Sync API Routes', () => {
  const mockTenantId = 'test-church';
  const mockSession = { user: { tenantId: mockTenantId } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/sync/pull', () => {
    it('deve retornar 401 se não houver sessão', async () => {
      (auth as Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/sync/pull?module=tasks');
      const res = await pullGET(req);
      expect(res.status).toBe(401);
    });

    it('deve buscar tarefas e outros dados do tenant correto', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      
      const mockPrisma = {
        sale: { findMany: vi.fn().mockResolvedValue([]) },
        product: { findMany: vi.fn().mockResolvedValue([]) },
        member: { findMany: vi.fn().mockResolvedValue([]) },
        task: { findMany: vi.fn().mockResolvedValue([{ id: '1', title: 'Task 1' }]) },
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);

      const req = new NextRequest('http://localhost/api/sync/pull');
      const res = await pullGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tasks).toHaveLength(1);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { updatedAt: { gt: expect.any(Date) } }
      }));
    });
  });

  describe('POST /api/sync/push', () => {
    it('deve processar upsert de tarefas', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockPrisma = {
        task: { upsert: vi.fn().mockResolvedValue({ id: 'task-1' }) },
        sale: { create: vi.fn() },
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);

      const changes = [
        { id: 1, module: 'tasks', action: 'create', data: { id: 'task-1', title: 'New Task' } }
      ];

      const req = new NextRequest('http://localhost/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({ changes }),
      });

      const res = await pushPOST(req);
      const { results } = await res.json();

      expect(res.status).toBe(200);
      expect(results[0].status).toBe('success');
      expect(mockPrisma.task.upsert).toHaveBeenCalled();
    });

    it('deve processar delete de tarefas (soft delete)', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockPrisma = {
        task: { update: vi.fn().mockResolvedValue({ id: 'task-1' }) },
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);

      const changes = [
        { id: 2, module: 'tasks', action: 'delete', data: { id: 'task-1' } }
      ];

      const req = new NextRequest('http://localhost/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({ changes }),
      });

      const res = await pushPOST(req);
      await res.json();

      expect(res.status).toBe(200);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) })
      }));
    });
  });
});
