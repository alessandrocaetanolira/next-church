import { describe, expect, it, vi } from 'vitest';
import { NotificationsPolicy } from '@/server/notifications/notifications.policy';
import { NotificationsService } from '@/server/notifications/notifications.service';
import type { NotificationsRepository } from '@/server/notifications/notifications.repository';

const user = { role: 'MEMBER', email: 'Member@Test.Local', permissions: ['notifications:view', 'notifications:update'], planFeatures: ['notifications'] };
const blocked = { role: 'MEMBER', email: 'blocked@test.local', permissions: [], planFeatures: ['notifications'] };

function repositoryMock() {
  return { list: vi.fn().mockResolvedValue([{ id: 'notification-1', userEmail: 'member@test.local', type: 'info', title: 'Aviso', message: 'Olá', href: null, sourceType: null, sourceId: null, readAt: null, createdAt: new Date('2026-09-20T12:00:00.000Z') }]), markRead: vi.fn().mockResolvedValue({ success: true }), markAllRead: vi.fn().mockResolvedValue({ success: true }) } as unknown as NotificationsRepository;
}

describe('camadas de notificações', () => {
  it('separa consulta e atualização', () => {
    expect(() => NotificationsPolicy.assertView(user)).not.toThrow();
    expect(() => NotificationsPolicy.assertUpdate(user)).not.toThrow();
    expect(() => NotificationsPolicy.assertView(blocked)).toThrow('notificações');
  });

  it('normaliza e-mail e marca notificações', async () => {
    const repository = repositoryMock();
    const service = new NotificationsService(repository);
    await service.list(' Member@Test.Local ');
    await service.markRead('notification-1', 'Member@Test.Local');
    await service.markAllRead('Member@Test.Local');
    expect(repository.list).toHaveBeenCalledWith('member@test.local');
    expect(repository.markRead).toHaveBeenCalledWith('notification-1', 'member@test.local');
    expect(repository.markAllRead).toHaveBeenCalledWith('member@test.local');
  });
});
