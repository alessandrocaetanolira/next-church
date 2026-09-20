'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { db, type LocalProduct } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateId } from '@/lib/id';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ProductFormProps {
  onSuccess: () => void;
  product?: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    price: number;
    cost?: number | null;
    stock: number;
    minStock?: number | null;
    category: string;
    active?: boolean;
    availableToday?: boolean;
  };
}

export function ProductForm({ onSuccess, product }: ProductFormProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const products = useLiveQuery<LocalProduct[]>(
    () => tenantId
      ? db.products.filter((item) => item.tenantId === tenantId).toArray()
      : Promise.resolve([] as LocalProduct[]),
    [tenantId],
  ) ?? [];
  const categoryOptions = Array.from(new Set(products.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const existingCategory = product?.category && categoryOptions.includes(product.category) ? product.category : '';
  const [formData, setFormData] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
    price: product?.price ?? 0,
    cost: product?.cost ?? 0,
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    category: product?.category ?? '',
    active: product?.active ?? true,
    availableToday: product?.availableToday ?? true,
  });
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>(
    existingCategory || categoryOptions.length === 0 ? 'existing' : 'new'
  );

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData((current) => ({ ...current, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: product?.id ?? generateId(),
      tenantId,
      name: formData.name,
      description: formData.description,
      imageUrl: formData.imageUrl || null,
      price: parseFloat(formData.price.toString()),
      cost: parseFloat(formData.cost.toString()),
      stock: parseInt(formData.stock.toString()),
      minStock: parseInt(formData.minStock.toString()),
      category: formData.category,
      active: formData.active,
      availableToday: formData.availableToday,
    };

    try {
      const res = await fetch(product ? `/api/canteen/products/${product.id}` : '/api/canteen/products', {
        method: product ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error();

      const savedProduct = await res.json();
      await db.products.put({
        ...savedProduct,
        tenantId,
        active: savedProduct.active ?? true,
        availableToday: savedProduct.availableToday ?? true,
        cost: savedProduct.cost ?? 0,
        imageUrl: savedProduct.imageUrl ?? null,
        minStock: savedProduct.minStock ?? 0,
        deletedAt: savedProduct.deletedAt ?? null,
        _status: 'synced',
      });
      toast.success(product ? 'Produto atualizado!' : 'Produto cadastrado!');
      onSuccess();
    } catch {
      await db.products.put({
        ...payload,
        tenantId,
        createdAt: product?.id ? (products.find((item) => item.id === product.id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        _status: 'pending',
      });
      await db.syncOutbox.add({
        module: 'products',
        action: product ? 'update' : 'create',
        data: payload,
        timestamp: new Date().toISOString(),
      });
      toast.success(product ? 'Produto salvo localmente e pendente de sincronização.' : 'Produto criado localmente e pendente de sincronização.');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do Produto</Label>
        <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Imagem do Produto</Label>
        <div className="space-y-3 rounded-lg border p-3">
          {formData.imageUrl ? (
            <div className="relative overflow-hidden rounded-lg border bg-muted/20">
              <img src={formData.imageUrl} alt={formData.name || 'Preview do produto'} className="h-40 w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={() => setFormData({ ...formData, imageUrl: '' })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/30">
              <ImagePlus className="h-4 w-4" />
              <span>Carregar imagem</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
          {formData.imageUrl ? (
            <label className="inline-flex cursor-pointer items-center text-sm text-primary hover:underline">
              Trocar imagem
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço (R$)</Label>
          <Input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
        </div>
        <div className="space-y-2">
          <Label>Custo (R$)</Label>
          <Input type="number" step="0.01" required value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estoque Inicial</Label>
          <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
        </div>
        <div className="space-y-2">
          <Label>Estoque Mínimo</Label>
          <Input type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="space-y-2">
          <Select
            value={categoryMode === 'new' ? '__new__' : (formData.category || undefined)}
            onValueChange={(value) => {
              if (value === '__new__') {
                setCategoryMode('new');
                setFormData({ ...formData, category: categoryMode === 'new' ? formData.category : '' });
                return;
              }

              setCategoryMode('existing');
              setFormData({ ...formData, category: value });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
              <SelectItem value="__new__">Criar nova categoria</SelectItem>
            </SelectContent>
          </Select>

          {categoryMode === 'new' ? (
            <Input
              required
              placeholder="Digite a nova categoria"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Disponível hoje</p>
          <p className="text-xs text-muted-foreground">Controla se o produto aparece no PDV.</p>
        </div>
        <Switch checked={formData.availableToday} onCheckedChange={(checked) => setFormData({...formData, availableToday: checked})} />
      </div>
      <Button type="submit" className="w-full">{product ? 'Salvar Alterações' : 'Cadastrar Produto'}</Button>
    </form>
  );
}
