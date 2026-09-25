/**
 * features/canteen/components/PreparoView.tsx
 * 
 * Tela de fila de preparo da Cantina (Cozinha).
 * Exibe pedidos ativos com animações de estado.
 */

"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from '@/components/ui/filter-chip';
import { Button } from "@/components/ui/button";
import { ChefHat, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { updateCanteenSale } from "@/services/canteen/operations-api";

export function PreparoView() {
  const [filter, setFilter] = useState<'all' | 'preparing' | 'ready' | 'cancelled'>('all');
  const orders = useLiveQuery(
    async () => await db.sales.orderBy('createdAt').reverse().toArray(),
    []
  );

  const handleStatusChange = async (orderId: string, orderStatus: 'preparing' | 'ready' | 'cancelled') => {
    try {
      const updatedOrder = await updateCanteenSale<{ orderStatus: string | null }>(orderId, { action: 'status', orderStatus });
      await db.sales.update(orderId, {
        orderStatus: updatedOrder.orderStatus as never,
        _status: 'synced',
      });

      const labels = {
        preparing: 'Pedido em preparo.',
        ready: 'Pedido pronto!',
        cancelled: 'Pedido cancelado.',
      };
      toast.success(labels[orderStatus]);
    } catch {
      toast.error('Erro ao atualizar pedido.');
    }
  };

  const handleRemoveFromQueue = async (orderId: string) => {
    try {
      await updateCanteenSale(orderId, { action: 'archive' });
      await db.sales.delete(orderId);
      toast.success('Pedido retirado da fila.');
    } catch {
      toast.error('Erro ao retirar pedido da fila.');
    }
  };

  const prepOrders = useMemo(() => {
    const allOrders = orders ?? [];
    const eligible = allOrders.filter(
      (order) =>
        order.paymentMethod !== 'pending' &&
        order.paymentMethod !== 'cancelled' &&
        order.orderStatus !== 'pending' &&
        typeof order.orderStatus === 'string'
    );
    if (filter === 'all') return eligible;
    return eligible.filter((order) => order.orderStatus === filter);
  }, [orders, filter]);

  const preparingCount = (orders ?? []).filter((order) => order.paymentMethod !== 'pending' && order.paymentMethod !== 'cancelled' && order.orderStatus === 'preparing').length;
  const readyCount = (orders ?? []).filter((order) => order.paymentMethod !== 'pending' && order.paymentMethod !== 'cancelled' && order.orderStatus === 'ready').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-3 border border-border text-center">
        <p className="text-2xl font-bold text-warning">{preparingCount}</p>
          <p className="text-xs text-muted-foreground">Preparando</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
        <p className="text-2xl font-bold text-success">{readyCount}</p>
          <p className="text-xs text-muted-foreground">Prontos</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-2xl font-bold">{orders?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'preparing', 'ready', 'cancelled'] as const).map((value) => (
          <FilterChip
            key={value}
            active={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === 'all' ? 'Todos' : value === 'preparing' ? 'Preparando' : value === 'ready' ? 'Pronto' : 'Cancelado'}
            {value === 'preparing' && preparingCount > 0 ? (
              <Badge variant="secondary" className="ml-1 text-[10px]">{preparingCount}</Badge>
            ) : null}
          </FilterChip>
        ))}
      </div>

      <div className="space-y-3">
        {prepOrders.map((order) => {
          const status = order.orderStatus === 'pending' ? 'preparing' : (order.orderStatus ?? 'preparing');
          const statusConfig = {
            preparing: { label: 'Preparando', icon: Clock, badge: 'warning' },
            ready: { label: 'Pronto', icon: CheckCircle2, badge: 'success' },
            cancelled: { label: 'Cancelado', icon: XCircle, badge: 'destructive' },
          } as const;
          const Icon = statusConfig[status].icon;

          return (
            <div key={order.id} className={cn(
              'bg-card rounded-xl border border-border overflow-hidden',
              status === 'preparing' && 'border-warning/40',
              status === 'ready' && 'border-success/40'
            )}>
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center',
                      status === 'preparing' ? 'bg-warning/10' : status === 'ready' ? 'bg-success/10' : 'bg-destructive/10'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        status === 'preparing' ? 'text-warning' : status === 'ready' ? 'text-success' : 'text-destructive'
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusConfig[status].badge}>{statusConfig[status].label}</Badge>
                        <span className="text-sm font-medium">Pedido #{order.id.slice(-4)}</span>
                      </div>
                      {order.memberName ? <p className="mt-0.5 text-sm text-muted-foreground">{order.memberName}</p> : null}
                    </div>
                  </div>
                  <p className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="mb-3 space-y-1">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 border-t border-border pt-3">
                  {status === 'preparing' ? (
                    <>
                      <Button size="sm" className="flex-1 gap-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusChange(order.id, 'ready')}>
                        <CheckCircle2 className="w-4 h-4" /> Pronto
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleStatusChange(order.id, 'cancelled')}>
                        <XCircle className="w-4 h-4" /> Cancelar
                      </Button>
                    </>
                  ) : status === 'cancelled' ? (
                    <p className="w-full text-center text-xs text-muted-foreground">Pedido cancelado e mantido no histórico.</p>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => void handleRemoveFromQueue(order.id)}>
                      Retirar da fila
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {prepOrders.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>Nenhum pedido em preparação</p>
          </div>
        )}
      </div>
    </div>
  );
}
