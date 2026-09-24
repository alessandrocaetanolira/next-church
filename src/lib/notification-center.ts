'use client';

import { showBrowserNotification, getNotificationPermission } from '@/lib/pushNotifications';
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

function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.16);

    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.32);

    void ctx.close().catch(() => undefined);
  } catch {
    // Áudio é opcional; falha silenciosamente.
  }
}

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
  playNotificationSound();

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
