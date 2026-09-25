export type NotificationRecord = {
  id: string;
  senderEmail?: string | null;
  senderName?: string | null;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
  readAt?: string | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Falha na API de notificações: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function listNotifications() {
  const response = await fetch('/api/notifications', { cache: 'no-store' });
  const data = await parseResponse<{ notifications?: NotificationRecord[] }>(response);
  return Array.isArray(data.notifications) ? data.notifications : [];
}

export async function markNotificationReadRequest(id: string) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markRead' }),
  });
  await parseResponse(response);
}

export async function markAllNotificationsReadRequest() {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markAllRead' }),
  });
  await parseResponse(response);
}
