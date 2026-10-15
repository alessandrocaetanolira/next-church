'use client';

import { Package } from 'lucide-react';
import { AppImage } from '@/components/shared/AppImage';
import { Button } from '@/components/ui/button';
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { formatCurrency } from '@/lib/utils';
import { useCanteenCartOwner } from '../hooks/use-canteen-cart-owner';
import { useProductDetails } from '../hooks/use-product-details';
import { ProductPurchaseActions } from './ProductPurchaseActions';
import { Badge } from '@/components/ui/badge';
import { isRecommendedProduct, PRODUCT_RECOMMENDATION_DAYS } from '@/lib/canteen/product-recommendation';

/** Usa o drawer padrão e lê carrinho/produto reativamente, sem capturar estado antigo da lista. */
export function ProductDetailsDrawer({ productId, allowPurchase = true }: { productId: string; allowPurchase?: boolean }) {
  const { product, loading } = useProductDetails(productId);
  const cartReady = useCanteenCartOwner();
  const { closeDrawer } = useDrawer();

  if (!product) {
    return <DrawerHeader><DrawerTitle>{loading ? 'Carregando produto…' : 'Produto não disponível'}</DrawerTitle><DrawerDescription>{loading ? 'Buscando os detalhes do produto.' : 'Este produto não está mais disponível para consulta.'}</DrawerDescription></DrawerHeader>;
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <DrawerHeader className="text-left">
        <p className="text-xs text-muted-foreground">{product.category}</p>
        <DrawerTitle className="leading-snug [overflow-wrap:anywhere]">{product.name}</DrawerTitle>
        <DrawerDescription>Detalhes do produto</DrawerDescription>
      </DrawerHeader>
      <div className="space-y-4 px-4 pb-4">
        {isRecommendedProduct(product) ? <div className="space-y-1.5"><Badge variant="warning">Recomendado</Badge><p className="text-xs leading-relaxed text-muted-foreground">Entre os produtos disponíveis, é um dos mais vendidos nos últimos {PRODUCT_RECOMMENDATION_DAYS} dias, conforme a última atualização.</p></div> : null}
        {product.imageUrl ? <div className="overflow-hidden rounded-xl bg-muted/40"><AppImage src={product.imageUrl} alt={product.name} width={640} height={480} className="max-h-60 w-full object-contain" /></div> : null}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Descrição</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{product.description?.trim() || 'Este produto ainda não possui descrição.'}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(product.price)}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Package className="h-4 w-4" aria-hidden="true" />{product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}</p>
        </div>
        {allowPurchase ? <ProductPurchaseActions product={product} cartReady={cartReady} /> : null}
        <Button type="button" variant="ghost" className="h-11 w-full" onClick={closeDrawer}>Voltar aos produtos</Button>
      </div>
    </div>
  );
}
