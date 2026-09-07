'use client';

import { useState } from 'react';
import { ProductForm } from '@/components/forms/ProductForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { db, type LocalProduct } from '@/lib/db';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

export function ProductsManager() {
  const products = useProducts();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LocalProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.category.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleAvailableToday = async (productId: string, availableToday: boolean) => {
    setSavingId(productId);

    try {
      const response = await fetch(`/api/canteen/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableToday }),
      });

      if (!response.ok) throw new Error();

      await db.products.update(productId, {
        availableToday,
        updatedAt: new Date().toISOString(),
        _status: 'synced',
      });

      toast.success(availableToday ? 'Disponível hoje' : 'Indisponível hoje');
    } catch {
      await db.products.update(productId, {
        availableToday,
        updatedAt: new Date().toISOString(),
        _status: 'pending',
      });
      await db.syncOutbox.add({
        module: 'products',
        action: 'update',
        data: { id: productId, availableToday },
        timestamp: new Date().toISOString(),
      });
      toast.success('Alteração salva localmente e pendente de sincronização.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/canteen/products/${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      await db.products.update(deleteId, {
        deletedAt: new Date().toISOString(),
        _status: 'synced',
      });

      toast.success('Produto excluído!');
      setDeleteId(null);
    } catch {
      await db.products.update(deleteId, {
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _status: 'pending',
      });
      await db.syncOutbox.add({
        module: 'products',
        action: 'delete',
        data: { id: deleteId },
        timestamp: new Date().toISOString(),
      });
      toast.success('Exclusão salva localmente e pendente de sincronização.');
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 justify-between sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <Drawer
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setSelectedProduct(null);
            }}
          >
            <DrawerTrigger asChild>
              <Button onClick={() => setSelectedProduct(null)}>
                <Plus className="mr-2 h-4 w-4" /> Novo
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[90vh]">
              <DrawerHeader>
                <DrawerTitle>{selectedProduct ? 'Editar Produto' : 'Cadastrar Produto'}</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-6">
              <ProductForm
                product={selectedProduct ?? undefined}
                onSuccess={() => {
                  setDialogOpen(false);
                  setSelectedProduct(null);
                }}
              />
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start justify-between">
                <div className="flex flex-1 gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                    )}
                  </div>
                  <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.active === false ? <Badge variant="secondary">Inativo</Badge> : null}
                    {(product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0) ? <Badge variant="destructive">Baixo</Badge> : null}
                    {product.availableToday === false ? (
                      <Badge variant="outline" className="text-muted-foreground">Indisponível hoje</Badge>
                    ) : null}
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">{product.description || 'Sem descrição'}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                    <span className="text-muted-foreground">Custo: {formatCurrency(product.cost ?? 0)}</span>
                    <span className={cn('font-medium', (product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0) ? 'text-destructive' : 'text-foreground')}>
                      Est: {product.stock}
                    </span>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  </div>
                </div>
                <div className="ml-2 flex items-center gap-1">
                  <Label className="mr-1 text-[10px] text-muted-foreground">Hoje</Label>
                  <Switch
                    checked={product.availableToday !== false}
                    onCheckedChange={(checked) => toggleAvailableToday(product.id, checked)}
                    disabled={savingId === product.id}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedProduct(product);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(product.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
