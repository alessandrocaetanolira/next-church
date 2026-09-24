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
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

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
  pushEvent.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag ?? String(data.tipo ?? data.type ?? ''),
    data: { ...data, url: targetUrl },
  }));
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
