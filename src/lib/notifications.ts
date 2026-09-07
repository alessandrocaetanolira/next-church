// Real-time notification system using setInterval (SSE simulation)
// Integrates with browser Notification API for system-level alerts

import { getSales, getTasks } from '@/lib/storage';
import { showBrowserNotification, getNotificationPermission } from '@/lib/pushNotifications';

export type NotificationType = 'order' | 'task' | 'alert' | 'info' | 'loyalty';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: string;
  sound?: boolean;
}

const NOTIFICATIONS_KEY = 'mesa-app-notifications';
const LAST_CHECK_KEY = 'mesa-app-last-check';

type NotificationListener = (notifications: AppNotification[]) => void;
const listeners: Set<NotificationListener> = new Set();
let pollInterval: ReturnType<typeof setInterval> | null = null;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function getNotifications(): AppNotification[] {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

export function saveNotifications(notifications: AppNotification[]): void {
  // Keep only last 50
  const trimmed = notifications.slice(0, 50);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
}

export function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
  const newNotif: AppNotification = {
    ...notification,
    id: generateId(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  
  const all = getNotifications();
  all.unshift(newNotif);
  saveNotifications(all);
  
  // Play sound if enabled
  if (notification.sound !== false) {
    playNotificationSound();
  }
  
  // Show browser notification if permission granted and document not focused
  if (getNotificationPermission() === 'granted' && document.hidden) {
    showBrowserNotification(notification.title, {
      body: notification.message,
      tag: newNotif.id,
    });
  }
  
  // Notify listeners
  notifyListeners();
  
  return newNotif;
}

export function markAsRead(id: string): void {
  const all = getNotifications();
  const notif = all.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    saveNotifications(all);
    notifyListeners();
  }
}

export function markAllAsRead(): void {
  const all = getNotifications();
  all.forEach(n => n.read = true);
  saveNotifications(all);
  notifyListeners();
}

export function clearNotifications(): void {
  saveNotifications([]);
  notifyListeners();
}

// Sound alert
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Silently fail if audio not available
  }
}

// Listener management
function notifyListeners() {
  const notifications = getNotifications();
  listeners.forEach(fn => fn(notifications));
}

export function subscribeNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// SSE simulation - poll for changes
function checkForNewEvents() {
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(Date.now() - 60000);
  const now = new Date();
  
  // Check for new sales since last check
  const sales = getSales();
  const newSales = sales.filter(s => new Date(s.createdAt) > lastCheckDate);
  
  newSales.forEach(sale => {
    // Avoid duplicate notifications
    const existing = getNotifications();
    if (existing.some(n => n.message.includes(sale.id))) return;
    
    addNotification({
      type: 'order',
      title: '🛒 Novo Pedido!',
      message: `Venda de R$ ${sale.total.toFixed(2)} (${sale.items.length} item) - ID: ${sale.id}`,
      sound: true,
    });
  });

  // Check for tasks due today
  const tasks = getTasks();
  const todayStr = now.toDateString();
  const dueTasks = tasks.filter(t => {
    const taskDate = new Date(t.date).toDateString();
    return taskDate === todayStr && t.status === 'pending';
  });

  // Only notify once per session about due tasks
  const existingNotifs = getNotifications();
  dueTasks.forEach(task => {
    if (existingNotifs.some(n => n.message.includes(task.id))) return;
    addNotification({
      type: 'task',
      title: '📋 Tarefa Pendente',
      message: `\"${task.title}\" está pendente para hoje - ID: ${task.id}`,
      sound: false,
    });
  });

  localStorage.setItem(LAST_CHECK_KEY, now.toISOString());
}

// Simulated church announcements
const churchAnnouncements = [
  { title: '⛪ Aviso da Igreja', message: 'Culto especial nesta quarta-feira às 19h30!' },
  { title: '🙏 Semana de Oração', message: 'Participe da semana de oração e jejum.' },
  { title: '📖 Estudo Bíblico', message: 'Novo ciclo de estudos bíblicos às quintas.' },
  { title: '🎵 Ensaio do Louvor', message: 'Ensaio do grupo de louvor sábado às 14h.' },
  { title: '❤️ Ação Social', message: 'Campanha de arrecadação de alimentos iniciada!' },
];

let announcementIndex = 0;

function maybeShowAnnouncement() {
  // Show a random announcement every ~5 minutes (simulated)
  if (Math.random() < 0.1) { // 10% chance per check
    const announcement = churchAnnouncements[announcementIndex % churchAnnouncements.length];
    announcementIndex++;
    
    const existing = getNotifications();
    // Don't repeat the same announcement
    if (!existing.some(n => n.message === announcement.message)) {
      addNotification({
        type: 'info',
        title: announcement.title,
        message: announcement.message,
        sound: true,
      });
    }
  }
}

// Start/stop polling
export function startNotificationPolling(intervalMs: number = 15000): void {
  if (pollInterval) return;
  
  // Initial check
  checkForNewEvents();
  
  pollInterval = setInterval(() => {
    checkForNewEvents();
    maybeShowAnnouncement();
  }, intervalMs);
}

export function stopNotificationPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
