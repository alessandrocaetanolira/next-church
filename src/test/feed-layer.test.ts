import { describe, expect, it, vi } from 'vitest';
import { FeedPolicy } from '@/server/feed/feed.policy';
import { FeedService } from '@/server/feed/feed.service';
import type { FeedRepository } from '@/server/feed/feed.repository';

const publisher = { role: 'MEMBER', email: 'member@test.local', permissions: ['feed:view', 'feed:publish', 'feed:share'], planFeatures: ['feed'] };
const moderator = { role: 'PASTOR', email: 'pastor@test.local', permissions: ['feed:moderate'], planFeatures: ['feed'] };

function repositoryMock(overrides: Partial<Record<keyof FeedRepository, unknown>> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    accessibleGroupIds: vi.fn().mockResolvedValue([]),
    findGroup: vi.fn().mockResolvedValue(null),
    canManageGroup: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as FeedRepository;
}

describe('camadas do feed', () => {
  it('separa publicação, compartilhamento e moderação', async () => {
    expect(() => FeedPolicy.assertView(publisher)).not.toThrow();
    expect(() => FeedPolicy.assertPublish(publisher)).not.toThrow();
    expect(() => FeedPolicy.assertShare(publisher)).not.toThrow();
    expect(() => FeedPolicy.assertModerate(publisher)).toThrow('moderar');
    await expect(FeedPolicy.assertGroupPublish(publisher, repositoryMock(), 'group-1')).resolves.toBeUndefined();
    await expect(FeedPolicy.assertGroupPublish(publisher, repositoryMock({ canManageGroup: vi.fn().mockResolvedValue(false) }), 'group-2')).rejects.toThrow('grupo');
  });

  it('filtra visibilidade individual e pagina o resultado', async () => {
    const repository = repositoryMock({
      list: vi.fn().mockResolvedValue([
        { id: 'public', visibility: 'public', createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z', likes: '[]', comments: '[]', targetUserIds: '[]', readBy: '[]' },
        { id: 'private', visibility: 'individual', targetUserIds: JSON.stringify(['other@test.local']), createdAt: '2026-09-20T11:00:00.000Z', updatedAt: '2026-09-20T11:00:00.000Z', likes: '[]', comments: '[]', readBy: '[]' },
      ]),
    });
    const service = new FeedService(repository, {} as never, 'tenant-1');
    const result = await service.list('member@test.local', [], 1, 10, null, null);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: 'public', likes: [], comments: [] });
  });

  it('permite moderação para pastor', () => {
    expect(() => FeedPolicy.assertModerate(moderator)).not.toThrow();
  });
});
