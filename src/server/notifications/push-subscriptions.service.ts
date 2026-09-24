import { z } from 'zod';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export class PushSubscriptionsService {
  constructor(private readonly repository: PushSubscriptionsRepository) {}

  async register(email: string, input: z.infer<typeof pushSubscriptionSchema>) {
    console.info('[push-server] service procurando usuário', { email });
    const user = await this.repository.findUserIdByEmail(email.trim().toLowerCase());
    console.info('[push-server] usuário encontrado', { userId: user?.id ?? null });
    if (!user) throw new Error('Usuário não encontrado.');
    const result = await this.repository.upsert(user.id, input.endpoint, input.keys.p256dh, input.keys.auth);
    console.info('[push-server] upsert concluído', { userId: user.id, affectedRows: result });
    return result;
  }

  async remove(email: string, endpoint: string) {
    const user = await this.repository.findUserIdByEmail(email.trim().toLowerCase());
    if (!user) return;
    await this.repository.remove(user.id, endpoint);
  }
}
