'use client';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ProductFormValues } from './product-form.schema';
import { CurrencyInput } from '@/components/ui/currency-input';

export function ProductFormUI({ form, editing, categories, categoryMode, setCategoryMode, onImageChange, onSubmit }: { form: UseFormReturn<ProductFormValues>; editing: boolean; categories: string[]; categoryMode: 'existing' | 'new'; setCategoryMode: (mode: 'existing' | 'new') => void; onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void; onSubmit: (values: ProductFormValues) => void | Promise<void> }) {
  const { register, setValue, watch, formState: { errors, isSubmitting } } = form;
  const imageUrl = watch('imageUrl');
  const error = (name: keyof ProductFormValues) => errors[name]?.message ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;
  return <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <div className="space-y-2"><Label>Nome do Produto</Label><Input {...register('name')} />{error('name')}</div>
    <div className="space-y-2"><Label>Descrição</Label><Input {...register('description')} /></div>
    <div className="space-y-2"><Label>Imagem do Produto</Label><div className="space-y-3 rounded-lg border p-3">{imageUrl ? <div className="relative overflow-hidden rounded-lg border bg-muted/20"><img src={imageUrl} alt={watch('name') || 'Preview do produto'} className="h-40 w-full object-cover" /><Button type="button" variant="destructive" size="icon" className="absolute right-2 top-2 h-8 w-8" onClick={() => setValue('imageUrl', '')}><X className="h-4 w-4" /></Button></div> : <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground"><ImagePlus className="h-4 w-4" />Carregar imagem<input type="file" accept="image/*" className="hidden" onChange={onImageChange} /></label>}{imageUrl ? <label className="inline-flex cursor-pointer text-sm text-primary hover:underline">Trocar imagem<input type="file" accept="image/*" className="hidden" onChange={onImageChange} /></label> : null}</div></div>
    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Preço (R$)</Label><Controller control={form.control} name="price" render={({ field }) => <CurrencyInput value={Number(field.value) || 0} onValueChange={field.onChange} onBlur={field.onBlur} name={field.name} />} />{error('price')}</div><div className="space-y-2"><Label>Custo (R$)</Label><Controller control={form.control} name="cost" render={({ field }) => <CurrencyInput value={Number(field.value) || 0} onValueChange={field.onChange} onBlur={field.onBlur} name={field.name} />} />{error('cost')}</div></div>
    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Estoque Inicial</Label><Input type="number" {...register('stock', { valueAsNumber: true })} />{error('stock')}</div><div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" {...register('minStock', { valueAsNumber: true })} />{error('minStock')}</div></div>
    <div className="space-y-2"><Label>Categoria</Label><Select value={categoryMode === 'new' ? '__new__' : (watch('category') || undefined)} onValueChange={(value) => { if (value === '__new__') { setCategoryMode('new'); setValue('category', ''); } else { setCategoryMode('existing'); setValue('category', value, { shouldValidate: true }); } }}><SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}<SelectItem value="__new__">Criar nova categoria</SelectItem></SelectContent></Select>{categoryMode === 'new' ? <Input placeholder="Digite a nova categoria" {...register('category')} /> : null}{error('category')}</div>
    <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">Disponível hoje</p><p className="text-xs text-muted-foreground">Controla se o produto aparece no catálogo.</p></div><Switch checked={watch('availableToday')} onCheckedChange={(checked) => setValue('availableToday', checked)} /></div>
    <Button type="submit" className="w-full" disabled={isSubmitting}>{editing ? 'Salvar Alterações' : 'Cadastrar Produto'}</Button>
  </form>;
}
