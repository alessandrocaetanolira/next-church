import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendNotification, setVapidDetails } = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: { sendNotification, setVapidDetails },
}));

import { WebPushService } from '@/infra/web-push/web-push-service';

const subscription = (id: string) => ({
  id,
  endpoint: `https://push.example.test/${id}`,
  p256dh: `p256dh-${id}`,
  auth: `auth-${id}`,
});

describe('WebPushService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_SUBJECT = 'https://church.example.test';
    process.env.VAPID_PUBLIC_KEY = 'public-key';
    process.env.VAPID_PRIVATE_KEY = 'private-key';
    sendNotification.mockResolvedValue(undefined);
  });

  it('envia o payload para todas as subscriptions válidas', async () => {
    const service = new WebPushService();
    const result = await service.send([subscription('one'), subscription('two')], {
      title: 'Aviso',
      body: 'Mensagem',
      url: '/notifications',
    });

    expect(result).toEqual({ sent: 2, expiredIds: [], failed: 0 });
    expect(setVapidDetails).toHaveBeenCalledWith(
      'https://church.example.test',
      'public-key',
      'private-key',
    );
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example.test/one' }),
      JSON.stringify({ title: 'Aviso', body: 'Mensagem', url: '/notifications' }),
      expect.objectContaining({ TTL: expect.any(Number), timeout: expect.any(Number) }),
    );
  });

  it('separa endpoints expirados de falhas transitórias', async () => {
    sendNotification
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { statusCode: 503 }));

    const result = await new WebPushService().send(
      [subscription('expired'), subscription('failed')],
      { title: 'Aviso', body: 'Mensagem' },
    );

    expect(result).toEqual({ sent: 0, expiredIds: ['expired'], failed: 1 });
  });

  it('não tenta enviar sem configuração VAPID ou subscriptions', async () => {
    delete process.env.VAPID_SUBJECT;
    const result = await new WebPushService().send([subscription('one')], {
      title: 'Aviso',
      body: 'Mensagem',
    });

    expect(result).toEqual({ sent: 0, expiredIds: [], failed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
