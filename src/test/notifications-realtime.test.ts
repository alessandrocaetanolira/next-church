import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SseBroker, type ServerNotificationEvent } from '@/infra/sse/sse-broker';

const tenantClient = {
  $queryRawUnsafe: vi.fn(),
};

vi.mock('@/lib/prisma-factory', () => ({
  getTenantClient: () => tenantClient,
}));

import { openNotificationsStream } from '@/server/notifications/notifications-stream.controller';

const event = (tenantId: string, userEmail: string): ServerNotificationEvent => ({
  id: `${tenantId}-${userEmail}`,
  tenantId,
  userEmail,
  type: 'test',
  title: 'Teste',
  message: 'Mensagem',
  createdAt: new Date().toISOString(),
});

describe('SseBroker', () => {
  beforeEach(() => tenantClient.$queryRawUnsafe.mockReset());

  it('isola eventos por tenant e usuário', () => {
    const broker = new SseBroker();
    const first: ServerNotificationEvent[] = [];
    const second: ServerNotificationEvent[] = [];
    broker.subscribe('tenant-a', 'user-a@test.local', (value) => first.push(value));
    broker.subscribe('tenant-a', 'user-b@test.local', (value) => second.push(value));

    broker.publish(event('tenant-a', 'user-a@test.local'));

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });

  it('normaliza o email usado na chave da conexão', () => {
    const broker = new SseBroker();
    const received: ServerNotificationEvent[] = [];
    broker.subscribe('tenant-a', 'USER@test.local', (value) => received.push(value));

    broker.publish(event('tenant-a', 'user@test.local'));

    expect(received).toHaveLength(1);
  });

  it('remove o listener quando a conexão é cancelada', () => {
    const broker = new SseBroker();
    const received: ServerNotificationEvent[] = [];
    const unsubscribe = broker.subscribe('tenant-a', 'user@test.local', (value) => received.push(value));
    unsubscribe();

    broker.publish(event('tenant-a', 'user@test.local'));

    expect(received).toHaveLength(0);
  });

  it('entrega notificações perdidas no catch-up antes de manter o stream aberto', async () => {
    tenantClient.$queryRawUnsafe.mockResolvedValueOnce([{
      id: 'notification-1',
      userEmail: 'user@test.local',
      type: 'info',
      title: 'Aviso',
      message: 'Mensagem pendente',
      href: '/notifications',
      sourceType: null,
      sourceId: null,
      readAt: null,
      createdAt: new Date(),
    }]);
    const abort = new AbortController();
    const response = await openNotificationsStream(
      new Request('http://localhost/api/events', { signal: abort.signal }),
      'tenant-a',
      'USER@test.local',
    );
    const reader = response.body!.getReader();
    const first = await reader.read();
    const second = await reader.read();
    const payload = `${new TextDecoder().decode(first.value)}${new TextDecoder().decode(second.value)}`;

    expect(payload).toContain('notification-1');
    expect(payload).toContain('connected');
    expect(tenantClient.$queryRawUnsafe).toHaveBeenCalledTimes(1);

    abort.abort();
    await reader.cancel();
  });
});
