import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/canteen/sales/route';
import { GET as legacyGET, POST as legacyPOST } from '@/app/api/sync/route';
import { CanteenSalesService } from '@/server/canteen/sales.service';
import { getRoleDefaultPermissions } from '@/lib/permission-catalog';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: mocks.client }));
vi.mock('@/lib/server/notification-service', () => ({ notifyCanteenNewOrder: vi.fn(), notifyMemberCreditUpdate: vi.fn() }));
const buyer = { tenantId: 'church-a', role: 'MEMBER', linkedMemberId: 'member-a', permissions: getRoleDefaultPermissions('MEMBER'), planFeatures: ['canteen'] };

beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: buyer }); });

describe('API de vendas versus compra pessoal', () => {
  it('não consulta banco nem lista vendas de terceiros para membro comprador', async () => {
    const result = await GET();
    expect(result.status).toBe(403);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it('sessão ausente retorna 401 antes de compor acesso ao banco', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(new Request('http://localhost/api/canteen/sales', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it('operador explicitamente autorizado lista vendas do próprio tenant', async () => {
    mocks.auth.mockResolvedValue({ user: { ...buyer, role: 'LEADER', permissions: [...buyer.permissions, 'canteen:sell'] } });
    mocks.client.mockReturnValue({});
    const list = vi.spyOn(CanteenSalesService.prototype, 'list').mockResolvedValue([]);
    expect((await GET()).status).toBe(200);
    expect(list).toHaveBeenCalledOnce();
    expect(mocks.client).toHaveBeenCalledWith('church-a');
  });

  it('permite encaminhar pedido próprio sem dar ao membro acesso de vendedor', async () => {
    mocks.client.mockReturnValue({});
    const create = vi.spyOn(CanteenSalesService.prototype, 'create').mockResolvedValue({ id: 'pedido-a' } as never);
    const body = { intent: 'purchase', total: 5, paymentMethod: 'pending', orderStatus: 'pending', items: [{ productId: 'agua', name: 'Água', price: 5, quantity: 1 }] };
    const response = await POST(new Request('http://localhost/api/canteen/sales', { method: 'POST', body: JSON.stringify(body) }));
    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(body, buyer);
  });

  it('não permite usar endpoint legado para contornar policies e estoque', async () => {
    expect(legacyGET().status).toBe(410);
    const response = legacyPOST();
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: 'LEGACY_SYNC_RETIRED' });
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
