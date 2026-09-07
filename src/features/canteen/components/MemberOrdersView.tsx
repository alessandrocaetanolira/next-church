'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Smartphone, Banknote, User, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

type PaymentChoice = 'cash' | 'pix' | 'credit' | 'fiado';

export function MemberOrdersView() {
  const orders = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray()) || [];
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.paymentMethod === 'pending'),
    [orders]
  );

  const selectedOrder = pendingOrders.find((order) => order.id === selectedOrderId) ?? null;

  const applyOrderDecision = async (action: 'approve' | 'reject', paymentMethod?: PaymentChoice) => {
    if (!selectedOrder) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/canteen/sales/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, paymentMethod }),
      });

      if (!response.ok) throw new Error();

      const updated = await response.json();
      await db.sales.update(selectedOrder.id, {
        paymentMethod: updated.paymentMethod,
        orderStatus: updated.orderStatus,
        _status: 'synced',
      } as never);

      if (updated.paymentMethod === 'fiado' && selectedOrder.memberId) {
        const member = await db.members.get(selectedOrder.memberId);
        await db.members.update(selectedOrder.memberId, {
          creditBalance: (member?.creditBalance ?? 0) + selectedOrder.total,
        });
      }

      toast.success(action === 'approve' ? 'Pedido aprovado.' : 'Pedido rejeitado.');
      setSelectedOrderId(null);
    } catch {
      toast.error('Erro ao atualizar pedido.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {pendingOrders.map((order) => (
          <div key={order.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{order.memberName || 'Pedido sem identificação'}</p>
                  <Badge variant="secondary">Novo pedido</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => setSelectedOrderId(order.id)}>
                Aprovar pedido
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => applyOrderDecision('reject')}>
                Rejeitar
              </Button>
            </div>
          </div>
        ))}

        {pendingOrders.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-muted-foreground">
            <p>Nenhum novo pedido no momento.</p>
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="font-medium">{selectedOrder?.memberName || 'Pedido sem identificação'}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder?.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}</p>
              <p className="mt-2 font-bold text-primary">{formatCurrency(selectedOrder?.total ?? 0)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2" disabled={processing} onClick={() => applyOrderDecision('approve', 'cash')}>
                <Banknote className="w-5 h-5 text-green-600" />
                <span>Dinheiro</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" disabled={processing} onClick={() => applyOrderDecision('approve', 'pix')}>
                <Smartphone className="w-5 h-5 text-primary" />
                <span>PIX</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" disabled={processing} onClick={() => applyOrderDecision('approve', 'credit')}>
                <CreditCard className="w-5 h-5 text-sky-600" />
                <span>Cartão</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2" disabled={processing} onClick={() => applyOrderDecision('approve', 'fiado')}>
                <User className="w-5 h-5 text-amber-600" />
                <span>Fiado</span>
              </Button>
            </div>

            <Button variant="ghost" className="w-full text-destructive" disabled={processing} onClick={() => applyOrderDecision('reject')}>
              <XCircle className="mr-2 h-4 w-4" />
              Rejeitar pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
