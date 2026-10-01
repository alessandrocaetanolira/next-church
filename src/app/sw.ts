/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Dados de API pertencem ao servidor e ao Dexie. Não devem ser duplicados no
  // Cache Storage, especialmente respostas bíblicas ou dados autenticados.
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: /\/_next\/static.+\.js$/i,
      handler: new CacheFirst({
        cacheName: "church-next-static-js",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:css|less|js)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "church-static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: /\.(?:png|svg|ico|webp|jpg|jpeg|gif|woff|woff2|ttf|otf)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "church-static-media",
        plugins: [new ExpirationPlugin({ maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

type PushPayload = {
  title?: string;
  titulo?: string;
  body?: string;
  mensagem?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

const BADGE_DB_NAME = 'church-pwa-meta';
const BADGE_STORE_NAME = 'state';
const BADGE_KEY = 'unread-count';

function updatePwaBadge(delta: number) {
  return new Promise<void>((resolve) => {
    const open = indexedDB.open(BADGE_DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(BADGE_STORE_NAME);
    open.onerror = () => resolve();
    open.onsuccess = () => {
      const db = open.result;
      const read = db.transaction(BADGE_STORE_NAME, 'readonly').objectStore(BADGE_STORE_NAME).get(BADGE_KEY);
      read.onerror = () => resolve();
      read.onsuccess = () => {
        const count = Math.max(0, Number(read.result ?? 0) + delta);
        const write = db.transaction(BADGE_STORE_NAME, 'readwrite').objectStore(BADGE_STORE_NAME).put(count, BADGE_KEY);
        write.onsuccess = () => {
          const registration = self.registration as ServiceWorkerRegistration & { setAppBadge?: (value?: number) => Promise<void> };
          void registration.setAppBadge?.(count).catch(() => undefined);
          resolve();
        };
        write.onerror = () => resolve();
      };
    };
  });
}

self.addEventListener('push', (event: Event) => {
  const pushEvent = event as PushEvent;
  let payload: PushPayload = {};
  try {
    payload = pushEvent.data?.json() as PushPayload;
  } catch {
    payload = { body: pushEvent.data?.text() ?? 'Nova notificação.' };
  }
  const data = payload.data ?? payload.payload ?? {};
  const title = payload.title ?? payload.titulo ?? String(data.titulo ?? 'Church App');
  const body = payload.body ?? payload.mensagem ?? String(data.mensagem ?? 'Você recebeu uma nova notificação.');
  const targetUrl = payload.url ?? String(data.url ?? data.mobileLink ?? data.webLink ?? data.link ?? '/notifications');
  const notificationId = String(data.notificationId ?? payload.tag ?? data.type ?? 'push-notification');
  const notifyOpenClients = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'church:push-notification', notificationId }));
  });
  const showNotification = self.registration.showNotification(title, {
    body,
    icon: payload.icon ?? '/pwa-192x192.png',
    badge: payload.badge ?? payload.icon ?? '/pwa-192x192.png',
    tag: payload.tag ?? String(data.tipo ?? data.type ?? ''),
    vibrate: [80, 40, 80],
    data: { ...data, url: targetUrl, notificationId },
  } as NotificationOptions & { vibrate: number[] });
  pushEvent.waitUntil(Promise.all([notifyOpenClients, showNotification, updatePwaBadge(1)]));
});

self.addEventListener('notificationclick', (event: Event) => {
  const notificationEvent = event as NotificationEvent;
  notificationEvent.notification.close();
  notificationEvent.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const target = new URL(String(notificationEvent.notification.data?.url ?? '/notifications'), self.location.origin).href;
    const current = clients.find((client) => client.url === target);
    if (current && 'focus' in current) return current.focus();
    return self.clients.openWindow?.(target);
  }));
});

serwist.addEventListeners();
