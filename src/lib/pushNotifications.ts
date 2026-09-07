/**
 * Browser Notification API integration for Mesa App PWA.
 * 
 * Since there's no backend, we use the browser's Notification API
 * directly (not Push API which requires a push server).
 * Works when the app is open (foreground notifications).
 * On Android PWA, notifications appear in the system tray.
 * On iOS 16.4+, notifications work if the PWA is installed.
 */

const PERMISSION_KEY = 'mesa-app-notification-permission';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if the browser supports the Notification API
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request permission to show notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_KEY, permission);
    return permission as NotificationPermissionStatus;
  } catch {
    return 'denied';
  }
}

/**
 * Show a browser notification (works when app is in foreground)
 */
export function showBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      tag: options?.tag,
      requireInteraction: options?.requireInteraction || false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  } catch {
    return null;
  }
}

/**
 * Check if the app is running as an installed PWA
 */
export function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

/**
 * Check offline status
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Register online/offline event listeners
 */
export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
