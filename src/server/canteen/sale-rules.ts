import { ConflictError, ValidationError } from '@/lib/http/errors';

export type SaleProduct = {
  id: string; name: string; price: number; stock: number;
  active: boolean; availableToday: boolean; deletedAt: Date | null;
};
export type ValidatedSaleItem = { productId: string; name: string; quantity: number; price: number };

function cents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ValidationError('Valor monetário inválido.');
  const result = Math.round(value * 100);
  if (!Number.isSafeInteger(result) || Math.abs(value * 100 - result) > 0.000001) {
    throw new ValidationError('Valores monetários devem ter no máximo duas casas decimais.');
  }
  return result;
}

/** Normaliza e soma quantidades repetidas antes da consulta de estoque; nenhum item avulso sem produto é aceito. */
export function normalizeSaleItems(input: unknown): ValidatedSaleItem[] {
  if (!Array.isArray(input) || !input.length) throw new ValidationError('Informe os produtos do pedido.');
  const items = new Map<string, ValidatedSaleItem>();
  for (const entry of input) {
    const item = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    if (!productId) throw new ValidationError('Cada item deve identificar um produto cadastrado.');
    if (typeof item.quantity !== 'number' || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new ValidationError('Quantidade de produto inválida.');
    }
    const price = cents(item.price) / 100;
    const previous = items.get(productId);
    if (previous && previous.price !== price) throw new ConflictError('O mesmo produto possui preços divergentes no carrinho.');
    const quantity = (previous?.quantity ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity)) throw new ValidationError('Quantidade de produto inválida.');
    items.set(productId, { productId, quantity, price, name: typeof item.name === 'string' ? item.name : productId });
  }
  return [...items.values()];
}

/** Regras únicas para pedido pendente, venda e aprovação; preço/nome vêm do catálogo oficial do tenant. */
export function validateSaleProducts(input: unknown, submittedTotal: number, products: SaleProduct[]) {
  const items = normalizeSaleItems(input);
  const catalog = new Map(products.map((product) => [product.id, product]));
  let totalCents = 0;
  const validatedItems = items.map((item) => {
    const product = catalog.get(item.productId);
    if (!product || product.deletedAt) throw new ConflictError('Um produto do carrinho não está mais disponível. Atualize o carrinho.');
    if (!product.active || !product.availableToday) throw new ConflictError(`${product.name} não está disponível para pedidos.`);
    if (product.stock < item.quantity) throw new ConflictError(`Estoque insuficiente para ${product.name}.`);
    const priceCents = cents(product.price);
    if (cents(item.price) !== priceCents) throw new ConflictError(`O preço de ${product.name} mudou. Revise o carrinho.`);
    totalCents += priceCents * item.quantity;
    if (!Number.isSafeInteger(totalCents)) throw new ValidationError('Total do pedido inválido.');
    return { ...item, name: product.name, price: priceCents / 100 };
  });
  if (cents(submittedTotal) !== totalCents) throw new ConflictError('O total do pedido diverge dos produtos. Revise o carrinho.');
  return { items: validatedItems, total: totalCents / 100 };
}

export function assertSalePaymentMethod(paymentMethod: string, allowPending = true) {
  if (!['cash', 'pix', 'credit', 'fiado', ...(allowPending ? ['pending'] : [])].includes(paymentMethod)) {
    throw new ValidationError('Forma de pagamento inválida.');
  }
}
