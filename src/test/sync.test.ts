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

vi.mock('@/server/canteen/sales-detail.service', () => ({
  CanteenSalesDetailService: class { execute(...args: unknown[]) { return operateSaleMock(...args); } },
}));

describe('Sync API Routes', () => {
  const mockTenantId = 'test-church';
  const mockSession = { user: { tenantId: mockTenantId, id: 'admin-a', email: 'admin@test.local', role: 'ADMIN', name: 'Operador Teste' } };

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
      (auth as Mock).mockResolvedValue({ user: { ...mockSession.user, id: 'admin-a', role: 'ADMIN' } });
      
      const mockPrisma = {
        $queryRawUnsafe: vi.fn().mockResolvedValue([]),
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
        sale: { findMany: vi.fn().mockResolvedValue([]) },
        product: { findMany: vi.fn().mockResolvedValue([]) },
        member: { findMany: vi.fn().mockResolvedValue([]) },
        task: { findMany: vi.fn().mockResolvedValue([{ id: '1', title: 'Task 1', updatedAt: new Date() }]) },
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
    function database() {
      const receipts = new Map<string, unknown>();
      const db = {
        $transaction: vi.fn(),
        syncOperation: {
          findUnique: vi.fn().mockImplementation(({ where }) => receipts.get(where.idempotencyKey) ?? null),
          create: vi.fn().mockImplementation(({ data }) => { receipts.set(data.idempotencyKey, data); return data; }),
          update: vi.fn().mockImplementation(({ where, data }) => { const row = { ...(receipts.get(where.idempotencyKey) as object), ...data }; receipts.set(where.idempotencyKey, row); return row; }),
        },
        task: { findUnique: vi.fn().mockResolvedValue({ teamId: 'team-1', updatedAt: new Date('2026-09-25T12:00:00Z') }),
          create: vi.fn().mockResolvedValue({ id: 'task-1' }), upsert: vi.fn().mockResolvedValue({ id: 'task-1' }), update: vi.fn().mockResolvedValue({ id: 'task-1' }) },
        sale: { findUnique: vi.fn().mockResolvedValue(null) },
      };
      db.$transaction.mockImplementation((work) => work(db));
      (getTenantClient as Mock).mockReturnValue(db);
      (auth as Mock).mockResolvedValue(mockSession);
      return db;
    }
    const request = (changes: unknown[]) => new NextRequest('http://localhost/api/sync/push', { method: 'POST', body: JSON.stringify({ changes }) });
    const saleChange = { id: 10, idempotencyKey: 'sale-ready', module: 'sales', action: 'update', data: { id: 'sale-1', action: 'status', orderStatus: 'ready' } };

    it('retorna conflito quando o servidor tem versão mais recente', async () => {
      const db = database();
      const response = await pushPOST(request([{ id: 7, idempotencyKey: 'task-update', module: 'tasks', action: 'update', data: { id: 'task-1', updatedAt: '2026-09-25T11:00:00Z' } }]));
      expect(response.status).toBe(200);
      expect((await response.json()).results[0]).toMatchObject({ id: 7, status: 'conflict', serverUpdatedAt: '2026-09-25T12:00:00.000Z' });
      expect(db.task.upsert).not.toHaveBeenCalled();
    });

    it('cria tarefa válida com autorização e recibo na transação', async () => {
      const db = database(); db.task.findUnique.mockResolvedValue(null);
      const response = await pushPOST(request([{ id: 1, idempotencyKey: 'task-create', module: 'tasks', action: 'create', data: { id: 'task-1', title: 'Nova tarefa', teamId: 'team-1', type: 'meeting', date: '2026-10-16' } }]));
      expect(response.status).toBe(200);
      expect((await response.json()).results[0].status).toBe('success');
      expect(db.task.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: 'task-1', title: 'Nova tarefa' }) }));
      expect(db.syncOperation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'success' }) }));
    });

    it('processa exclusão lógica autorizada de tarefa existente', async () => {
      const db = database();
      const response = await pushPOST(request([{ id: 2, idempotencyKey: 'task-delete', module: 'tasks', action: 'delete', data: { id: 'task-1' } }]));
      expect((await response.json()).results[0].status).toBe('success');
      expect(db.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }));
    });

    it('encaminha atualização de pedido ao serviço operacional do tenant', async () => {
      database(); operateSaleMock.mockResolvedValue({ id: 'sale-1' });
      const response = await pushPOST(request([saleChange]));
      expect(response.status).toBe(200);
      expect((await response.json()).results).toEqual([{ id: 10, status: 'success' }]);
      expect(operateSaleMock).toHaveBeenCalledWith('sale-1', saleChange.data, 'Operador Teste');
    });

    it('replay usa ator/ação/conteúdo, não apenas a existência de uma chave', async () => {
      database(); operateSaleMock.mockResolvedValue({ id: 'sale-1' });
      expect((await (await pushPOST(request([saleChange]))).json()).results[0].status).toBe('success');
      const response = await pushPOST(request([{ ...saleChange, id: 11 }]));
      expect((await response.json()).results).toEqual([{ id: 11, status: 'success', replayed: true }]);
      expect(operateSaleMock).toHaveBeenCalledTimes(1);
      const altered = await pushPOST(request([{ ...saleChange, data: { ...saleChange.data, orderStatus: 'cancelled' } }]));
      expect((await altered.json()).results[0].status).toBe('conflict');
      expect(operateSaleMock).toHaveBeenCalledTimes(1);
    });

    it('recibo legado sem vínculo verificável não vira sucesso automático', async () => {
      const db = database();
      db.syncOperation.findUnique.mockResolvedValue({ status: 'success', responseJson: '{"status":"success"}' });
      const response = await pushPOST(request([saleChange]));
      expect((await response.json()).results[0].status).toBe('conflict');
      expect(operateSaleMock).not.toHaveBeenCalled();
    });

    it('sessão sem autorização não escreve tarefas nem consulta recibos', async () => {
      const db = database();
      (auth as Mock).mockResolvedValue({ user: { tenantId: mockTenantId, id: 'old-user' } });
      const response = await pushPOST(request([{ id: 1, idempotencyKey: 'old-task', module: 'tasks', action: 'delete', data: { id: 'task-1' } }]));
      expect((await response.json()).results[0].status).toBe('forbidden');
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('rebaixamento impede replay antes de consultar o recibo', async () => {
      const db = database(); operateSaleMock.mockResolvedValue({});
      await pushPOST(request([saleChange]));
      db.$transaction.mockClear();
      (auth as Mock).mockResolvedValue({ user: { ...mockSession.user, role: 'MEMBER', permissions: [] } });
      const response = await pushPOST(request([saleChange]));
      expect((await response.json()).results[0].status).toBe('forbidden');
      expect(db.$transaction).not.toHaveBeenCalled();
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
