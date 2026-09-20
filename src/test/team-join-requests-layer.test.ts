import { describe, expect, it, vi } from 'vitest';
import { TeamJoinRequestsPolicy } from '@/server/teams/join-requests.policy';
import type { TeamJoinRequestsRepository } from '@/server/teams/join-requests.repository';

const leader = { role: 'LEADER', linkedMemberId: 'leader-1', permissions: ['groups:view', 'groups:request', 'groups:manage_access'], planFeatures: ['groups'] };
const member = { role: 'MEMBER', linkedMemberId: 'member-1', permissions: ['groups:view', 'groups:request'], planFeatures: ['groups'] };

function repository(canManageTeam: boolean) {
  return { canManageTeam: vi.fn().mockResolvedValue(canManageTeam) } as unknown as TeamJoinRequestsRepository;
}

describe('camadas de solicitações de ingresso', () => {
  it('separa consulta e solicitação de ingresso', () => {
    expect(() => TeamJoinRequestsPolicy.assertView(member)).not.toThrow();
    expect(() => TeamJoinRequestsPolicy.assertRequest(member)).not.toThrow();
    expect(() => TeamJoinRequestsPolicy.assertRequest({ ...member, linkedMemberId: null })).toThrow('solicitar ingresso');
  });

  it('permite ao líder gerenciar apenas sua equipe', async () => {
    await expect(TeamJoinRequestsPolicy.assertManage(leader, repository(true), 'team-led')).resolves.toBeUndefined();
    await expect(TeamJoinRequestsPolicy.assertManage(leader, repository(false), 'team-other')).rejects.toThrow('desta equipe');
  });

  it('mantém acesso global de admin e pastor', async () => {
    const admin = { role: 'ADMIN', permissions: [], planFeatures: ['groups'] };
    await expect(TeamJoinRequestsPolicy.assertManage(admin, repository(false), 'team-1')).resolves.toBeUndefined();
  });
});
