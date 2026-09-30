import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { PATCH, GET } from '@/app/api/profile/route';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: vi.fn() }));

describe('perfil do usuário', () => {
  const user = {
    id: 'user-1', name: 'Alessandro', email: 'alessandro@example.com', role: 'MEMBER',
    linkedMemberId: 'member-1', version: 1, active: true, deletedAt: null,
  };
  const member = {
    id: 'member-1', name: 'Alessandro', email: user.email, phone: '11999999999',
    birthDate: null, aboutMe: null, maritalStatus: 'single', deletedAt: null,
  };
  const prisma = {
    user: { findFirst: vi.fn(), },
    member: { findFirst: vi.fn(), update: vi.fn(), },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getTenantClient as Mock).mockReturnValue(prisma);
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.member.findFirst.mockResolvedValue(member);
    prisma.member.update.mockResolvedValue({ ...member, name: 'Novo nome' });
    prisma.$queryRawUnsafe.mockResolvedValue([{ avatarUrl: null, coverUrl: null }]);
    prisma.$executeRawUnsafe.mockResolvedValue(1);
  });

  it('não permite acesso sem sessão', async () => {
    (auth as Mock).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('atualiza somente o usuário autenticado e seu membro vinculado', async () => {
    (auth as Mock).mockResolvedValue({ user: { id: user.id, tenantId: 'tenant-1', tenantSlug: 'church' } });
    const response = await PATCH(new Request('http://localhost/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Novo nome', phone: '11888888888' }),
    }));

    expect(response.status).toBe(200);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ?'),
      'Novo nome',
      null,
      null,
      expect.any(String),
      user.id,
    );
    expect(prisma.member.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: member.id } }));
  });
});
