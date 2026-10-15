'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { ProductCard } from './ProductCard';
import { ProductDetailsDrawer } from './ProductDetailsDrawer';

export function CatalogView() {
  const { openDrawer } = useDrawer();
  const products = useProducts().filter((product) => product.active !== false && product.availableToday !== false);

  if (products.length === 0) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum produto disponível no momento.</CardContent></Card>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onViewDetails={() => openDrawer({ content: <ProductDetailsDrawer productId={product.id} allowPurchase={false} />, repositionInputs: false })} />
      ))}
    </div>
  );
}
