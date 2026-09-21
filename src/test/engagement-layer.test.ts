import { describe, expect, it, vi } from 'vitest';
import { EngagementPolicy } from '@/server/engagement/engagement.policy';
import { EngagementService } from '@/server/engagement/engagement.service';
import type { EngagementRepository } from '@/server/engagement/engagement.repository';

const user = { email: 'member@test.local', planFeatures: ['engagement'] };
const blocked = { email: 'blocked@test.local', planFeatures: [] };

function repositoryMock() {
  return {
    findOrCreate: vi.fn().mockResolvedValue({ id: 'profile-1', userEmail: 'member@test.local', devotionalStreak: 1, devotionalLastDate: null, completedChallengeIds: '[]' }),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    listScores: vi.fn().mockResolvedValue([{ userId: 'member@test.local', score: 20 }, { userId: 'other@test.local', score: 10 }]),
  } as unknown as EngagementRepository;
}

describe('camadas de engajamento', () => {
  it('protege acesso pelo recurso do plano', () => {
    expect(() => EngagementPolicy.assertAccess(user)).not.toThrow();
    expect(() => EngagementPolicy.assertAccess(blocked)).toThrow('plano');
  });

  it('calcula pontos e ranking', async () => {
    const service = new EngagementService(repositoryMock());
    const result = await service.get('member@test.local');

    expect(result).toMatchObject({ gamePoints: 20, points: 20, rank: 1, completedChallengeIds: [] });
  });

  it('atualiza leitura devocional e desafio sem duplicar desafio', async () => {
    const repository = repositoryMock();
    const service = new EngagementService(repository);

    await service.update('member@test.local', { action: 'completeChallenge', devotionalId: 1 });
    await service.update('member@test.local', { action: 'completeChallenge', devotionalId: 1 });

    expect(repository.updateProfile).toHaveBeenLastCalledWith('profile-1', 1, null, [1]);
  });
});
