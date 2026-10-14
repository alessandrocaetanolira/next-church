/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { isOfflineNavigation, offlineDocumentResponse, offlineNavigationRedirect } from "../lib/offline-navigation";
import {
  CacheFirst,
  disableNavigationPreload,
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

const serwist: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // A estratégia de precache aguarda preload antes do cache. Na abertura fria
  // offline não podemos depender dessa consulta paralela do navegador.
  navigationPreload: false,
  // Dados de API pertencem ao servidor e ao Dexie. Não devem ser duplicados no
  // Cache Storage, especialmente respostas bíblicas ou dados autenticados.
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      // Link/router.push usam Flight; HTML de fallback não é um payload RSC.
      matcher: ({ sameOrigin, request }) => sameOrigin && request.headers.get("RSC") === "1",
      handler: new NetworkOnly({
        plugins: [{
          handlerDidError: async ({ request }): Promise<Response> => offlineNavigationRedirect(
            request,
            (url) => Boolean(serwist.getPrecacheKeyForUrl(url)),
          ),
        }],
      }),
    },
    {
      // Sem uma estratégia para documentos, Serwist não aciona o fallback:
      // refresh e rotas não visitadas terminavam na página de erro do navegador.
      matcher: ({ sameOrigin, request }) => sameOrigin && isOfflineNavigation(request),
      handler: async ({ request }) => {
        try {
          return await fetch(request);
        } catch {
          return offlineDocumentResponse(request, (url) => serwist.matchPrecache(url));
        }
      },
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
          return isOfflineNavigation(request);
        },
      },
    ],
  },
});

// O estado pertence ao registro: apenas mudar a opção não desativa um preload
// habilitado pelo worker anterior. Usar a API do Serwist na ativação do novo.
disableNavigationPreload();

// Também cobre uma entrada do precache que tenha sido removida pelo navegador.
serwist.setCatchHandler(async ({ request }) => {
  if (isOfflineNavigation(request)) {
    return offlineDocumentResponse(request, (url) => serwist.matchPrecache(url));
  }
  return Response.error();
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
          // No contexto do Service Worker, a Badging API pertence ao
          // WorkerNavigator, não ao ServiceWorkerRegistration. A chamada no
          // registration era silenciosamente ignorada e o ícone não recebia
          // o contador mesmo após o Push chegar.
          const appBadge = self.navigator as WorkerNavigator & {
            setAppBadge?: (value?: number) => Promise<void>;
            clearAppBadge?: () => Promise<void>;
          };
          const operation = count > 0 ? appBadge.setAppBadge?.(count) : appBadge.clearAppBadge?.();
          if (!operation) {
            console.warn('[push-worker] Badging API indisponível neste dispositivo.');
          } else {
            void operation.catch((error: unknown) => {
              console.warn('[push-worker] não foi possível atualizar o badge do app.', error);
            });
          }
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
