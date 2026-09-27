'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { Banknote, ChefHat, CreditCard, Minus, Plus, ShoppingCart, Smartphone, Trash2, User } from 'lucide-react';
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
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCartStore } from '../store/useCartStore';

type PaymentMethod = 'cash' | 'pix' | 'credit' | 'fiado';

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
  const tenantId = user?.tenantId ?? '';
  const members = useLiveQuery(() => tenantId ? db.members.filter((member) => member.tenantId === tenantId).toArray() : [], [tenantId]) || [];
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedMember, setSelectedMember] = useState('');
  const [sendToPrep, setSendToPrep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!items.length || !user?.email || submitting) return;
    if (paymentMethod === 'fiado' && !selectedMember) {
      toast.error('Selecione um membro para fiado.');
      return;
    }

    const member = members.find((item) => item.id === selectedMember);
    const payload = {
      id: generateId(),
      total,
      paymentMethod,
      items,
      memberId: paymentMethod === 'fiado' ? selectedMember : undefined,
      memberName: paymentMethod === 'fiado' ? member?.name : undefined,
      createdAt: new Date().toISOString(),
      createdBy: user.email,
      tenantId,
    };

    setSubmitting(true);
    try {
      try {
        await createCanteenSale(payload);
        await db.sales.put({ ...payload, orderStatus: sendToPrep ? 'preparing' : undefined, _status: 'synced' });
      } catch {
        await db.sales.put({ ...payload, orderStatus: sendToPrep ? 'preparing' : undefined, _status: 'pending' });
        await db.syncOutbox.add({ module: 'sales', action: 'create', data: payload, timestamp: new Date().toISOString() });
      }
      clearCart();
      toast.success('Venda registrada!');
      router.replace('/cantina?tab=sales');
    } catch {
      toast.error('Não foi possível registrar a venda.');
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
              <div className="grid grid-cols-2 gap-2">{PAYMENT_OPTIONS.map(({ value, label, icon: Icon, className }) => <Button key={value} type="button" variant={paymentMethod === value ? 'default' : 'outline'} className="h-16 flex-col gap-1" onClick={() => setPaymentMethod(value)}><Icon className={`h-5 w-5 ${paymentMethod === value ? 'text-current' : className}`} /><span>{label}</span></Button>)}</div>
              {paymentMethod === 'fiado' ? <div className="space-y-2"><Label>Membro</Label><Select value={selectedMember} onValueChange={setSelectedMember}><SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div> : null}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"><div className="flex items-center gap-2"><ChefHat className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Enviar para preparo</span></div><Button type="button" variant={sendToPrep ? 'default' : 'outline'} size="sm" onClick={() => setSendToPrep((value) => !value)}>{sendToPrep ? 'Sim' : 'Não'}</Button></div>
              <Button className="w-full" size="lg" disabled={submitting} onClick={() => void handleCheckout()}>{submitting ? 'Registrando...' : 'Confirmar venda'}</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </WebPageContainer>
  );
}
