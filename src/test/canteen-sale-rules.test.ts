import { describe, expect, it } from 'vitest';
import { normalizeSaleItems, validateSaleProducts, type SaleProduct } from '@/server/canteen/sale-rules';

const product: SaleProduct = { id: 'product-a', name: 'Lanche oficial', price: 12.5, stock: 3, active: true, availableToday: true, deletedAt: null };
const item = { productId: product.id, name: 'Nome enviado', price: 12.5, quantity: 1 };

describe('validação oficial de produtos e valores da Cantina', () => {
  it('usa nome/preço oficial, consolida quantidades e soma em centavos', () => {
    expect(validateSaleProducts([item, { ...item, quantity: 2 }], 37.5, [product])).toEqual({
      items: [{ ...item, name: product.name, quantity: 3 }], total: 37.5,
    });
    const tenCents = { ...product, price: 0.1, stock: 10 };
    expect(validateSaleProducts([{ ...item, price: 0.1, quantity: 3 }], 0.3, [tenCents]).total).toBe(0.3);
  });

  it.each([
    { label: 'inexistente ou de outro tenant', products: [] },
    { label: 'removido', products: [{ ...product, deletedAt: new Date() }] },
    { label: 'inativo', products: [{ ...product, active: false }] },
    { label: 'indisponível hoje', products: [{ ...product, availableToday: false }] },
    { label: 'esgotado', products: [{ ...product, stock: 0 }] },
  ])('recusa produto $label antes de criar pedido', ({ products }) => {
    expect(() => validateSaleProducts([item], 12.5, products)).toThrow();
  });

  it('não deixa linhas repetidas contornarem o estoque disponível', () => {
    expect(() => validateSaleProducts([{ ...item, quantity: 2 }, { ...item, quantity: 2 }], 50, [product])).toThrow('Estoque insuficiente');
  });

  it('não confia em preço ou total informados pelo comprador', () => {
    expect(() => validateSaleProducts([{ ...item, price: 1 }], 1, [product])).toThrow('preço');
    expect(() => validateSaleProducts([item], 0, [product])).toThrow('total');
    expect(() => normalizeSaleItems([item, { ...item, price: 1 }])).toThrow('preços divergentes');
  });

  it.each([
    [], [{ ...item, productId: undefined }], [{ ...item, productId: ' ' }],
    [{ ...item, quantity: -1 }], [{ ...item, quantity: 0 }], [{ ...item, quantity: 1.5 }],
    [{ ...item, quantity: Number.MAX_SAFE_INTEGER + 1 }], [{ ...item, price: -1 }],
    [{ ...item, price: NaN }], [{ ...item, price: 12.501 }],
  ].map((items) => ({ items })))('rejeita formato de item inválido: $items', ({ items }) => {
    expect(() => normalizeSaleItems(items)).toThrow();
  });
});
