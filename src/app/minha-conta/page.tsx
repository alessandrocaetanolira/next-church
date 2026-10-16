'use client';

import { Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getCanteenAccess } from '@/lib/canteen/access';
import { CANTEEN_PURCHASE_HREF } from '@/lib/canteen/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { db, type LocalSale } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Wallet, ShoppingBag, Receipt, MessageCircle, UserRound, Bell, Gift
} from 'lucide-react';
import { SharedFlatList } from '@/components/SharedFlatList';
import { LoadingState } from '@/components/common';
import { 
  getLoyaltyConfig, getLoyaltyProgress, isLoyaltyActive
} from '@/lib/loyalty';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { syncMemberSalesFromServer, type MemberWalletLedgerEntry } from '@/features/canteen/lib/sync-member-sales';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { apiClient } from '@/lib/api';
import type { MemberWalletPayload } from '@/features/canteen/lib/sync-member-sales';

type FinancialMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance?: number;
};

type WalletSummary = { debits: number; payments: number; balance: number };

const TRANSACTIONS_PAGE_SIZE = 12;

function MyAccountPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const tenantId = user?.tenantId ?? '';
  const { canOrder } = getCanteenAccess(user);
  const { notifications } = useNotificationCenter();
  const push = usePushSubscription();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  
  const [financialMember, setFinancialMember] = useState<FinancialMember | null>(null);
  const [serverTransactions, setServerTransactions] = useState<LocalSale[]>([]);
  const [walletLedger, setWalletLedger] = useState<MemberWalletLedgerEntry[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [ledgerNextCursor, setLedgerNextCursor] = useState<string | null>(null);
  const [loadingMoreLedger, setLoadingMoreLedger] = useState(false);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(TRANSACTIONS_PAGE_SIZE);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const syncingRef = useRef(false);

  useEffect(() => {
    setPageTitle('Carteira');
  }, [setPageTitle]);

  useEffect(() => {
    let active = true;

    const loadFinancials = async () => {
      if (!tenantId || !userId) return;

      try {
        const payload = await syncMemberSalesFromServer(tenantId);
        if (!active) return;

        setFinancialMember(payload.member ?? null);
        setServerTransactions(Array.isArray(payload.sales) ? payload.sales : []);
        setWalletLedger(Array.isArray(payload.ledger) ? payload.ledger : []);
        setWalletSummary(payload.summary ?? null);
        setLedgerNextCursor(payload.ledgerNextCursor ?? null);
      } catch {
        // Fallback silencioso para Dexie local
      }
    };

    void loadFinancials();

    return () => {
      active = false;
    };
  }, [tenantId, userId]);

  useEffect(() => {
    let cancelled = false;

    const refreshMemberSales = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const payload = await syncMemberSalesFromServer(tenantId);
        if (!cancelled) {
          setFinancialMember(payload.member ?? null);
          setServerTransactions(Array.isArray(payload.sales) ? payload.sales : []);
          setWalletLedger(Array.isArray(payload.ledger) ? payload.ledger : []);
          setWalletSummary(payload.summary ?? null);
          setLedgerNextCursor(payload.ledgerNextCursor ?? null);
        }
      } catch {
        // Próxima notificação ou navegação tentará novamente.
      } finally {
        if (!cancelled) syncingRef.current = false;
      }
    };

    const nextIds = new Set(seenNotificationIdsRef.current);
    const hasNewMemberOrderEvent = notifications.some((notification) => {
      const isNew = !nextIds.has(notification.id);
      nextIds.add(notification.id);
      return isNew && (notification.type.startsWith('canteen-order-') || notification.type.startsWith('canteen-credit-'));
    });

    seenNotificationIdsRef.current = nextIds;

    if (hasNewMemberOrderEvent) {
      void refreshMemberSales();
    }

    return () => {
      cancelled = true;
    };
  }, [notifications, tenantId]);

  const loadMoreLedger = useCallback(async () => {
    if (!ledgerNextCursor || loadingMoreLedger) return;
    setLoadingMoreLedger(true);
    try {
      const payload = await apiClient.get<MemberWalletPayload>('/api/members/me/financials', {
        cache: 'no-store', query: { ledgerCursor: ledgerNextCursor },
      });
      setWalletLedger((current) => {
        const knownIds = new Set(current.map((entry) => entry.id));
        return [...current, ...(payload.ledger ?? []).filter((entry) => !knownIds.has(entry.id))];
      });
      setLedgerNextCursor(payload.ledgerNextCursor ?? null);
    } catch {
      toast.error('Não foi possível carregar mais lançamentos do extrato.');
    } finally {
      setLoadingMoreLedger(false);
    }
  }, [ledgerNextCursor, loadingMoreLedger]);

  // Mock finding member by email
  const linkedMember = useLiveQuery(
    () => user?.email && tenantId ? db.members.filter((member) => member.email === user.email && member.tenantId === tenantId).first() : undefined,
    [user?.email, tenantId]
  );

  // Mock sales history
  const transactions = useLiveQuery(
    () => linkedMember && tenantId ? db.sales.filter((sale) => sale.memberId === linkedMember.id && sale.tenantId === tenantId).toArray().then((items) => items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10)) : [],
    [linkedMember, tenantId]
  );
  const loyaltyConfig = getLoyaltyConfig();
  const loyaltyProgress = linkedMember ? getLoyaltyProgress(linkedMember.id) : null;
  const resolvedMember = financialMember ?? linkedMember ?? null;
  const resolvedTransactions = useMemo(
    () =>
      (serverTransactions.length > 0 ? serverTransactions : (transactions ?? []))
        .filter((transaction) => transaction.paymentMethod !== 'pending' && transaction.paymentMethod !== 'cancelled')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [serverTransactions, transactions]
  );

  const visibleTransactions = useMemo(
    () => resolvedTransactions.slice(0, visibleTransactionCount),
    [resolvedTransactions, visibleTransactionCount]
  );

  useEffect(() => {
    setVisibleTransactionCount(TRANSACTIONS_PAGE_SIZE);
  }, [resolvedTransactions.length]);

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Faça login para acessar sua carteira</p>
        <Button onClick={() => router.push('/auth/login')}>Fazer Login</Button>
      </div>
    );
  }

  // --- PROFILE VIEW ---
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Minha conta</h1>
          <p className="text-sm text-muted-foreground">Carteira, pedidos e dados pessoais.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/minha-conta/perfil')}>
          <UserRound className="mr-2 h-4 w-4" />Perfil
        </Button>
      </div>
      {/* Balance & Loyalty Group */}
      <div className="grid gap-4">
        {/* Balance */}
        {resolvedMember ? (
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                  <Wallet className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saldo em Aberto</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(resolvedMember.creditBalance ?? 0).toFixed(2)}
                  </p>
                </div>
                {(resolvedMember.creditBalance ?? 0) > 0 && (
                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                )}
              </div>
              {walletSummary ? <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cobranças</p><p className="mt-1 text-sm font-semibold text-destructive">R$ {walletSummary.debits.toFixed(2)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pagamentos</p><p className="mt-1 text-sm font-semibold text-success">R$ {walletSummary.payments.toFixed(2)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Situação</p><p className={cn('mt-1 text-sm font-semibold', walletSummary.balance > 0 ? 'text-warning' : 'text-success')}>{walletSummary.balance > 0 ? 'Pendente' : 'Em dia'}</p></div>
              </div> : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6 text-center">
              <Wallet className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Vincule sua conta para ver seu saldo.</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alertas</p>
              <p className="mt-1 text-sm text-foreground">
                {push.subscribed ? 'Você receberá avisos de pedidos, cobranças e atualizações.' : 'Ative para receber avisos importantes neste dispositivo.'}
              </p>
              {push.error ? <p className="mt-1 text-xs text-destructive">{push.error}</p> : null}
              {!push.supported && push.supportIssue ? <p className="mt-1 text-xs text-muted-foreground">{push.supportIssue}</p> : null}
            </div>
            {push.subscribed ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={push.loading}
                onClick={() => void push.unsubscribe()}
              >
                Desativar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={!push.supported || push.loading || push.permission === 'denied'}
                onClick={() => void push.subscribe().then((enabled) => {
                  if (enabled) toast.success('Alertas ativados neste dispositivo.');
                })}
              >
                {push.loading ? 'Ativando...' : push.permission === 'denied' ? 'Bloqueado' : 'Ativar'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Loyalty */}
        {isLoyaltyActive(loyaltyConfig) && linkedMember && loyaltyProgress && (
          <Card className="border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 flex items-center gap-2 border-b border-border/50">
              <Gift className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Programa de Fidelidade</h3>
            </div>
            <CardContent className="p-5">
              {loyaltyProgress.hasReward ? (
                <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-center">
                  <Gift className="mx-auto mb-2 h-8 w-8 animate-bounce text-success" />
                  <p className="font-bold text-success">Recompensa Disponível!</p>
                  <p className="mt-1 text-xs text-success/80">Você ganhou {loyaltyConfig.discountPercent}% de desconto na próxima compra.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      Progresso atual
                    </span>
                    <span className="font-bold text-primary">{loyaltyProgress.current} / {loyaltyProgress.target}</span>
                  </div>
                  <Progress value={loyaltyProgress.percentage} className="h-2.5" />
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Faltam {loyaltyProgress.target - loyaltyProgress.current} compras para ganhar {loyaltyConfig.discountPercent}% off
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3">
        {canOrder ? <Button variant="outline" className="h-24 flex-col gap-3 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm border-border" onClick={() => router.push(CANTEEN_PURCHASE_HREF)}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-sm">Fazer Pedido</span>
        </Button> : null}
      </div>

      {/* Transaction History */}
      {resolvedMember && resolvedTransactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Carteira
            </h3>
          </div>
          <SharedFlatList
            data={visibleTransactions}
            keyExtractor={(transaction) => transaction.id}
            className="grid-cols-1"
            hasMore={visibleTransactionCount < resolvedTransactions.length}
            onEndReached={() => setVisibleTransactionCount((current) => Math.min(current + TRANSACTIONS_PAGE_SIZE, resolvedTransactions.length))}
            renderItem={(transaction) => <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold', transaction.paymentMethod === 'fiado' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success')}>
                  {transaction.paymentMethod === 'fiado' ? '-' : '+'}
                </div>
                <div>
                  <p className="line-clamp-1 text-sm font-medium">{transaction.items?.length || 0} itens</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(transaction.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
              <span className="text-sm font-bold">R$ {transaction.total.toFixed(2)}</span>
            </div>}
          />
        </div>
      )}

      {resolvedMember && walletLedger.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              Extrato de débitos e pagamentos
            </h3>
          </div>
          <SharedFlatList
            data={walletLedger}
            keyExtractor={(entry) => entry.id}
            className="grid-cols-1"
            hasMore={Boolean(ledgerNextCursor)}
            loadingMore={loadingMoreLedger}
            onEndReached={loadMoreLedger}
            renderItem={(entry) => {
              const isPayment = entry.type === 'payment';
              return <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold', isPayment ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                    {isPayment ? '+' : '-'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{isPayment ? 'Pagamento recebido' : 'Compra em fiado'}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.notes || format(new Date(entry.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                <span className={cn('text-sm font-bold', isPayment ? 'text-success' : 'text-destructive')}>
                  {isPayment ? '-' : '+'} R$ {entry.amount.toFixed(2)}
                </span>
              </div>;
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Compatibilidade de links antigos sem montar o catálogo/carrinho removido. */
function MyAccountEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyOrder = searchParams.get('view') === 'order';

  useEffect(() => {
    if (legacyOrder) router.replace(CANTEEN_PURCHASE_HREF);
  }, [legacyOrder, router]);

  return legacyOrder ? <LoadingState label="Abrindo seu carrinho..." /> : <MyAccountPageContent />;
}

export default function MyAccountPage() {
  return <Suspense fallback={<LoadingState label="Carregando minha conta..." />}>
    <MyAccountEntry />
  </Suspense>;
}
