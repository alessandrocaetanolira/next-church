import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as pullGET } from '../app/api/sync/pull/route';
import { POST as pushPOST } from '../app/api/sync/push/route';
import { GET as statusGET } from '../app/api/sync/status/route';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { NextRequest } from 'next/server';
import { Mock } from 'vitest';

const { operateSaleMock } = vi.hoisted(() => ({ operateSaleMock: vi.fn() }));

// Mock das dependências
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma-factory', () => ({
  getTenantClient: vi.fn(),
}));

vi.mock('@/server/canteen/sales-detail.controller', () => ({
  operateSale: operateSaleMock,
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
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
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
    it('retorna conflito quando o servidor tem uma versão mais recente', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ updatedAt: '2026-09-25T12:00:00.000Z' }]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);

      const req = new NextRequest('http://localhost/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({ changes: [{ id: 7, module: 'tasks', action: 'update', data: { id: 'task-1', updatedAt: '2026-09-25T11:00:00.000Z' } }] }),
      });

      const response = await pushPOST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0]).toMatchObject({ id: 7, status: 'conflict', serverUpdatedAt: '2026-09-25T12:00:00.000Z' });
    });

    it('deve processar upsert de tarefas', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
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
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
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

    it('deve encaminhar atualização offline de pedido para a operação da cantina', async () => {
      (auth as Mock).mockResolvedValue({
        user: {
          ...mockSession.user,
          role: 'ADMIN',
          permissions: ['canteen:operate'],
          name: 'Operador Teste',
        },
      });
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);
      operateSaleMock.mockResolvedValue({ id: 'sale-offline-1' });

      const req = new NextRequest('http://localhost/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({
          changes: [{
            id: 10,
            module: 'sales',
            action: 'update',
            data: {
              id: 'sale-offline-1',
              action: 'status',
              orderStatus: 'ready',
              updatedAt: '2026-09-29T12:05:00.000Z',
            },
          }],
        }),
      });

      const response = await pushPOST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([{ id: 10, status: 'success' }]);
      expect(operateSaleMock).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: mockTenantId }),
        expect.anything(),
        'sale-offline-1',
        expect.objectContaining({ action: 'status', orderStatus: 'ready' }),
        'Operador Teste',
      );
    });

    it('não reprocessa uma operação de venda já confirmada pela idempotência', async () => {
      (auth as Mock).mockResolvedValue({ user: { ...mockSession.user, role: 'ADMIN', permissions: ['canteen:operate'] } });
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([{ status: 'success', responseJson: '{"status":"success"}' }]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);

      const req = new NextRequest('http://localhost/api/sync/push', {
        method: 'POST',
        body: JSON.stringify({
          changes: [{
            id: 11,
            idempotencyKey: 'sale-offline-1:status:ready',
            module: 'sales',
            action: 'update',
            data: { id: 'sale-offline-1', action: 'status', orderStatus: 'ready', updatedAt: '2026-09-29T12:05:00.000Z' },
          }],
        }),
      });

      const response = await pushPOST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([{ id: 11, status: 'success', replayed: true }]);
      expect(operateSaleMock).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/sync/status', () => {
    it('retorna diagnóstico do sincronismo no tenant autenticado', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      const mockPrisma = {
        syncOperation: {
          groupBy: vi.fn().mockResolvedValue([
            { status: 'success', _count: { _all: 3 } },
            { status: 'error', _count: { _all: 1 } },
          ]),
        },
      };
      (getTenantClient as Mock).mockReturnValue(mockPrisma);

      const response = await statusGET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({ enabled: true, operations: { success: 3, error: 1 } });
      expect(mockPrisma.syncOperation.groupBy).toHaveBeenCalledWith({ by: ['status'], _count: { _all: true } });
    });
  });
});
