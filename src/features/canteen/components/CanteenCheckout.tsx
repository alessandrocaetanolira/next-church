'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Banknote, ChefHat, CreditCard, Minus, Plus, ShoppingCart, Smartphone, Store, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common';
import { WebPageContainer } from '@/components/shared/web';
import { db } from '@/lib/db';
import { generateId } from '@/lib/id';
import { formatCurrency } from '@/lib/utils';
import { createCanteenSale } from '@/services/canteen/sales-api';
import { isNetworkError } from '@/services/api/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCartStore } from '../store/useCartStore';
import { useCanteenStatus } from '../hooks/use-canteen-status';
import { useCanteenCartOwner } from '../hooks/use-canteen-cart-owner';
import { syncCanteenMembersFromServer } from '../lib/sync-members';

type PaymentMethod = 'cash' | 'pix' | 'credit' | 'fiado';
type ConsumerType = 'MEMBER' | 'VISITOR' | 'UNIDENTIFIED';

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote; className: string }> = [
  { value: 'cash', label: 'Dinheiro', icon: Banknote, className: 'text-success' },
  { value: 'pix', label: 'PIX', icon: Smartphone, className: 'text-primary' },
  { value: 'credit', label: 'Cartão', icon: CreditCard, className: 'text-sky-600' },
  { value: 'fiado', label: 'Fiado', icon: User, className: 'text-warning' },
];

export function CanteenCheckout() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, incrementItem, decrementItem, removeItem, clearCart, total } = useCartStore();
  const cartReady = useCanteenCartOwner();
  const tenantId = user?.tenantId ?? '';
  const members = useLiveQuery(() => tenantId ? db.members.filter((member) => member.tenantId === tenantId && !member.deletedAt && member.status !== 'inactive').toArray() : [], [tenantId]) || [];
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedMember, setSelectedMember] = useState('');
  const [consumerType, setConsumerType] = useState<ConsumerType>('VISITOR');
  const [sendToPrep, setSendToPrep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { status: canteenStatus, loading: loadingCanteenStatus, refresh: refreshCanteenStatus } = useCanteenStatus();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!cartReady || !items.length || !user?.email || submitting) return;
    if (!canteenStatus.isOpen) {
      toast.error(loadingCanteenStatus ? 'Confirmando o status da cantina…' : 'A cantina está fechada no momento.');
      return;
    }
    if (paymentMethod === 'fiado' && (consumerType !== 'MEMBER' || !selectedMember)) {
      toast.error('Selecione um membro para fiado.');
      return;
    }

    const member = members.find((item) => item.id === selectedMember);
    const payload = {
      id: generateId(),
      total,
      consumerType,
      paymentMethod,
      orderStatus: sendToPrep ? 'preparing' : null,
      items,
      memberId: consumerType === 'MEMBER' ? (selectedMember || undefined) : undefined,
      memberName: consumerType === 'MEMBER' ? member?.name : undefined,
      createdAt: new Date().toISOString(),
      createdBy: user.email,
      tenantId,
    };

    setSubmitting(true);
    try {
      try {
        await createCanteenSale(payload);
        await db.sales.put({ ...payload, orderStatus: sendToPrep ? 'preparing' : undefined, _status: 'synced' });
        if (paymentMethod === 'fiado' && consumerType === 'MEMBER') {
          void syncCanteenMembersFromServer(tenantId).catch(() => {
            // A venda já foi confirmada pelo servidor; a sincronização poderá ser refeita depois.
          });
        }
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        await db.sales.put({ ...payload, orderStatus: sendToPrep ? 'preparing' : undefined, _status: 'pending' });
        await db.syncOutbox.add({ module: 'sales', action: 'create', data: payload, timestamp: new Date().toISOString() });
      }
      clearCart();
      toast.success('Venda registrada!');
      router.replace('/cantina?tab=sales');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('cantina está fechada')) {
        await refreshCanteenStatus();
        toast.error('A cantina foi fechada antes da confirmação da venda.');
      } else {
        toast.error('Não foi possível registrar a venda.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WebPageContainer size="narrow" className="space-y-4">
      <PageHeader title="Finalizar venda" description="Revise o carrinho e informe a forma de pagamento." actions={<Button variant="outline" onClick={() => router.push('/cantina?tab=pdv')}>Voltar ao PDV</Button>} />
      {!items.length ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><ShoppingCart className="h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">O carrinho está vazio.</p><Button onClick={() => router.push('/cantina?tab=pdv')}>Voltar ao PDV</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4 text-primary" />Itens da venda<Badge variant="secondary">{cartCount}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => <div key={item.productId} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.price)} cada</p></div><div className="flex items-center gap-1.5"><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => decrementItem(item.productId)}><Minus className="h-3 w-3" /></Button><span className="w-6 text-center text-sm font-medium">{item.quantity}</span><Button variant="outline" size="icon" className="h-7 w-7" onClick={() => incrementItem(item.productId)}><Plus className="h-3 w-3" /></Button></div><div className="w-20 text-right"><p className="text-sm font-bold">{formatCurrency(item.price * item.quantity)}</p><button type="button" onClick={() => removeItem(item.productId)} className="text-[10px] text-destructive hover:underline">Remover</button></div></div>)}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={clearCart}><Trash2 className="mr-1.5 h-4 w-4" />Limpar carrinho</Button>
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-3xl font-bold text-primary">{formatCurrency(total)}</p>
              {loadingCanteenStatus || !canteenStatus.isOpen ? <div className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground"><Store className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><span>{loadingCanteenStatus ? 'Confirmando se a cantina está aberta…' : 'A cantina está fechada. A venda será liberada quando a operação for aberta.'}</span></div> : null}
              <div className="space-y-2"><Label>Consumidor</Label><Select value={consumerType} onValueChange={(value) => { const next = value as ConsumerType; setConsumerType(next); if (next !== 'MEMBER' && paymentMethod === 'fiado') setPaymentMethod('cash'); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MEMBER">Membro cadastrado</SelectItem><SelectItem value="VISITOR">Visitante</SelectItem><SelectItem value="UNIDENTIFIED">Não identificado</SelectItem></SelectContent></Select></div>
              {consumerType === 'MEMBER' ? <div className="space-y-2"><Label>Membro</Label><Select value={selectedMember} onValueChange={setSelectedMember}><SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div> : null}
              <div className="grid grid-cols-2 gap-2">{PAYMENT_OPTIONS.map(({ value, label, icon: Icon, className }) => <Button key={value} type="button" disabled={value === 'fiado' && consumerType !== 'MEMBER'} variant={paymentMethod === value ? 'default' : 'outline'} className="h-16 flex-col gap-1" onClick={() => setPaymentMethod(value)}><Icon className={`h-5 w-5 ${paymentMethod === value ? 'text-current' : className}`} /><span>{label}</span></Button>)}</div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"><div className="flex items-center gap-2"><ChefHat className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Enviar para preparo</span></div><Button type="button" variant={sendToPrep ? 'default' : 'outline'} size="sm" onClick={() => setSendToPrep((value) => !value)}>{sendToPrep ? 'Sim' : 'Não'}</Button></div>
              <Button className="w-full" size="lg" disabled={!cartReady || submitting || loadingCanteenStatus || !canteenStatus.isOpen} onClick={() => void handleCheckout()}>{submitting ? 'Registrando...' : !cartReady || loadingCanteenStatus ? 'Confirmando status...' : canteenStatus.isOpen ? 'Confirmar venda' : 'Cantina fechada'}</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </WebPageContainer>
  );
}
