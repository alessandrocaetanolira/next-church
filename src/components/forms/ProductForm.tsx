'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { db, type LocalProduct } from '@/lib/db';
import { generateId } from '@/lib/id';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createCanteenProduct, updateCanteenProduct } from '@/services/canteen/products-api';
import { productFormSchema, type ProductFormValues } from './product-form.schema';
import { ProductFormUI } from './ProductFormUI';

export interface ProductFormProduct {
  id: string; name: string; description?: string | null; imageUrl?: string | null; price: number; cost?: number | null;
  stock: number; minStock?: number | null; category: string; active?: boolean; availableToday?: boolean;
}

export function ProductForm({ onSuccess, product }: { onSuccess: () => void; product?: ProductFormProduct }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const products = useLiveQuery<LocalProduct[]>(() => tenantId ? db.products.filter((item) => item.tenantId === tenantId).toArray() : Promise.resolve([]), [tenantId]) ?? [];
  const categories = Array.from(new Set(products.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>(product?.category && categories.includes(product.category) ? 'existing' : 'new');
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: product?.name ?? '', description: product?.description ?? '', imageUrl: product?.imageUrl ?? '', price: product?.price ?? 0, cost: product?.cost ?? 0, stock: product?.stock ?? 0, minStock: product?.minStock ?? 0, category: product?.category ?? '', active: product?.active ?? true, availableToday: product?.availableToday ?? true },
  });

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem válida.'); return; }
    const reader = new FileReader();
    reader.onload = () => form.setValue('imageUrl', typeof reader.result === 'string' ? reader.result : '', { shouldValidate: true });
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: ProductFormValues) => {
    const payload = { id: product?.id ?? generateId(), tenantId, ...values, imageUrl: values.imageUrl || null };
    try {
      const savedProduct = product ? await updateCanteenProduct<LocalProduct>(product.id, payload) : await createCanteenProduct<LocalProduct>(payload);
      await db.products.put({ ...savedProduct, tenantId, active: savedProduct.active ?? true, availableToday: savedProduct.availableToday ?? true, cost: savedProduct.cost ?? 0, imageUrl: savedProduct.imageUrl ?? null, minStock: savedProduct.minStock ?? 0, deletedAt: savedProduct.deletedAt ?? null, _status: 'synced' });
      toast.success(product ? 'Produto atualizado!' : 'Produto cadastrado!'); onSuccess();
    } catch {
      await db.products.put({ ...payload, tenantId, createdAt: product?.id ? (products.find((item) => item.id === product.id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, _status: 'pending' });
      await db.syncOutbox.add({ module: 'products', action: product ? 'update' : 'create', data: payload, timestamp: new Date().toISOString() });
      toast.success(product ? 'Produto salvo localmente e pendente de sincronização.' : 'Produto criado localmente e pendente de sincronização.'); onSuccess();
    }
  };

  return <ProductFormUI form={form} editing={Boolean(product)} categories={categories} categoryMode={categoryMode} setCategoryMode={setCategoryMode} onImageChange={onImageChange} onSubmit={onSubmit} />;
}
