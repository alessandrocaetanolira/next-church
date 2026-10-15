'use client';

import type { ReactNode } from 'react';
import { Package } from 'lucide-react';
import { AppImage } from '@/components/shared/AppImage';
import type { LocalProduct } from '@/lib/db';
import { cn, formatCurrency } from '@/lib/utils';
import { badgeVariants } from '@/components/ui/badge';
import { isRecommendedProduct } from '@/lib/canteen/product-recommendation';

type ProductCardProps = {
  product: LocalProduct;
  quantity?: number;
  onViewDetails: () => void;
  actions?: ReactNode;
};

/** Apresentação compartilhada do catálogo; consultar o produto não altera o carrinho. */
export function ProductCard({ product, quantity = 0, onViewDetails, actions }: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && (product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0);
  const formattedPrice = formatCurrency(product.price);
  const [priceInteger, priceCents] = formattedPrice.split(',');

  return (
    <article className={cn(
      'flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground',
      quantity > 0 ? 'border-primary/40' : 'border-border/60',
    )}>
      <button
        type="button"
        aria-label={`Ver detalhes de ${product.name}`}
        onClick={onViewDetails}
        className="group min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="relative block aspect-[16/10] overflow-hidden bg-muted/40">
          {product.imageUrl ? (
            <AppImage src={product.imageUrl} alt="" width={480} height={300} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground/60"><Package className="h-10 w-10" aria-hidden="true" /></span>
          )}
          <span className="absolute inset-x-2 top-2 flex min-w-0 items-start justify-end gap-1">
            {quantity > 0 ? <span aria-label={`${quantity} na sacola`} className="mr-auto shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">{quantity}×</span> : null}
            <span className={cn(badgeVariants({ variant: 'secondary' }), 'min-w-0 max-w-[75%] truncate bg-background/95 px-2 py-1 text-[10px] font-medium leading-none text-foreground shadow-sm backdrop-blur-sm')}>{product.category}</span>
          </span>
          {isRecommendedProduct(product) ? <span className={cn(badgeVariants({ variant: 'warning' }), 'absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate px-2 text-[10px]')}>Recomendado</span> : null}
        </span>
        <span className="flex min-w-0 flex-col gap-1 px-3 pb-2 pt-2.5">
          <span className="line-clamp-2 text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{product.name}</span>
          {product.description ? <span className="line-clamp-2 text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">{product.description}</span> : null}
        </span>
      </button>
      <div className="mt-auto space-y-2 px-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-left font-bold leading-tight tabular-nums [overflow-wrap:anywhere]">
            <span className="sr-only">{formattedPrice}</span>
            <span aria-hidden="true" className="text-xl">{priceInteger}</span>{priceCents !== undefined ? <span aria-hidden="true" className="text-xs">,{priceCents}</span> : null}
          </p>
          <p className={cn('shrink-0 text-right text-[11px] tabular-nums text-muted-foreground', outOfStock && 'font-medium text-destructive')}>
            <span className="sr-only">{outOfStock ? 'Sem estoque' : lowStock ? `Estoque baixo: ${product.stock} unidades` : `${product.stock} unidades em estoque`}</span>
            <span aria-hidden="true">{product.stock} un.</span>
          </p>
        </div>
        {actions}
      </div>
    </article>
  );
}
