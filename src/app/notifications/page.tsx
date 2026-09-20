'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import {
  type NotificationFilter,
  type NotificationRecord,
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notification-center';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasActionPermission } from '@/lib/access-control';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  ShoppingCart,
  ClipboardList,
  Info,
  Gift,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Check,
} from 'lucide-react';

function normalizeType(type: string): NotificationFilter {
  if (type.startsWith('canteen-order-')) return 'order';
  if (type === 'group-post') return 'info';
  if (type.startsWith('feed-')) return 'info';
  if (type === 'kids-private-message' || type === 'parking-private-message') return 'alert';
  if (type === 'announcement') return 'alert';
  if (type === 'task') return 'task';
  if (type === 'loyalty') return 'loyalty';
  if (type === 'alert') return 'alert';
  return 'info';
}

function getNotifIcon(type: string, size = 'w-4 h-4') {
  const normalized = normalizeType(type);

  switch (normalized) {
    case 'order':
      return <ShoppingCart className={cn(size, 'text-green-600')} />;
    case 'task':
      return <ClipboardList className={cn(size, 'text-amber-500')} />;
    case 'alert':
      return <AlertTriangle className={cn(size, 'text-destructive')} />;
    case 'loyalty':
      return <Gift className={cn(size, 'text-primary')} />;
    case 'info':
    default:
      return <Info className={cn(size, 'text-primary')} />;
  }
}

function getNotifColor(type: string) {
  const normalized = normalizeType(type);

  switch (normalized) {
    case 'order':
      return 'bg-green-500/10 border-green-500/20';
    case 'task':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'alert':
      return 'bg-destructive/10 border-destructive/20';
    case 'loyalty':
      return 'bg-primary/10 border-primary/20';
    case 'info':
    default:
      return 'bg-primary/10 border-primary/20';
  }
}

function getTypeLabel(type: string) {
  if (type === 'group-post') return 'Grupo';
  if (type === 'kids-private-message') return 'Infantil';
  if (type === 'parking-private-message') return 'Estacionamento';
  const normalized = normalizeType(type);

  switch (normalized) {
    case 'order':
      return 'Pedido';
    case 'task':
      return 'Tarefa';
    case 'alert':
      return 'Alerta';
    case 'loyalty':
      return 'Fidelidade';
    case 'info':
    default:
      return 'Informativo';
  }
}

function groupByDate(notifs: NotificationRecord[]) {
  const groups: Record<string, NotificationRecord[]> = {};

  notifs.forEach((notification) => {
    const date = new Date(notification.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) key = 'Hoje';
    else if (date.toDateString() === yesterday.toDateString()) key = 'Ontem';
    else key = format(date, "dd 'de' MMMM", { locale: ptBR });

    if (!groups[key]) groups[key] = [];
    groups[key].push(notification);
  });

  return groups;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const canUpdate = hasActionPermission(user, 'notifications', 'update');
  const router = useRouter();
  const { notifications, unreadCount } = useNotificationCenter();
  const [selectedNotif, setSelectedNotif] = useState<NotificationRecord | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const refreshAndMarkAll = useCallback(() => {
    void markAllNotificationsRead();
  }, []);

  const handleClear = useCallback(() => {
    clearNotifications();
    setSelectedNotif(null);
  }, []);

  const handleOpenNotif = useCallback((notification: NotificationRecord) => {
    if (!notification.readAt) {
      void markNotificationRead(notification.id);
    }
    setSelectedNotif(notification);
  }, []);

  const types: NotificationFilter[] = ['all', 'order', 'task', 'alert', 'info', 'loyalty'];

  const filteredNotifications = useMemo(
    () =>
      filter === 'all'
        ? notifications
        : notifications.filter((notification) => normalizeType(notification.type) === filter),
    [filter, notifications]
  );

  const grouped = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <BellRing className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Notificações</h2>
            {canUpdate && unreadCount > 0 ? (
              <Badge variant="destructive" className="text-[10px]">
                {unreadCount} não lidas
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pl-8 sm:pl-0">
            {unreadCount > 0 ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={refreshAndMarkAll}>
                <CheckCheck className="w-3.5 h-3.5" /> Ler todas
              </Button>
            ) : null}
            {canUpdate && notifications.length > 0 ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-destructive" onClick={handleClear}>
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {types.map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
              className="whitespace-nowrap shrink-0 gap-1.5"
            >
              {type !== 'all' ? getNotifIcon(type, 'w-3.5 h-3.5') : null}
              {type === 'all' ? 'Todas' : getTypeLabel(type)}
              {type !== 'all' ? (
                <span className="text-[10px] opacity-70">
                  ({notifications.filter((notification) => normalizeType(notification.type) === type).length})
                </span>
              ) : null}
            </Button>
          ))}
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">Nenhuma notificação</p>
            <p className="text-sm mt-1">Você está em dia!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateLabel, dateNotifications]) => (
              <div key={dateLabel}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {dateLabel}
                </p>
                <div className="space-y-2">
                  <AnimatePresence>
                    {dateNotifications.map((notification, index) => (
                      <motion.button
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          'w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm',
                          !notification.readAt
                            ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                            : 'bg-card border-border hover:bg-muted/50'
                        )}
                        onClick={() => handleOpenNotif(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', getNotifColor(notification.type))}>
                            {getNotifIcon(notification.type, 'w-5 h-5')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={cn('text-sm', !notification.readAt ? 'font-bold' : 'font-medium')}>
                                  {notification.title}
                                </p>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                  {getTypeLabel(notification.type)}
                                </Badge>
                              </div>
                              {!notification.readAt ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1 animate-pulse" />
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                              {format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedNotif ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', getNotifColor(selectedNotif.type))}>
                    {getNotifIcon(selectedNotif.type, 'w-6 h-6')}
                  </div>
                  <div>
                    <DialogTitle className="text-base">{selectedNotif.title}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {getTypeLabel(selectedNotif.type)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(selectedNotif.createdAt), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className={cn('rounded-xl p-4 border', getNotifColor(selectedNotif.type))}>
                  <p className="text-sm leading-relaxed">
                    {selectedNotif.message}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {selectedNotif.readAt ? <Check className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{selectedNotif.readAt ? 'Lida' : 'Não lida'}</span>
                  </div>
                  <span>ID: {selectedNotif.id}</span>
                </div>
                {selectedNotif.href ? (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        void markNotificationRead(selectedNotif.id);
                        router.push(selectedNotif.href as string);
                      }}
                    >
                      Abrir origem
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
