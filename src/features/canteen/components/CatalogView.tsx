'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { formatCurrency } from '@/lib/utils';

export function CatalogView() {
  const products = useProducts().filter((product) => product.active !== false && product.availableToday !== false);

  if (products.length === 0) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum produto disponível no momento.</CardContent></Card>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{product.name}</h3>
              <Badge variant="outline">{product.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{product.description || 'Produto da cantina'}</p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
              <span className="text-xs text-muted-foreground">Disponível</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
