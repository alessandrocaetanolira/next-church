/**
 * features/canteen/components/SalesHistory.tsx
 *
 * Histórico de vendas da Cantina.
 * Mantém a estrutura do Vite com subabas de vendas e fiado.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, CreditCard, DollarSign, FileSpreadsheet, FileText, MessageSquare, Receipt, Search, Smartphone, TrendingUp, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { getMemberLedger, registerMemberPayment } from "@/services/canteen/operations-api";
import { exportDebtExcel, exportDebtPDF, exportSalesExcel, exportSalesPDF, sendWhatsApp } from "../services/export";
import { toast } from "sonner";
import { useAppSettings } from "@/components/providers/AppSettingsProvider";

type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  saleId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

type MemberLedger = {
  member: {
    id: string;
    name: string;
    creditBalance?: number;
  };
  summary: {
    debits: number;
    payments: number;
    balance: number;
  };
  entries: LedgerEntry[];
};

export function SalesHistory() {
  const { settings } = useAppSettings();
  const sales = useLiveQuery(() => db.sales.orderBy("createdAt").reverse().toArray());
  const members = useLiveQuery(() => db.members.toArray()) ?? [];
  const [search, setSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const [shareReceiptSaleId, setShareReceiptSaleId] = useState<string | null>(null);
  const [debtPhone, setDebtPhone] = useState("");
  const [shareDebtMemberId, setShareDebtMemberId] = useState<string | null>(null);
  const [ledgerMemberId, setLedgerMemberId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<MemberLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const todaySales = useMemo(() => {
    const currentSales = sales ?? [];
    const today = new Date().toDateString();
    return currentSales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  }, [sales]);

  const todayTotal = useMemo(() => todaySales.reduce((sum, sale) => sum + sale.total, 0), [todaySales]);

  const filteredSales = useMemo(() => {
    const term = search.toLowerCase();
    return (sales ?? []).filter(
      (sale) =>
        sale.items.some((item) => item.name.toLowerCase().includes(term)) ||
        (sale.memberName?.toLowerCase().includes(term) ?? false),
    );
  }, [sales, search]);

  const membersWithDebt = useMemo(
    () =>
      members
        .filter((member) => (member.creditBalance ?? 0) > 0)
        .sort((a, b) => (b.creditBalance ?? 0) - (a.creditBalance ?? 0)),
    [members],
  );

  const totalDebt = useMemo(
    () => membersWithDebt.reduce((sum, member) => sum + (member.creditBalance ?? 0), 0),
    [membersWithDebt],
  );

  useEffect(() => {
    const fiadoSales = (sales ?? []).filter((sale) => sale.paymentMethod === 'fiado');
    if (fiadoSales.length > 0 && membersWithDebt.length === 0) {
      console.warn('[canteen-fiado] inconsistency detected: fiado sales exist but no debtors are visible', {
        fiadoSales: fiadoSales.map((sale) => ({
          id: sale.id,
          memberId: sale.memberId ?? null,
          memberName: sale.memberName ?? null,
          total: sale.total,
          createdAt: sale.createdAt,
        })),
      });
    }
  }, [sales, membersWithDebt]);

  const selectedSale =
    filteredSales.find((sale) => sale.id === selectedSaleId) ??
    (sales ?? []).find((sale) => sale.id === selectedSaleId) ??
    null;

  const selectedMember = membersWithDebt.find((member) => member.id === selectedMemberId) ?? null;
  const shareReceiptSale =
    filteredSales.find((sale) => sale.id === shareReceiptSaleId) ??
    (sales ?? []).find((sale) => sale.id === shareReceiptSaleId) ??
    null;
  const shareDebtMember = membersWithDebt.find((member) => member.id === shareDebtMemberId) ?? null;

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-4 h-4 text-green-600" />;
      case "pix":
        return <Smartphone className="w-4 h-4 text-primary" />;
      case "credit":
        return <CreditCard className="w-4 h-4 text-sky-600" />;
      case "fiado":
        return <User className="w-4 h-4 text-amber-500" />;
      default:
        return <Receipt className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Dinheiro";
      case "pix":
        return "PIX";
      case "credit":
        return "Cartão";
      case "fiado":
        return "Fiado";
      default:
        return method;
    }
  };

  const handlePayDebt = async () => {
    if (!selectedMember) return;

    const amount = Number(paymentAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Valor inválido.");
      return;
    }

    if (amount > (selectedMember.creditBalance ?? 0)) {
      toast.error("Valor maior que a dívida.");
      return;
    }

    const nextBalance = Math.max(0, (selectedMember.creditBalance ?? 0) - amount);

    try {
      const payload = await registerMemberPayment<{ member: { creditBalance?: number } }>(selectedMember.id, amount);
      await db.members.update(selectedMember.id, {
        creditBalance: payload.member.creditBalance ?? nextBalance,
        updatedAt: new Date().toISOString(),
        _status: "synced",
      });
    } catch {
      await db.members.update(selectedMember.id, {
        creditBalance: nextBalance,
        updatedAt: new Date().toISOString(),
        _status: "pending",
      });

      await db.syncOutbox.add({
        module: "memberCredits",
        action: "update",
        data: { id: selectedMember.id, amount, memberName: selectedMember.name },
        timestamp: new Date().toISOString(),
      });
    }

    toast.success("Pagamento registrado!");
    setSelectedMemberId(null);
    setPaymentAmount("");
    if (ledgerMemberId === selectedMember.id) {
      void loadLedger(selectedMember.id);
    }
  };

  const loadLedger = async (memberId: string) => {
    setLedgerMemberId(memberId);
    setLedgerLoading(true);
    try {
      const payload = await getMemberLedger<MemberLedger>(memberId);
      setLedger(payload);
    } catch {
      toast.error("Erro ao carregar histórico do fiado.");
      setLedger(null);
      setLedgerMemberId(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleShareReceipt = () => {
    if (!shareReceiptSale) return;
    if (!receiptPhone.trim()) {
      toast.error("Informe o número.");
      return;
    }

    const lines = [
      `Comprovante - ${settings.appName}`,
      format(new Date(shareReceiptSale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      getPaymentLabel(shareReceiptSale.paymentMethod),
      shareReceiptSale.memberName || "",
      "",
      ...shareReceiptSale.items.map((item) => `${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}`),
      "",
      `Total: ${formatCurrency(shareReceiptSale.total)}`,
    ].filter(Boolean);

    sendWhatsApp(receiptPhone, lines.join("\n"));
    setShareReceiptSaleId(null);
    setReceiptPhone("");
  };

  const handleShareDebt = () => {
    if (!shareDebtMember) return;
    if (!debtPhone.trim()) {
      toast.error("Informe o número.");
      return;
    }

    const message = [
      `Lembrete de fiado - ${settings.appName}`,
      "",
      `Olá, ${shareDebtMember.name}.`,
      `Seu saldo pendente é ${formatCurrency(shareDebtMember.creditBalance ?? 0)}.`,
      "",
      "Por favor, entre em contato para regularizar.",
    ].join("\n");

    sendWhatsApp(debtPhone, message);
    setShareDebtMemberId(null);
    setDebtPhone("");
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="sales">
        <TabsList className="w-full">
          <TabsTrigger value="sales" className="flex-1">Vendas</TabsTrigger>
          <TabsTrigger value="credit" className="flex-1">
            Fiado {membersWithDebt.length > 0 ? <Badge variant="destructive" className="ml-2 text-[10px]">{membersWithDebt.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 justify-between flex-wrap">
            <div className="flex gap-3">
              <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-bold">{formatCurrency(todayTotal)}</p>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                </div>
              </div>
              <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{todaySales.length}</p>
                  <p className="text-xs text-muted-foreground">Transações</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportSalesPDF(sales ?? [], settings.appName)}>
                <FileText className="mr-1 h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportSalesExcel(sales ?? [])}>
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vendas..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedSaleId(sale.id)}
                className="w-full bg-card rounded-xl p-4 border border-border text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getPaymentIcon(sale.paymentMethod)}
                      <span className="font-medium text-sm">{getPaymentLabel(sale.paymentMethod)}</span>
                      {sale.memberName ? <Badge variant="outline" className="text-xs">{sale.memberName}</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sale.items.length} item(s) • {format(new Date(sale.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="font-bold text-primary">{formatCurrency(sale.total)}</span>
                </div>
              </button>
            ))}
            {filteredSales.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>Nenhuma venda encontrada</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="credit" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 justify-between flex-wrap">
            <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-amber-500">{formatCurrency(totalDebt)}</p>
                <p className="text-xs text-muted-foreground">Total Fiado</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportDebtPDF(members, settings.appName)}>
                <FileText className="mr-1 h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportDebtExcel(members)}>
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {membersWithDebt.map((member) => (
              <div key={member.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.phone || member.email || "Sem contato"}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-amber-500">{formatCurrency(member.creditBalance ?? 0)}</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShareDebtMemberId(member.id);
                          setDebtPhone(member.phone || "");
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setPaymentAmount(String(member.creditBalance ?? 0));
                        }}
                      >
                        Receber
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void loadLedger(member.id)}>
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {membersWithDebt.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>Nenhum fiado pendente</p>
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedSale)} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da Venda</DialogTitle></DialogHeader>
          {selectedSale ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data</span>
                <span>{format(new Date(selectedSale.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pagamento</span>
                <div className="flex items-center gap-2">{getPaymentIcon(selectedSale.paymentMethod)} {getPaymentLabel(selectedSale.paymentMethod)}</div>
              </div>
              {selectedSale.memberName ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span><span>{selectedSale.memberName}</span>
                </div>
              ) : null}
              <div className="border-t border-border pt-4 space-y-2">
                {selectedSale.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span><span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 flex items-center justify-between font-bold">
                <span>Total</span><span className="text-primary">{formatCurrency(selectedSale.total)}</span>
              </div>
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => {
                  setShareReceiptSaleId(selectedSale.id);
                  setReceiptPhone(
                    members.find((member) => member.id === selectedSale.memberId)?.phone ||
                      ""
                  );
                }}
              >
                <MessageSquare className="h-4 w-4" /> Enviar via WhatsApp
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => !open && setSelectedMemberId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receber Pagamento</DialogTitle></DialogHeader>
          {selectedMember ? (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedMember.name}</p>
                <p className="text-sm text-muted-foreground">Dívida: {formatCurrency(selectedMember.creditBalance ?? 0)}</p>
              </div>
              <div className="space-y-2">
                <Label>Valor do Pagamento</Label>
                <Input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0,00" />
              </div>
              <Button onClick={handlePayDebt} className="w-full">Confirmar Pagamento</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(shareReceiptSale)} onOpenChange={(open) => !open && setShareReceiptSaleId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Enviar Comprovante</DialogTitle></DialogHeader>
          {shareReceiptSale ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enviar comprovante de {formatCurrency(shareReceiptSale.total)} via WhatsApp.
              </p>
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input value={receiptPhone} onChange={(event) => setReceiptPhone(event.target.value)} placeholder="(11) 99999-9999" type="tel" />
              </div>
              <Button className="w-full gap-2" onClick={handleShareReceipt}>
                <MessageSquare className="h-4 w-4" /> Enviar Comprovante
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(shareDebtMember)} onOpenChange={(open) => !open && setShareDebtMemberId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cobrar via WhatsApp</DialogTitle></DialogHeader>
          {shareDebtMember ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enviar lembrete para <strong>{shareDebtMember.name}</strong> ({formatCurrency(shareDebtMember.creditBalance ?? 0)}).
              </p>
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input value={debtPhone} onChange={(event) => setDebtPhone(event.target.value)} placeholder="(11) 99999-9999" type="tel" />
              </div>
              <Button className="w-full gap-2" onClick={handleShareDebt}>
                <MessageSquare className="h-4 w-4" /> Enviar Cobrança
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(ledgerMemberId)}
        onOpenChange={(open) => {
          if (!open) {
            setLedgerMemberId(null);
            setLedger(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico do Fiado</DialogTitle>
          </DialogHeader>
          {ledgerLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando histórico...</div>
          ) : ledger ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">{ledger.member.name}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Débitos</p>
                    <p className="font-bold text-amber-500">{formatCurrency(ledger.summary.debits)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pagamentos</p>
                    <p className="font-bold text-green-600">{formatCurrency(ledger.summary.payments)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo</p>
                    <p className="font-bold text-primary">{formatCurrency(ledger.summary.balance)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ledger.entries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.type === "debit" ? "destructive" : "secondary"}>
                            {entry.type === "debit" ? "Débito" : "Pagamento"}
                          </Badge>
                          {entry.saleId ? <Badge variant="outline">Venda</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm font-medium">
                          {entry.notes || (entry.type === "debit" ? "Venda em fiado" : "Pagamento")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {entry.createdBy ? ` • ${entry.createdBy}` : ""}
                        </p>
                      </div>
                      <p className={entry.type === "debit" ? "font-bold text-amber-500" : "font-bold text-green-600"}>
                        {entry.type === "debit" ? "+" : "-"}
                        {formatCurrency(entry.amount)}
                      </p>
                    </div>
                  </div>
                ))}

                {ledger.entries.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma movimentação registrada.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Histórico indisponível.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
