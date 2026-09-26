'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NotificationRecord } from '@/lib/notification-center';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type NotificationsWebTableProps = { notifications: NotificationRecord[]; getTypeLabel: (type: string) => string; onOpen: (notification: NotificationRecord) => void };

export function NotificationsWebTable({ notifications, getTypeLabel, onOpen }: NotificationsWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Notificação</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {notifications.map((notification) => <TableRow key={notification.id} className={!notification.readAt ? 'bg-primary/5' : undefined}><TableCell><div className="max-w-[520px]"><p className={!notification.readAt ? 'font-bold' : 'font-medium'}>{notification.title}</p><p className="truncate text-sm text-muted-foreground">{notification.message}</p></div></TableCell><TableCell><Badge variant="outline">{getTypeLabel(notification.type)}</Badge></TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{format(new Date(notification.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell><TableCell>{notification.readAt ? <Badge variant="secondary">Lida</Badge> : <Badge>Não lida</Badge>}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onOpen(notification)}>Abrir</Button></TableCell></TableRow>)}
    {notifications.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhuma notificação.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
