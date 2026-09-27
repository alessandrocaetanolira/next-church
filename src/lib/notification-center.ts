'use client';

import { showBrowserNotification, getNotificationPermission } from '@/lib/pushNotifications';
import { playNotificationBeep } from '@/lib/notification-sound';
import {
  listNotifications,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  type NotificationRecord,
} from '@/services/notifications/notification-api';

export type { NotificationRecord } from '@/services/notifications/notification-api';

export type NotificationFilter = 'all' | 'order' | 'task' | 'alert' | 'info' | 'loyalty';

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: NotificationRecord[] = [];
let initialized = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function sortNotifications(notifications: NotificationRecord[]) {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function subscribeNotificationCenter(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNotificationSnapshot() {
  return cache;
}

export function getUnreadNotificationCount() {
  return cache.filter((notification) => !notification.readAt).length;
}

export async function initializeNotificationCenter(force = false) {
  if (initialized && !force) return;
  initialized = true;

  try {
    cache = sortNotifications(await listNotifications());
    emit();
  } catch {
    initialized = false;
    // Estado local segue vazio até nova tentativa ou evento SSE.
  }
}

export function upsertNotification(notification: NotificationRecord, options?: { toast?: boolean }) {
  const exists = cache.some((item) => item.id === notification.id);
  if (exists) return false;

  cache = sortNotifications([notification, ...cache]).slice(0, 100);
  emit();
  playNotificationBeep(notification.id);

  if (options?.toast !== false && document.hidden && getNotificationPermission() === 'granted') {
    showBrowserNotification(notification.title, {
      body: notification.message,
      tag: notification.id,
    });
  }

  return true;
}

export async function markNotificationRead(id: string) {
  const existing = cache.find((notification) => notification.id === id);
  if (!existing || existing.readAt) return;

  const readAt = new Date().toISOString();
  cache = cache.map((notification) =>
    notification.id === id ? { ...notification, readAt } : notification
  );
  emit();

  try {
    await markNotificationReadRequest(id);
  } catch {
    // Mantém otimista local.
  }
}

export async function markAllNotificationsRead() {
  if (!cache.some((notification) => !notification.readAt)) return;

  const readAt = new Date().toISOString();
  cache = cache.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt }));
  emit();

  try {
    await markAllNotificationsReadRequest();
  } catch {
    // Mantém otimista local.
  }
}

export function clearNotifications() {
  cache = [];
  emit();
}
