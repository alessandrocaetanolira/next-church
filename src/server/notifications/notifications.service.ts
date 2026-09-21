import { ValidationError } from '@/lib/http/errors';
import { NotificationsRepository, type NotificationRow } from './notifications.repository';

export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async list(userEmail: string) { return { notifications: (await this.repository.list(this.email(userEmail))).map((notification) => this.serialize(notification)) }; }

  markRead(id: string, userEmail: string) { if (!id) throw new ValidationError('Notificação inválida.'); return this.repository.markRead(id, this.email(userEmail)); }
  markAllRead(userEmail: string) { return this.repository.markAllRead(this.email(userEmail)); }

  private email(value: string) { const email = value.trim().toLowerCase(); if (!email) throw new ValidationError('Usuário não identificado.'); return email; }
  private serialize(notification: NotificationRow) { return { ...notification, readAt: notification.readAt?.toISOString() ?? null, createdAt: notification.createdAt.toISOString() }; }
}
