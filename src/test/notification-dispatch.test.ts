import { beforeEach, describe, expect, it, vi } from 'vitest';

const publishTenantEvent = vi.hoisted(() => vi.fn());
const pushSend = vi.hoisted(() => vi.fn());
const listByEmails = vi.hoisted(() => vi.fn());

vi.mock('@/infra/sse/sse-broker', () => ({ publishTenantEvent }));
vi.mock('@/infra/web-push/web-push-service', () => ({ webPushService: { send: pushSend } }));
vi.mock('@/server/notifications/push-subscriptions.repository', () => ({
  PushSubscriptionsRepository: class {
    listByEmails = listByEmails;
    removeMany = vi.fn();
  },
}));
vi.mock('@/lib/branding/pwa-assets', () => ({ getTenantPwaIconUrl: vi.fn().mockReturnValue('/pwa-192x192.png') }));
vi.mock('@/lib/server/logger', () => ({ serverLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { notifyMemberCreditUpdate, sendNotification } from '@/lib/server/notification-service';

describe('dispatcher compartilhado de notificações', () => {
  const prisma = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    $queryRawUnsafe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    pushSend.mockResolvedValue({ expiredIds: [] });
    listByEmails.mockResolvedValue([]);
  });

  it('normaliza destinatário e remetente, persiste e publica no SSE', async () => {
    await sendNotification(prisma as never, 'igreja-teste', {
      recipients: ['  Member@Test.Local '],
      sender: { email: ' Admin@Test.Local ', name: ' Administrador ' },
      content: { type: 'test', title: 'Aviso', message: 'Mensagem', href: '/notifications' },
    });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'member@test.local',
      'admin@test.local',
      'Administrador',
      'test',
      'Aviso',
      'Mensagem',
      '/notifications',
      null,
      null,
      expect.any(String),
      expect.any(String),
    );
    expect(publishTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'igreja-teste',
      userEmail: 'member@test.local',
      senderEmail: 'admin@test.local',
      senderName: 'Administrador',
    }));
  });

  it('entrega o mesmo evento persistido ao Web Push quando há subscription', async () => {
    listByEmails.mockResolvedValueOnce([{ endpoint: 'https://push.test', p256dh: 'key', auth: 'auth', userEmail: 'member@test.local' }]);

    await sendNotification(prisma as never, 'igreja-teste', {
      recipients: ['member@test.local'],
      content: { type: 'test', title: 'Aviso', message: 'Mensagem', href: '/notifications' },
    });

    expect(listByEmails).toHaveBeenCalledWith(['member@test.local']);
    expect(pushSend).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ title: 'Aviso', body: 'Mensagem', url: '/notifications' }),
    );
  });

  it('envia atualização de crédito ao membro correto com origem da cantina', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ email: ' Member@Test.Local ' }]);

    await notifyMemberCreditUpdate(prisma as never, 'igreja-teste', {
      memberId: 'member-1',
      type: 'canteen-credit',
      title: 'Atualização de crédito',
      message: 'Seu saldo foi atualizado.',
      sender: { email: 'admin@test.local', name: 'Admin' },
      sourceId: 'credit-1',
    });

    expect(publishTenantEvent).toHaveBeenCalledWith(expect.objectContaining({
      userEmail: 'member@test.local',
      type: 'canteen-credit',
      sourceType: 'canteen-credit',
      sourceId: 'credit-1',
      senderEmail: 'admin@test.local',
    }));
  });
});
