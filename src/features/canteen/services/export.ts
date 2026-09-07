/**
 * features/canteen/services/export.ts
 * 
 * Utilitários para exportação de relatórios (PDF e Excel) e ações de cobrança (WhatsApp).
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

/**
 * Exporta histórico de vendas para PDF usando autotable.
 * 
 * @param {any[]} sales - Array de vendas.
 * @param {string} appName - Nome do aplicativo (default: Mesa App).
 */
export function exportSalesPDF(sales: any[], appName: string = "Mesa App") {
  const doc = new jsPDF();
  doc.text(`${appName} - Relatório de Vendas`, 14, 15);
  
  (doc as any).autoTable({
    head: [['Data', 'Itens', 'Total']],
    body: sales.map(s => [
        format(new Date(s.createdAt), "dd/MM"),
        s.items.map((i: any) => i.name).join(', '),
        formatMoney(s.total)
    ]),
    startY: 20
  });

  doc.save(`vendas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

/**
 * Exporta histórico de vendas para Excel.
 * 
 * @param {any[]} sales - Array de vendas.
 */
export function exportSalesExcel(sales: any[]) {
  const rows = sales.map((sale) => ({
    data: format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm'),
    pagamento: sale.paymentMethod,
    membro: sale.memberName ?? '',
    itens: sale.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', '),
    total: sale.total,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendas");
  XLSX.writeFile(wb, `vendas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function exportDebtPDF(members: any[], appName: string = "Mesa App") {
  const debtors = members.filter((member) => (member.creditBalance ?? 0) > 0);
  const doc = new jsPDF();
  doc.text(`${appName} - Relatório de Fiado`, 14, 15);

  (doc as any).autoTable({
    head: [['Membro', 'Contato', 'Saldo']],
    body: debtors.map((member) => [
      member.name,
      member.phone || member.email || 'Sem contato',
      formatMoney(member.creditBalance ?? 0),
    ]),
    startY: 20,
  });

  doc.save(`fiado_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportDebtExcel(members: any[]) {
  const rows = members
    .filter((member) => (member.creditBalance ?? 0) > 0)
    .map((member) => ({
      membro: member.name,
      contato: member.phone || member.email || '',
      saldo: member.creditBalance ?? 0,
    }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fiado');
  XLSX.writeFile(wb, `fiado_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

/**
 * Envia lembrete de cobrança via WhatsApp.
 * 
 * @param {string} phone - Telefone do membro.
 * @param {string} message - Mensagem a ser enviada.
 */
export function sendWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
