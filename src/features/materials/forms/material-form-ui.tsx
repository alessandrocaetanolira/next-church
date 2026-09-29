'use client';

import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MaterialFormValues } from './material-form.schema';

export function MaterialFormUI({ form, editing, categories, units, onSubmit }: {
  form: UseFormReturn<MaterialFormValues>;
  editing: boolean;
  categories: string[];
  units: string[];
  onSubmit: (values: MaterialFormValues) => void | Promise<void>;
}) {
  const { register, setValue, watch, formState: { errors, isSubmitting } } = form;
  const error = (name: keyof MaterialFormValues) => errors[name]?.message ? <p className="text-xs text-destructive">{String(errors[name]?.message)}</p> : null;
  return <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <div className="space-y-2"><Label>Nome *</Label><Input {...register('name')} placeholder="Nome do material" />{error('name')}</div>
    <div className="space-y-2"><Label>Categoria</Label><Select value={watch('category')} onValueChange={(value) => setValue('category', value, { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select>{error('category')}</div>
    <div className="grid grid-cols-3 gap-4"><div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="0" {...register('quantity', { valueAsNumber: true })} />{error('quantity')}</div><div className="space-y-2"><Label>Qtd. mínima</Label><Input type="number" min="0" {...register('minQuantity', { valueAsNumber: true })} />{error('minQuantity')}</div><div className="space-y-2"><Label>Unidade</Label><Select value={watch('unit')} onValueChange={(value) => setValue('unit', value, { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select>{error('unit')}</div></div>
    <Button type="submit" className="w-full" disabled={isSubmitting}>{editing ? 'Salvar Alterações' : 'Criar Material'}</Button>
  </form>;
}
