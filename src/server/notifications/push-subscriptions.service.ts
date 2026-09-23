import { z } from 'zod';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export class PushSubscriptionsService {
  constructor(private readonly repository: PushSubscriptionsRepository) {}

  async register(email: string, input: z.infer<typeof pushSubscriptionSchema>) {
    const user = await this.repository.findUserIdByEmail(email.trim().toLowerCase());
    if (!user) throw new Error('Usuário não encontrado.');
    return this.repository.upsert(user.id, input.endpoint, input.keys.p256dh, input.keys.auth);
  }

  async remove(email: string, endpoint: string) {
    const user = await this.repository.findUserIdByEmail(email.trim().toLowerCase());
    if (!user) return;
    await this.repository.remove(user.id, endpoint);
  }
}
