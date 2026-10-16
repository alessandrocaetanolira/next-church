'use client';

import { enqueueSyncChange } from '@/features/sync/services/enqueue-sync-change';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { db } from '@/lib/db';
import { Package, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasActionPermission } from '@/lib/access-control';
import { deleteCanteenProduct, updateCanteenProduct } from '@/services/canteen/products-api';
import { ProductsWebTable } from '@/features/canteen/components/ProductsWebTable';
import { ProductManagementCard } from './ProductManagementCard';
import { ProductDetailsDrawer } from './ProductDetailsDrawer';

export function ProductsManager() {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const canManageProducts = hasActionPermission(user, 'canteen', 'manage_products');
  const canCreate = canManageProducts;
  const canUpdate = canManageProducts;
  const canDelete = canManageProducts;
  const products = useProducts();
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.category.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleAvailableToday = async (productId: string, availableToday: boolean) => {
    setSavingId(productId);

    try {
      await updateCanteenProduct(productId, { availableToday });

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
      await enqueueSyncChange({
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
      await deleteCanteenProduct(deleteId);

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
      await enqueueSyncChange({
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

          {canCreate ? <Button onClick={() => router.push('/cantina/products/new')}>
                <Plus className="mr-2 h-4 w-4" /> Novo
              </Button> : null}
        </div>

        <div className="hidden md:block">
          <ProductsWebTable products={filteredProducts} canUpdate={canUpdate} canDelete={canDelete} savingId={savingId} onToggleAvailable={(productId, value) => void toggleAvailableToday(productId, value)} onEdit={(productId) => router.push(`/cantina/products/${productId}/edit`)} onDelete={setDeleteId} />
        </div>
        <div className="space-y-3 md:hidden">
          {filteredProducts.map((product) => (
            <ProductManagementCard
              key={product.id}
              product={product}
              canUpdate={canUpdate}
              canDelete={canDelete}
              saving={savingId === product.id}
              onViewDetails={() => openDrawer({ content: <ProductDetailsDrawer productId={product.id} allowPurchase={false} />, repositionInputs: false })}
              onToggleAvailable={(value) => void toggleAvailableToday(product.id, value)}
              onEdit={() => router.push(`/cantina/products/${product.id}/edit`)}
              onDelete={() => setDeleteId(product.id)}
            />
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
