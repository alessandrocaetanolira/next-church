import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/members/me/financials/route';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: vi.fn() }));

const prisma = {
  member: { findFirst: vi.fn() },
  sale: { findMany: vi.fn() },
  $queryRawUnsafe: vi.fn(),
};

describe('API da própria carteira', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getTenantClient as ReturnType<typeof vi.fn>).mockReturnValue(prisma);
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1', name: 'Ana', email: 'ana@church.test', creditBalance: 10,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    prisma.sale.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([]);
  });

  it('permite MEMBER sem members:view consultar a própria carteira', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { tenantId: 'church-a', linkedMemberId: 'member-1', email: 'ana@church.test', role: 'MEMBER', permissions: [] },
    });

    const response = await GET(new Request('http://localhost:3000/api/members/me/financials'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getTenantClient).toHaveBeenCalledWith('church-a');
    expect(prisma.member.findFirst).toHaveBeenCalledWith({ where: { id: 'member-1', deletedAt: null } });
    expect(body.member).toEqual(expect.objectContaining({ id: 'member-1', creditBalance: 10 }));
  });

  it('rejeita conta sem vínculo de membro', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { tenantId: 'church-a', role: 'MEMBER' } });

    const response = await GET(new Request('http://localhost:3000/api/members/me/financials'));

    expect(response.status).toBe(403);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });
});
