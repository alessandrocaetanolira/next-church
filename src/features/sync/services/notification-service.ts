/**
 * features/sync/services/notification-service.ts
 * 
 * Serviço de notificações em tempo real (simulado via polling).
 * Monitora o banco Dexie em busca de novos pedidos ou tarefas pendentes.
 */

import { db, LocalSale, LocalTask } from '@/lib/db';
import { showBrowserNotification } from '@/lib/pushNotifications';

type NotificationListener = (count: number) => void;
export type NotificationContext = { tenantId: string };
const listeners: Set<NotificationListener> = new Set();
let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Assina mudanças no número de notificações não lidas.
 */
export function subscribeNotifications(listener: NotificationListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Verifica novos eventos no banco Dexie.
 */
async function checkForNewEvents(context?: NotificationContext) {
    const pendingSales = context
        ? await db.sales.filter((sale) => sale.tenantId === context.tenantId && sale._status === 'pending').count()
        : await db.sales.where('_status').equals('pending').count();
    const pendingTasks = context
        ? await db.tasks.filter((task) => task.tenantId === context.tenantId && task.status === 'pending').count()
        : await db.tasks.where('status').equals('pending').count();

    const total = pendingSales + pendingTasks;
    listeners.forEach(fn => fn(total));

    // Notificação do Browser se houver novos pedidos
    if (pendingSales > 0) {
        showBrowserNotification('🛒 Novos Pedidos', {
            body: `Você tem ${pendingSales} novos pedidos na Cantina!`
        });
    }
}

/**
 * Inicia o ciclo de polling (simulação de SSE).
 */
export function startNotificationPolling(intervalMs: number = 15000, context?: NotificationContext) {
    if (pollInterval) return;
    
    checkForNewEvents(context);
    pollInterval = setInterval(() => checkForNewEvents(context), intervalMs);
}

/**
 * Para o ciclo de polling.
 */
export function stopNotificationPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}
