'use client';

import { Package, Pencil, Trash2 } from 'lucide-react';
import { AppImage } from '@/components/shared/AppImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { LocalProduct } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { isRecommendedProduct } from '@/lib/canteen/product-recommendation';

type ProductManagementCardProps = {
  product: LocalProduct;
  canUpdate: boolean;
  canDelete: boolean;
  saving: boolean;
  onViewDetails: () => void;
  onToggleAvailable: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Separa identificação, valores e ações para não comprimir o conteúdo no mobile. */
export function ProductManagementCard({ product, canUpdate, canDelete, saving, onViewDetails, onToggleAvailable, onEdit, onDelete }: ProductManagementCardProps) {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground">
      <button type="button" aria-label={`Ver detalhes de ${product.name}`} onClick={onViewDetails} className="flex w-full min-w-0 gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <span className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted/40">
          {product.imageUrl ? <AppImage src={product.imageUrl} alt="" width={160} height={160} loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-7 w-7" aria-hidden="true" /></span>}
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block truncate text-xs text-muted-foreground">{product.category}</span>
          <span className="block text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{product.name}</span>
          {product.description ? <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{product.description}</span> : null}
          <span className="block text-xs text-muted-foreground underline decoration-border underline-offset-4">Ver detalhes</span>
        </span>
      </button>
      {isRecommendedProduct(product) || product.active === false || product.stock <= 0 || ((product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0)) || product.availableToday === false ? (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {isRecommendedProduct(product) ? <Badge variant="warning">Recomendado</Badge> : null}
          {product.active === false ? <Badge variant="secondary">Inativo</Badge> : null}
          {product.stock <= 0 ? <Badge variant="secondary">Sem estoque</Badge> : (product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0) ? <Badge variant="warning">Estoque baixo</Badge> : null}
          {product.availableToday === false ? <Badge variant="outline">Indisponível hoje</Badge> : null}
        </div>
      ) : null}
      <dl className="grid min-w-0 grid-cols-3 gap-2 border-t border-border/50 px-3 py-3">
        <div className="min-w-0"><dt className="text-xs text-muted-foreground">Venda</dt><dd className="mt-1 text-base font-bold tabular-nums [overflow-wrap:anywhere]">{formatCurrency(product.price)}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-muted-foreground">Custo</dt><dd className="mt-1 text-sm font-medium tabular-nums [overflow-wrap:anywhere]">{formatCurrency(product.cost ?? 0)}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-muted-foreground">Estoque</dt><dd className="mt-1 text-sm font-medium tabular-nums [overflow-wrap:anywhere]">{product.stock} un.</dd></div>
      </dl>
      {canUpdate || canDelete ? <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-3 py-2">
        {canUpdate ? <div className="flex min-h-11 items-center gap-2"><Switch id={`available-${product.id}`} checked={product.availableToday !== false} onCheckedChange={onToggleAvailable} disabled={saving} aria-label={`Disponível hoje: ${product.name}`} /><Label htmlFor={`available-${product.id}`} className="text-xs text-muted-foreground">Disponível hoje</Label></div> : null}
        <div className="ml-auto flex items-center gap-1">
          {canUpdate ? <Button type="button" size="icon" variant="ghost" className="h-11 w-11" aria-label={`Editar ${product.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button> : null}
          {canDelete ? <Button type="button" size="icon" variant="ghost" className="h-11 w-11 text-destructive" aria-label={`Excluir ${product.name}`} onClick={onDelete}><Trash2 className="h-4 w-4" /></Button> : null}
        </div>
      </div> : null}
    </article>
  );
}
