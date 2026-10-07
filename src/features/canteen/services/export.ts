/**
 * features/canteen/services/export.ts
 * 
 * Utilitários para exportação de relatórios (PDF e CSV compatível com Excel) e ações de cobrança (WhatsApp).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

function getConsumerLabel(sale: { consumerType?: string; memberName?: string | null }) {
  if (sale.consumerType === 'VISITOR') return 'Visitante';
  if (sale.consumerType === 'UNIDENTIFIED') return 'Não identificado';
  return sale.memberName || 'Membro não informado';
}

function getStatusLabel(status?: string | null) {
  if (status === 'pending') return 'Pendente';
  if (status === 'preparing') return 'Em preparo';
  if (status === 'ready') return 'Pronto';
  if (status === 'cancelled') return 'Cancelado';
  return 'Concluído';
}

function escapeCsvCell(value: unknown) {
  const raw = value == null ? '' : String(value);
  // Excel pode executar valores textuais iniciados por =, +, - ou @ como
  // fórmulas. O apóstrofo mantém o conteúdo visível sem permitir execução.
  const text = typeof value === 'string' && /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  if (typeof window === 'undefined') return;
  const content = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
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
  
  autoTable(doc, {
    head: [['Data', 'Consumidor', 'Pagamento', 'Status', 'Itens', 'Total']],
    body: sales.map(s => [
        format(new Date(s.createdAt), "dd/MM"),
        getConsumerLabel(s),
        s.paymentMethod,
        getStatusLabel(s.orderStatus),
        s.items.map((i: any) => i.name).join(', '),
        formatMoney(s.total)
    ]),
    startY: 20
  });

  doc.save(`vendas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

/**
 * Exporta histórico de vendas em CSV compatível com Excel e LibreOffice.
 * 
 * @param {any[]} sales - Array de vendas.
 */
export function exportSalesExcel(sales: any[]) {
  downloadCsv(
    `vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`,
    ['Data', 'Pagamento', 'Consumidor', 'Status', 'Itens', 'Total'],
    sales.map((sale) => [
      format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm'),
      sale.paymentMethod,
      getConsumerLabel(sale),
      getStatusLabel(sale.orderStatus),
      sale.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', '),
      sale.total,
    ]),
  );
}

export function exportDebtPDF(members: any[], appName: string = "Mesa App") {
  const debtors = members.filter((member) => (member.creditBalance ?? 0) > 0);
  const doc = new jsPDF();
  doc.text(`${appName} - Relatório de Fiado`, 14, 15);

  autoTable(doc, {
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
  downloadCsv(
    `fiado_${format(new Date(), 'yyyy-MM-dd')}.csv`,
    ['Membro', 'Contato', 'Saldo'],
    members
      .filter((member) => (member.creditBalance ?? 0) > 0)
      .map((member) => [member.name, member.phone || member.email || '', member.creditBalance ?? 0]),
  );
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
  // Não abrir uma aba `_blank`: em PWA/mobile isso cria uma página intermediária
  // branca com o botão "X" ao retornar do WhatsApp. A navegação na própria
  // janela entrega o link ao aplicativo instalado e preserva o histórico para
  // voltar ao Church App.
  window.location.assign(url);
}
